/**
 * Rotas e Controladores REST do FinanPro
 */
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, User, Company, FinancialAccount, Category, Client, Supplier, Payable, Receivable, Transaction, Sale, SaleItem } from './db.js';
import { validateCPF, validateCNPJ, validateDocument, roundCurrency, formatBRL } from './utils/validators.js';
import { sendEmailCode } from './email.js';
import { evaluateCompanyAlerts } from './alerts.js';
import { seedDemoDataForUser } from './seed.js';

export const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'finanpro_secure_jwt_secret_dev_mode';

// Middleware de autenticação JWT
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  companyRole?: 'admin' | 'financeiro' | 'visualizador';
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

// Middleware de verificação de empresa ativa e permissão
function requireCompany(req: AuthRequest, res: Response, next: NextFunction) {
  const companyId = req.headers['x-company-id'] as string;
  if (!companyId) {
    res.status(400).json({ error: 'Nenhuma empresa selecionada.' });
    return;
  }

  const data = db.getData();
  const userCompany = data.userCompanies.find(
    (uc) => uc.userId === req.user?.id && uc.companyId === companyId
  );

  if (!userCompany) {
    res.status(403).json({ error: 'Acesso negado para a empresa selecionada.' });
    return;
  }

  req.companyRole = userCompany.role;
  next();
}

function requireRole(allowedRoles: Array<'admin' | 'financeiro' | 'visualizador'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.companyRole || !allowedRoles.includes(req.companyRole)) {
      res.status(403).json({ error: 'Você não tem permissão para realizar esta operação nesta empresa.' });
      return;
    }
    next();
  };
}

// ==========================================
// 1. AUTENTICAÇÃO E CADASTRO DE CONTAS
// ==========================================

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'A confirmação de senha não confere.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const data = db.getData();

    const existingUser = data.users.find((u) => u.email === cleanEmail);
    if (existingUser) {
      res.status(400).json({ error: 'Este endereço de e-mail já está cadastrado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const user: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      isEmailVerified: true, // Verificação de e-mail desativada conforme solicitado
      role: 'admin',
      createdAt: now.toISOString(),
    };
    data.users.push(user);
    db.save();

    // Gera token de autenticação imediato
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Conta criada com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      companies: [],
    });
  } catch (err: any) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

router.post('/auth/verify-email', (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.toString().trim();
  const data = db.getData();

  const verification = data.emailVerifications.find(
    (ev) => ev.email === cleanEmail && ev.type === 'register'
  );

  if (!verification) {
    res.status(400).json({ error: 'Nenhum código pendente encontrado para este e-mail. Solicite um novo código.' });
    return;
  }

  // Verifica expiração
  if (new Date() > new Date(verification.expiresAt)) {
    res.status(400).json({ error: 'O código expirou. Clique em "Reenviar código" para receber um novo.' });
    return;
  }

  // Limite de tentativas
  if (verification.attempts >= 5) {
    res.status(400).json({ error: 'Limite de tentativas excedido. Solicite um novo código de verificação.' });
    return;
  }

  if (verification.code !== cleanCode) {
    verification.attempts += 1;
    db.save();
    res.status(400).json({ error: `Código incorreto. Tentativas restantes: ${5 - verification.attempts}` });
    return;
  }

  // Código válido! Ativa usuário
  const user = data.users.find((u) => u.email === cleanEmail);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  user.isEmailVerified = true;
  data.emailVerifications = data.emailVerifications.filter((ev) => ev.id !== verification.id);
  db.save();

  // Gera token de autenticação
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Busca empresas vinculadas
  const userCompanyLinks = data.userCompanies.filter((uc) => uc.userId === user.id);
  const companies = data.companies.filter((c) =>
    userCompanyLinks.some((uc) => uc.companyId === c.id)
  );

  res.json({
    message: 'E-mail verificado com sucesso!',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    companies,
  });
});

router.post('/auth/resend-code', async (req: Request, res: Response) => {
  const { email, type = 'register' } = req.body;
  if (!email) {
    res.status(400).json({ error: 'E-mail obrigatório.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const data = db.getData();
  const user = data.users.find((u) => u.email === cleanEmail);

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const existingVerification = data.emailVerifications.find(
    (ev) => ev.email === cleanEmail && ev.type === type
  );

  const now = new Date();
  if (existingVerification) {
    const elapsedSeconds = (now.getTime() - new Date(existingVerification.createdAt).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      res.status(429).json({ error: `Aguarde ${Math.ceil(60 - elapsedSeconds)} segundos para solicitar um novo código.` });
      return;
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  data.emailVerifications = data.emailVerifications.filter(
    (ev) => !(ev.email === cleanEmail && ev.type === type)
  );

  data.emailVerifications.push({
    id: 'ev_' + Math.random().toString(36).substring(2, 9),
    email: cleanEmail,
    code,
    type,
    attempts: 0,
    expiresAt,
    createdAt: now.toISOString(),
  });

  db.save();

  await sendEmailCode({
    to: cleanEmail,
    name: user.name,
    code,
    type,
  });

  res.json({ message: 'Novo código enviado com sucesso!' });
});

// Endpoint auxiliar para desenvolvimento / teste no iFrame sem SMTP configurado
router.get('/auth/recent-code', (req: Request, res: Response) => {
  const email = (req.query.email as string)?.trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'E-mail obrigatório' });
    return;
  }
  const data = db.getData();
  const verification = data.emailVerifications
    .filter((ev) => ev.email === email)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!verification) {
    res.status(404).json({ error: 'Nenhum código pendente' });
    return;
  }

  res.json({
    code: verification.code,
    expiresAt: verification.expiresAt,
    type: verification.type,
  });
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Informe e-mail e senha.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const data = db.getData();
    const user = data.users.find((u) => u.email === cleanEmail);

    if (!user) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userCompanyLinks = data.userCompanies.filter((uc) => uc.userId === user.id);
    const companies = data.companies.filter((c) =>
      userCompanyLinks.some((uc) => uc.companyId === c.id)
    );

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      companies,
    });
  } catch (err: any) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Informe seu e-mail.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const data = db.getData();
  const user = data.users.find((u) => u.email === cleanEmail);

  if (!user) {
    res.status(404).json({ error: 'E-mail não cadastrado.' });
    return;
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    db.save();
    res.json({ message: 'Senha atualizada com sucesso! Você já pode fazer login.' });
    return;
  }

  res.json({ message: 'Informe a nova senha para redefinir.' });
});

router.post('/auth/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const data = db.getData();
  const user = data.users.find((u) => u.email === cleanEmail);

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  db.save();

  res.json({ message: 'Senha redefinida com sucesso! Você já pode entrar.' });
});

router.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.user?.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const userCompanyLinks = data.userCompanies.filter((uc) => uc.userId === user.id);
  const companies = data.companies.filter((c) =>
    userCompanyLinks.some((uc) => uc.companyId === c.id)
  );

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    companies,
  });
});

// ==========================================
// 2. CADASTRO E GESTÃO DE EMPRESAS
// ==========================================

router.get('/companies', authMiddleware, (req: AuthRequest, res: Response) => {
  const data = db.getData();
  const links = data.userCompanies.filter((uc) => uc.userId === req.user?.id);
  const companies = data.companies
    .filter((c) => links.some((l) => l.companyId === c.id))
    .map((c) => {
      const link = links.find((l) => l.companyId === c.id);
      return { ...c, userRole: link?.role || 'visualizador' };
    });
  res.json(companies);
});

router.post('/companies', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const {
      type,
      legalName,
      tradeName,
      document,
      email,
      phone,
      cep,
      state,
      city,
      neighborhood,
      street,
      number,
      complement,
      taxRegime,
      logo,
    } = req.body;

    if (!legalName || !document || !type) {
      res.status(400).json({ error: 'Tipo, Nome/Razão Social e Documento (CPF/CNPJ) são obrigatórios.' });
      return;
    }

    // Validação real de CPF ou CNPJ
    const docCheck = validateDocument(document, type === 'PJ' ? 'CNPJ' : 'CPF');
    if (!docCheck.valid) {
      res.status(400).json({
        error: `O ${type === 'PJ' ? 'CNPJ' : 'CPF'} informado (${document}) não possui dígitos verificadores válidos. Verifique os números digitados.`,
      });
      return;
    }

    const data = db.getData();
    const nowIso = new Date().toISOString();
    const companyId = 'comp_' + Math.random().toString(36).substring(2, 9);

    const newCompany: Company = {
      id: companyId,
      type: type === 'PJ' ? 'PJ' : 'PF',
      legalName: legalName.trim(),
      tradeName: (tradeName || legalName).trim(),
      document: docCheck.formatted,
      email: (email || req.user?.email || '').trim(),
      phone: (phone || '').trim(),
      cep: (cep || '').trim(),
      state: (state || '').trim().toUpperCase(),
      city: (city || '').trim(),
      neighborhood: (neighborhood || '').trim(),
      street: (street || '').trim(),
      number: (number || '').trim(),
      complement: (complement || '').trim(),
      taxRegime: taxRegime || (type === 'PJ' ? 'simples_nacional' : undefined),
      logo: logo || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    data.companies.push(newCompany);

    // Vincula o usuário atual como administrador
    data.userCompanies.push({
      id: 'uc_' + Math.random().toString(36).substring(2, 9),
      userId: req.user!.id,
      companyId,
      role: 'admin',
      createdAt: nowIso,
    });

    // Cria conta bancária principal inicial padrão (Caixa / Conta Corrente)
    data.financialAccounts.push({
      id: 'acc_' + Math.random().toString(36).substring(2, 9),
      companyId,
      name: 'Conta Corrente Principal',
      bankName: 'Banco Padrão',
      type: 'corrente',
      initialBalance: 0,
      initialBalanceDate: nowIso.split('T')[0],
      status: 'active',
      color: '#2563eb',
      createdAt: nowIso,
    });

    // Sementeia categorias padrão
    db.seedDefaultCategories(companyId);

    // Cria configurações padrão
    data.companySettings.push({
      companyId,
      maxExpenseMonthlyLimit: 30000,
      revenueDropThresholdPercent: 20,
      lowLiquidityDays: 7,
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      updatedAt: nowIso,
    });

    db.save();

    res.status(201).json({
      message: 'Empresa cadastrada com sucesso!',
      company: { ...newCompany, userRole: 'admin' },
    });
  } catch (err: any) {
    console.error('Erro ao criar empresa:', err);
    res.status(500).json({ error: 'Erro ao cadastrar empresa.' });
  }
});

router.put('/companies/:id', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const data = db.getData();
  const company = data.companies.find((c) => c.id === req.params.id);

  if (!company) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  const {
    legalName,
    tradeName,
    document,
    email,
    phone,
    cep,
    state,
    city,
    neighborhood,
    street,
    number,
    complement,
    taxRegime,
    logo,
  } = req.body;

  if (document && document !== company.document) {
    const docCheck = validateDocument(document);
    if (!docCheck.valid) {
      res.status(400).json({ error: 'Documento CPF/CNPJ inválido.' });
      return;
    }
    company.document = docCheck.formatted;
  }

  if (legalName) company.legalName = legalName.trim();
  if (tradeName !== undefined) company.tradeName = tradeName.trim();
  if (email !== undefined) company.email = email.trim();
  if (phone !== undefined) company.phone = phone.trim();
  if (cep !== undefined) company.cep = cep.trim();
  if (state !== undefined) company.state = state.trim().toUpperCase();
  if (city !== undefined) company.city = city.trim();
  if (neighborhood !== undefined) company.neighborhood = neighborhood.trim();
  if (street !== undefined) company.street = street.trim();
  if (number !== undefined) company.number = number.trim();
  if (complement !== undefined) company.complement = complement.trim();
  if (taxRegime !== undefined) company.taxRegime = taxRegime;
  if (logo !== undefined) company.logo = logo;

  company.updatedAt = new Date().toISOString();
  db.save();

  res.json({ message: 'Dados da empresa atualizados com sucesso!', company });
});

// ==========================================
// 3. CONTAS FINANCEIRAS E TRANSFERÊNCIAS
// ==========================================

router.get('/financial-accounts', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const accounts = data.financialAccounts.filter((a) => a.companyId === companyId);

  const accountsWithBalance = accounts.map((acc) => ({
    ...acc,
    currentBalance: db.getAccountBalance(acc.id),
  }));

  const consolidatedBalance = db.getCompanyConsolidatedBalance(companyId);

  res.json({ accounts: accountsWithBalance, consolidatedBalance });
});

router.post('/financial-accounts', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { name, bankName, type, initialBalance = 0, initialBalanceDate, color = '#2563eb' } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: 'Nome e tipo da conta são obrigatórios.' });
    return;
  }

  const data = db.getData();
  const now = new Date();
  const newAccount: FinancialAccount = {
    id: 'acc_' + Math.random().toString(36).substring(2, 9),
    companyId,
    name: name.trim(),
    bankName: (bankName || '').trim(),
    type,
    initialBalance: roundCurrency(Number(initialBalance) || 0),
    initialBalanceDate: initialBalanceDate || now.toISOString().split('T')[0],
    status: 'active',
    color,
    createdAt: now.toISOString(),
  };

  data.financialAccounts.push(newAccount);
  db.save();

  res.status(201).json({
    message: 'Conta financeira cadastrada com sucesso!',
    account: { ...newAccount, currentBalance: newAccount.initialBalance },
  });
});

router.put('/financial-accounts/:id', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const account = data.financialAccounts.find((a) => a.id === req.params.id && a.companyId === companyId);

  if (!account) {
    res.status(404).json({ error: 'Conta financeira não encontrada.' });
    return;
  }

  const { name, bankName, type, initialBalance, initialBalanceDate, color, status } = req.body;
  if (name) account.name = name.trim();
  if (bankName !== undefined) account.bankName = bankName.trim();
  if (type) account.type = type;
  if (initialBalance !== undefined) account.initialBalance = roundCurrency(Number(initialBalance));
  if (initialBalanceDate) account.initialBalanceDate = initialBalanceDate;
  if (color) account.color = color;
  if (status) account.status = status;

  db.save();
  res.json({ message: 'Conta financeira atualizada!', account: { ...account, currentBalance: db.getAccountBalance(account.id) } });
});

router.delete('/financial-accounts/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const accountIndex = data.financialAccounts.findIndex((a) => a.id === req.params.id && a.companyId === companyId);

  if (accountIndex === -1) {
    res.status(404).json({ error: 'Conta financeira não encontrada.' });
    return;
  }

  // Remove movimentações vinculadas e a conta
  data.transactions = data.transactions.filter(
    (t) => t.financialAccountId !== req.params.id && t.destinationAccountId !== req.params.id
  );
  data.financialAccounts.splice(accountIndex, 1);
  db.save();
  evaluateCompanyAlerts(companyId);
  res.json({ message: 'Conta financeira excluída com sucesso.' });
});

// Transferência entre contas (sem alterar receita ou despesa!)
router.post('/financial-accounts/transfer', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { sourceAccountId, destinationAccountId, amount, date, notes } = req.body;

  const parsedAmount = roundCurrency(Number(amount));
  if (!sourceAccountId || !destinationAccountId || parsedAmount <= 0) {
    res.status(400).json({ error: 'Contas de origem, destino e valor válido são obrigatórios.' });
    return;
  }

  if (sourceAccountId === destinationAccountId) {
    res.status(400).json({ error: 'A conta de origem e de destino não podem ser as mesmas.' });
    return;
  }

  const data = db.getData();
  const sourceAcc = data.financialAccounts.find((a) => a.id === sourceAccountId && a.companyId === companyId);
  const destAcc = data.financialAccounts.find((a) => a.id === destinationAccountId && a.companyId === companyId);

  if (!sourceAcc || !destAcc) {
    res.status(404).json({ error: 'Uma ou ambas as contas financeiras não foram encontradas.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const tx: Transaction = {
    id: 'tx_trans_' + Math.random().toString(36).substring(2, 9),
    companyId,
    type: 'transferencia',
    amount: parsedAmount,
    date: date || nowIso.split('T')[0],
    financialAccountId: sourceAccountId,
    destinationAccountId,
    paymentMethod: 'Transferência Interna',
    notes: notes || `Transferência de ${sourceAcc.name} para ${destAcc.name}`,
    status: 'realizado',
    createdAt: nowIso,
  };

  data.transactions.push(tx);
  db.save();

  // Reavalia alertas
  evaluateCompanyAlerts(companyId);

  res.status(201).json({
    message: 'Transferência realizada com sucesso!',
    sourceBalance: db.getAccountBalance(sourceAccountId),
    destinationBalance: db.getAccountBalance(destinationAccountId),
    consolidatedBalance: db.getCompanyConsolidatedBalance(companyId),
  });
});

// Extrato de Conta
router.get('/financial-accounts/:id/statement', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { id } = req.params;
  const data = db.getData();

  const account = data.financialAccounts.find((a) => a.id === id && a.companyId === companyId);
  if (!account) {
    res.status(404).json({ error: 'Conta não encontrada.' });
    return;
  }

  const transactions = data.transactions
    .filter(
      (t) =>
        t.companyId === companyId &&
        (t.financialAccountId === id || t.destinationAccountId === id)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({
    account,
    currentBalance: db.getAccountBalance(id),
    transactions,
  });
});

// ==========================================
// 4. CATEGORIAS
// ==========================================

router.get('/categories', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const categories = data.categories.filter((c) => c.companyId === companyId);
  res.json(categories);
});

router.post('/categories', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { name, type, color = '#3b82f6', icon = 'Tag' } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: 'Nome e tipo (receita ou despesa) são obrigatórios.' });
    return;
  }

  const data = db.getData();
  const newCat: Category = {
    id: 'cat_' + Math.random().toString(36).substring(2, 9),
    companyId,
    name: name.trim(),
    type: type === 'receita' ? 'receita' : 'despesa',
    color,
    icon,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  data.categories.push(newCat);
  db.save();
  res.status(201).json(newCat);
});

router.delete('/categories/:id', authMiddleware, requireCompany, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const index = data.categories.findIndex((c) => c.id === req.params.id && c.companyId === companyId);

  if (index === -1) {
    res.status(404).json({ error: 'Categoria não encontrada.' });
    return;
  }

  data.categories.splice(index, 1);
  db.save();
  res.json({ message: 'Categoria excluída com sucesso.' });
});

// ==========================================
// 5. CLIENTES E FORNECEDORES
// ==========================================

router.get('/clients', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const clients = data.clients.filter((c) => c.companyId === companyId);

  const clientsWithStats = clients.map((cli) => {
    const cliSales = data.sales.filter((s) => s.clientId === cli.id && s.status !== 'cancelada');
    const totalSales = roundCurrency(cliSales.reduce((sum, s) => sum + s.total, 0));

    const cliReceivables = data.receivables.filter(
      (r) => r.clientId === cli.id && r.status !== 'cancelado'
    );
    const pendingReceivables = roundCurrency(
      cliReceivables.filter((r) => r.status === 'pendente' || r.status === 'vencido' || r.status === 'parcialmente_recebido')
        .reduce((sum, r) => sum + r.remainingAmount, 0)
    );
    const overdueReceivables = roundCurrency(
      cliReceivables.filter((r) => r.status === 'vencido' || (r.remainingAmount > 0 && r.dueDate < new Date().toISOString().split('T')[0]))
        .reduce((sum, r) => sum + r.remainingAmount, 0)
    );

    return {
      ...cli,
      totalSales,
      pendingReceivables,
      overdueReceivables,
    };
  });

  res.json(clientsWithStats);
});

router.post('/clients', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { name, tradeName, document, email, phone, cep, state, city, address, notes } = req.body;

  if (!name || !document) {
    res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios.' });
    return;
  }

  const docCheck = validateDocument(document);
  if (!docCheck.valid) {
    res.status(400).json({ error: 'O CPF ou CNPJ informado não é válido. Verifique os dígitos verificadores.' });
    return;
  }

  const data = db.getData();
  const newClient: Client = {
    id: 'cli_' + Math.random().toString(36).substring(2, 9),
    companyId,
    name: name.trim(),
    tradeName: (tradeName || '').trim(),
    document: docCheck.formatted,
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    cep: (cep || '').trim(),
    state: (state || '').trim().toUpperCase(),
    city: (city || '').trim(),
    address: (address || '').trim(),
    notes: (notes || '').trim(),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  data.clients.push(newClient);
  db.save();
  res.status(201).json(newClient);
});

router.put('/clients/:id', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const client = data.clients.find((c) => c.id === req.params.id && c.companyId === companyId);

  if (!client) {
    res.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }

  const { name, tradeName, document, email, phone, cep, state, city, address, notes, status } = req.body;
  if (name) client.name = name.trim();
  if (tradeName !== undefined) client.tradeName = tradeName.trim();
  if (document) {
    const docCheck = validateDocument(document);
    if (!docCheck.valid) {
      res.status(400).json({ error: 'Documento inválido.' });
      return;
    }
    client.document = docCheck.formatted;
  }
  if (email !== undefined) client.email = email.trim();
  if (phone !== undefined) client.phone = phone.trim();
  if (cep !== undefined) client.cep = cep.trim();
  if (state !== undefined) client.state = state.trim().toUpperCase();
  if (city !== undefined) client.city = city.trim();
  if (address !== undefined) client.address = address.trim();
  if (notes !== undefined) client.notes = notes.trim();
  if (status) client.status = status;

  db.save();
  res.json(client);
});

router.delete('/clients/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const idx = data.clients.findIndex((c) => c.id === req.params.id && c.companyId === companyId);
  if (idx === -1) {
    res.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }

  data.clients.splice(idx, 1);
  db.save();
  res.json({ message: 'Cliente removido com sucesso.' });
});

router.get('/clients/:id/details', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const client = data.clients.find((c) => c.id === req.params.id && c.companyId === companyId);
  if (!client) {
    res.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }

  const sales = data.sales.filter((s) => s.clientId === client.id);
  const receivables = data.receivables.filter((r) => r.clientId === client.id);

  res.json({ client, sales, receivables });
});

// Fornecedores
router.get('/suppliers', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const suppliers = data.suppliers.filter((s) => s.companyId === companyId);

  const suppliersWithStats = suppliers.map((sup) => {
    const payables = data.payables.filter((p) => p.supplierId === sup.id && p.status !== 'cancelada');
    const totalPurchased = roundCurrency(payables.reduce((sum, p) => sum + p.finalAmount, 0));
    const totalPaid = roundCurrency(payables.reduce((sum, p) => sum + p.paidAmount, 0));
    const pendingAmount = roundCurrency(
      payables.filter((p) => p.status === 'pendente' || p.status === 'vencida' || p.status === 'parcialmente_paga')
        .reduce((sum, p) => sum + p.remainingAmount, 0)
    );

    return {
      ...sup,
      totalPurchased,
      totalPaid,
      pendingAmount,
    };
  });

  res.json(suppliersWithStats);
});

router.post('/suppliers', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { name, tradeName, document, email, phone, cep, state, city, address, notes } = req.body;

  if (!name || !document) {
    res.status(400).json({ error: 'Nome e CNPJ/CPF são obrigatórios.' });
    return;
  }

  const docCheck = validateDocument(document);
  if (!docCheck.valid) {
    res.status(400).json({ error: 'O CPF ou CNPJ informado não é válido. Verifique os números.' });
    return;
  }

  const data = db.getData();
  const newSup: Supplier = {
    id: 'sup_' + Math.random().toString(36).substring(2, 9),
    companyId,
    name: name.trim(),
    tradeName: (tradeName || '').trim(),
    document: docCheck.formatted,
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    cep: (cep || '').trim(),
    state: (state || '').trim().toUpperCase(),
    city: (city || '').trim(),
    address: (address || '').trim(),
    notes: (notes || '').trim(),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  data.suppliers.push(newSup);
  db.save();
  res.status(201).json(newSup);
});

router.put('/suppliers/:id', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const supplier = data.suppliers.find((s) => s.id === req.params.id && s.companyId === companyId);

  if (!supplier) {
    res.status(404).json({ error: 'Fornecedor não encontrado.' });
    return;
  }

  const { name, tradeName, document, email, phone, cep, state, city, address, notes, status } = req.body;
  if (name) supplier.name = name.trim();
  if (tradeName !== undefined) supplier.tradeName = tradeName.trim();
  if (document) {
    const docCheck = validateDocument(document);
    if (!docCheck.valid) {
      res.status(400).json({ error: 'Documento inválido.' });
      return;
    }
    supplier.document = docCheck.formatted;
  }
  if (email !== undefined) supplier.email = email.trim();
  if (phone !== undefined) supplier.phone = phone.trim();
  if (cep !== undefined) supplier.cep = cep.trim();
  if (state !== undefined) supplier.state = state.trim().toUpperCase();
  if (city !== undefined) supplier.city = city.trim();
  if (address !== undefined) supplier.address = address.trim();
  if (notes !== undefined) supplier.notes = notes.trim();
  if (status) supplier.status = status;

  db.save();
  res.json(supplier);
});

router.delete('/suppliers/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const idx = data.suppliers.findIndex((s) => s.id === req.params.id && s.companyId === companyId);
  if (idx === -1) {
    res.status(404).json({ error: 'Fornecedor não encontrado.' });
    return;
  }

  data.suppliers.splice(idx, 1);
  db.save();
  res.json({ message: 'Fornecedor removido com sucesso.' });
});

router.get('/suppliers/:id/details', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const supplier = data.suppliers.find((s) => s.id === req.params.id && s.companyId === companyId);
  if (!supplier) {
    res.status(404).json({ error: 'Fornecedor não encontrado.' });
    return;
  }

  const payables = data.payables.filter((p) => p.supplierId === supplier.id);
  res.json({ supplier, payables });
});

// ==========================================
// 6. CONTAS A PAGAR
// ==========================================

router.get('/payables', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { status, supplierId, categoryId, startDate, endDate } = req.query;
  const data = db.getData();
  const todayStr = new Date().toISOString().split('T')[0];

  let payables = data.payables.filter((p) => p.companyId === companyId);

  // Atualiza status dinamicamente para 'vencida' se já passou da data e ainda está pendente
  for (const p of payables) {
    if (p.status === 'pendente' && p.dueDate < todayStr) {
      p.status = 'vencida';
    }
  }

  if (status) payables = payables.filter((p) => p.status === status);
  if (supplierId) payables = payables.filter((p) => p.supplierId === supplierId);
  if (categoryId) payables = payables.filter((p) => p.categoryId === categoryId);
  if (startDate) payables = payables.filter((p) => p.dueDate >= (startDate as string));
  if (endDate) payables = payables.filter((p) => p.dueDate <= (endDate as string));

  // Ordena por vencimento
  payables.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Mapeia relacionamentos
  const result = payables.map((p) => {
    const supplier = data.suppliers.find((s) => s.id === p.supplierId);
    const category = data.categories.find((c) => c.id === p.categoryId);
    const account = data.financialAccounts.find((a) => a.id === p.financialAccountId);
    const payments = data.payablePayments.filter((pp) => pp.payableId === p.id);
    return {
      ...p,
      supplierName: supplier?.name || 'Fornecedor Diversos',
      categoryName: category?.name || 'Sem Categoria',
      categoryColor: category?.color || '#64748b',
      accountName: account?.name || 'Conta Padrão',
      payments,
    };
  });

  res.json(result);
});

router.post('/payables', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const {
    supplierId,
    categoryId,
    financialAccountId,
    description,
    docNumber,
    originalAmount,
    interestAmount = 0,
    fineAmount = 0,
    discountAmount = 0,
    issueDate,
    dueDate,
    paymentMethod = 'Boleto Bancário',
    recurrence = 'unica',
    installments = 1,
    notes,
  } = req.body;

  const orig = roundCurrency(Number(originalAmount));
  if (!description || orig <= 0 || !dueDate) {
    res.status(400).json({ error: 'Descrição, valor e data de vencimento são obrigatórios.' });
    return;
  }

  const data = db.getData();
  const numInstallments = recurrence === 'parcelada' ? Math.max(1, parseInt(installments, 10)) : 1;
  const createdPayables: Payable[] = [];
  const parentId = numInstallments > 1 ? 'pay_parent_' + Math.random().toString(36).substring(2, 9) : undefined;

  const installmentAmount = roundCurrency(orig / numInstallments);
  let accumulated = 0;

  for (let i = 1; i <= numInstallments; i++) {
    // Corrige centavos na última parcela
    const curOrig = i === numInstallments ? roundCurrency(orig - accumulated) : installmentAmount;
    accumulated = roundCurrency(accumulated + curOrig);

    const curInterest = i === 1 ? roundCurrency(Number(interestAmount) || 0) : 0;
    const curFine = i === 1 ? roundCurrency(Number(fineAmount) || 0) : 0;
    const curDiscount = i === 1 ? roundCurrency(Number(discountAmount) || 0) : 0;
    const curFinal = roundCurrency(curOrig + curInterest + curFine - curDiscount);

    // Incrementa data de vencimento para parcelas subsequentes
    const dueD = new Date(dueDate);
    dueD.setMonth(dueD.getMonth() + (i - 1));
    const instDueDate = dueD.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const payable: Payable = {
      id: 'pay_' + Math.random().toString(36).substring(2, 9),
      companyId,
      supplierId: supplierId || '',
      categoryId: categoryId || '',
      financialAccountId: financialAccountId || '',
      description: numInstallments > 1 ? `${description} (${i}/${numInstallments})` : description,
      docNumber: docNumber ? (numInstallments > 1 ? `${docNumber}-${i}` : docNumber) : undefined,
      originalAmount: curOrig,
      interestAmount: curInterest,
      fineAmount: curFine,
      discountAmount: curDiscount,
      finalAmount: curFinal,
      paidAmount: 0,
      remainingAmount: curFinal,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      dueDate: instDueDate,
      paymentMethod,
      recurrence,
      installmentNumber: numInstallments > 1 ? i : undefined,
      totalInstallments: numInstallments > 1 ? numInstallments : undefined,
      parentId,
      notes: notes || '',
      status: instDueDate < todayStr ? 'vencida' : 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.payables.push(payable);
    createdPayables.push(payable);
  }

  db.save();
  evaluateCompanyAlerts(companyId);

  res.status(201).json({
    message: `${numInstallments} conta(s) a pagar cadastrada(s) com sucesso!`,
    payables: createdPayables,
  });
});

// Registrar pagamento parcial ou quitação de conta a pagar
router.post('/payables/:id/pay', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { id } = req.params;
  const { amount, date, financialAccountId, paymentMethod, notes } = req.body;

  const data = db.getData();
  const payable = data.payables.find((p) => p.id === id && p.companyId === companyId);

  if (!payable) {
    res.status(404).json({ error: 'Conta a pagar não encontrada.' });
    return;
  }

  if (payable.status === 'paga' || payable.status === 'cancelada') {
    res.status(400).json({ error: `Esta conta já está com status "${payable.status}".` });
    return;
  }

  const payAmount = roundCurrency(Number(amount));
  if (payAmount <= 0) {
    res.status(400).json({ error: 'Informe um valor de pagamento válido.' });
    return;
  }

  if (payAmount > payable.remainingAmount) {
    res.status(400).json({
      error: `O valor do pagamento (${formatBRL(payAmount)}) não pode ser superior ao saldo restante (${formatBRL(payable.remainingAmount)}).`,
    });
    return;
  }

  const accId = financialAccountId || payable.financialAccountId;
  if (!accId) {
    res.status(400).json({ error: 'Selecione a conta bancária/caixa para debitar o pagamento.' });
    return;
  }

  const payDate = date || new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // 1. Registra o pagamento na tabela de pagamentos
  data.payablePayments.push({
    id: 'pp_' + Math.random().toString(36).substring(2, 9),
    payableId: payable.id,
    companyId,
    amount: payAmount,
    date: payDate,
    financialAccountId: accId,
    paymentMethod: paymentMethod || payable.paymentMethod,
    notes: notes || '',
    createdAt: nowIso,
  });

  // 2. Atualiza saldos da conta a pagar
  payable.paidAmount = roundCurrency(payable.paidAmount + payAmount);
  payable.remainingAmount = roundCurrency(payable.finalAmount - payable.paidAmount);

  if (payable.remainingAmount <= 0) {
    payable.status = 'paga';
    payable.paymentDate = payDate;
  } else {
    payable.status = 'parcialmente_paga';
  }
  payable.updatedAt = nowIso;

  // 3. Gera a movimentação financeira de saída (vinculada ao payableId para nunca duplicar!)
  data.transactions.push({
    id: 'tx_pay_' + Math.random().toString(36).substring(2, 9),
    companyId,
    type: 'saida',
    amount: payAmount,
    date: payDate,
    categoryId: payable.categoryId,
    financialAccountId: accId,
    paymentMethod: paymentMethod || payable.paymentMethod,
    docRef: payable.docNumber,
    supplierId: payable.supplierId,
    payableId: payable.id,
    notes: `Pagamento de conta: ${payable.description}` + (notes ? ` (${notes})` : ''),
    status: 'realizado',
    createdAt: nowIso,
  });

  db.save();
  evaluateCompanyAlerts(companyId);

  res.json({
    message: payable.status === 'paga' ? 'Conta quitada com sucesso!' : 'Pagamento parcial registrado com sucesso!',
    payable,
    newBalance: db.getAccountBalance(accId),
    consolidatedBalance: db.getCompanyConsolidatedBalance(companyId),
  });
});

// Cancelamento / Estorno de conta a pagar
router.post('/payables/:id/cancel', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { id } = req.params;
  const { reason } = req.body;

  const data = db.getData();
  const payable = data.payables.find((p) => p.id === id && p.companyId === companyId);

  if (!payable) {
    res.status(404).json({ error: 'Conta não encontrada.' });
    return;
  }

  if (payable.status === 'cancelada') {
    res.status(400).json({ error: 'Esta conta já foi cancelada anteriormente.' });
    return;
  }

  // Se já houver pagamentos realizados, estorna as movimentações financeiras geradas
  const payments = data.payablePayments.filter((pp) => pp.payableId === payable.id);
  const relatedTransactions = data.transactions.filter((t) => t.payableId === payable.id);

  for (const t of relatedTransactions) {
    t.status = 'estornado';
    t.notes = (t.notes || '') + ` [ESTORNADO em ${new Date().toLocaleDateString('pt-BR')}: ${reason || 'Cancelamento de conta'}]`;
  }

  payable.status = 'cancelada';
  payable.notes = (payable.notes || '') + ` [CANCELADA: ${reason || 'Sem motivo especificado'}]`;
  payable.updatedAt = new Date().toISOString();

  db.save();
  evaluateCompanyAlerts(companyId);

  res.json({
    message: 'Conta a pagar cancelada e pagamentos vinculados estornados com sucesso.',
    payable,
  });
});

router.delete('/payables/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const idx = data.payables.findIndex((p) => p.id === req.params.id && p.companyId === companyId);

  if (idx === -1) {
    res.status(404).json({ error: 'Conta não encontrada.' });
    return;
  }

  const payable = data.payables[idx];
  // Remove pagamentos e movimentações vinculadas
  data.transactions = data.transactions.filter((t) => t.payableId !== payable.id);
  data.payablePayments = data.payablePayments.filter((pp) => pp.payableId !== payable.id);
  data.payables.splice(idx, 1);

  db.save();
  evaluateCompanyAlerts(companyId);
  res.json({ message: 'Conta a pagar excluída com sucesso.' });
});

// ==========================================
// 7. CONTAS A RECEBER
// ==========================================

router.get('/receivables', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { status, clientId, categoryId, startDate, endDate } = req.query;
  const data = db.getData();
  const todayStr = new Date().toISOString().split('T')[0];

  let receivables = data.receivables.filter((r) => r.companyId === companyId);

  // Atualiza status dinamicamente para 'vencido' se já passou da data e ainda está pendente
  for (const r of receivables) {
    if (r.status === 'pendente' && r.dueDate < todayStr) {
      r.status = 'vencido';
    }
  }

  if (status) receivables = receivables.filter((r) => r.status === status);
  if (clientId) receivables = receivables.filter((r) => r.clientId === clientId);
  if (categoryId) receivables = receivables.filter((r) => r.categoryId === categoryId);
  if (startDate) receivables = receivables.filter((r) => r.dueDate >= (startDate as string));
  if (endDate) receivables = receivables.filter((r) => r.dueDate <= (endDate as string));

  receivables.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const result = receivables.map((r) => {
    const client = data.clients.find((c) => c.id === r.clientId);
    const category = data.categories.find((c) => c.id === r.categoryId);
    const account = data.financialAccounts.find((a) => a.id === r.financialAccountId);
    const payments = data.receivablePayments.filter((rp) => rp.receivableId === r.id);
    return {
      ...r,
      clientName: client?.name || 'Cliente Diversos',
      categoryName: category?.name || 'Sem Categoria',
      categoryColor: category?.color || '#10b981',
      accountName: account?.name || 'Conta Padrão',
      payments,
    };
  });

  res.json(result);
});

router.post('/receivables', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const {
    clientId,
    categoryId,
    financialAccountId,
    description,
    docNumber,
    originalAmount,
    interestAmount = 0,
    fineAmount = 0,
    discountAmount = 0,
    issueDate,
    dueDate,
    paymentMethod = 'Pix',
    recurrence = 'unica',
    installments = 1,
    notes,
  } = req.body;

  const orig = roundCurrency(Number(originalAmount));
  if (!description || orig <= 0 || !dueDate) {
    res.status(400).json({ error: 'Descrição, valor e data de vencimento são obrigatórios.' });
    return;
  }

  const data = db.getData();
  const numInstallments = recurrence === 'parcelada' ? Math.max(1, parseInt(installments, 10)) : 1;
  const createdReceivables: Receivable[] = [];
  const parentId = numInstallments > 1 ? 'rec_parent_' + Math.random().toString(36).substring(2, 9) : undefined;

  const installmentAmount = roundCurrency(orig / numInstallments);
  let accumulated = 0;

  for (let i = 1; i <= numInstallments; i++) {
    const curOrig = i === numInstallments ? roundCurrency(orig - accumulated) : installmentAmount;
    accumulated = roundCurrency(accumulated + curOrig);

    const curInterest = i === 1 ? roundCurrency(Number(interestAmount) || 0) : 0;
    const curFine = i === 1 ? roundCurrency(Number(fineAmount) || 0) : 0;
    const curDiscount = i === 1 ? roundCurrency(Number(discountAmount) || 0) : 0;
    const curFinal = roundCurrency(curOrig + curInterest + curFine - curDiscount);

    const dueD = new Date(dueDate);
    dueD.setMonth(dueD.getMonth() + (i - 1));
    const instDueDate = dueD.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const receivable: Receivable = {
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      companyId,
      clientId: clientId || '',
      categoryId: categoryId || '',
      financialAccountId: financialAccountId || '',
      description: numInstallments > 1 ? `${description} (${i}/${numInstallments})` : description,
      docNumber: docNumber ? (numInstallments > 1 ? `${docNumber}-${i}` : docNumber) : undefined,
      originalAmount: curOrig,
      interestAmount: curInterest,
      fineAmount: curFine,
      discountAmount: curDiscount,
      finalAmount: curFinal,
      receivedAmount: 0,
      remainingAmount: curFinal,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      dueDate: instDueDate,
      paymentMethod,
      recurrence,
      installmentNumber: numInstallments > 1 ? i : undefined,
      totalInstallments: numInstallments > 1 ? numInstallments : undefined,
      parentId,
      notes: notes || '',
      status: instDueDate < todayStr ? 'vencido' : 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.receivables.push(receivable);
    createdReceivables.push(receivable);
  }

  db.save();
  evaluateCompanyAlerts(companyId);

  res.status(201).json({
    message: `${numInstallments} conta(s) a receber cadastrada(s) com sucesso!`,
    receivables: createdReceivables,
  });
});

// Registrar recebimento parcial ou quitação de conta a receber
router.post('/receivables/:id/receive', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { id } = req.params;
  const { amount, date, financialAccountId, paymentMethod, notes } = req.body;

  const data = db.getData();
  const receivable = data.receivables.find((r) => r.id === id && r.companyId === companyId);

  if (!receivable) {
    res.status(404).json({ error: 'Conta a receber não encontrada.' });
    return;
  }

  if (receivable.status === 'recebido' || receivable.status === 'cancelado') {
    res.status(400).json({ error: `Esta conta já está com status "${receivable.status}".` });
    return;
  }

  const recAmount = roundCurrency(Number(amount));
  if (recAmount <= 0) {
    res.status(400).json({ error: 'Informe um valor de recebimento válido.' });
    return;
  }

  if (recAmount > receivable.remainingAmount) {
    res.status(400).json({
      error: `O valor informado (${formatBRL(recAmount)}) supera o saldo pendente (${formatBRL(receivable.remainingAmount)}).`,
    });
    return;
  }

  const accId = financialAccountId || receivable.financialAccountId;
  if (!accId) {
    res.status(400).json({ error: 'Selecione a conta de destino para creditar o recebimento.' });
    return;
  }

  const recDate = date || new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // 1. Registra recebimento
  data.receivablePayments.push({
    id: 'rp_' + Math.random().toString(36).substring(2, 9),
    receivableId: receivable.id,
    companyId,
    amount: recAmount,
    date: recDate,
    financialAccountId: accId,
    paymentMethod: paymentMethod || receivable.paymentMethod,
    notes: notes || '',
    createdAt: nowIso,
  });

  // 2. Atualiza saldos da conta a receber
  receivable.receivedAmount = roundCurrency(receivable.receivedAmount + recAmount);
  receivable.remainingAmount = roundCurrency(receivable.finalAmount - receivable.receivedAmount);

  if (receivable.remainingAmount <= 0) {
    receivable.status = 'recebido';
    receivable.receivedDate = recDate;
  } else {
    receivable.status = 'parcialmente_recebido';
  }
  receivable.updatedAt = nowIso;

  // 3. Gera movimentação financeira de entrada (vinculada ao receivableId para não duplicar!)
  data.transactions.push({
    id: 'tx_rec_' + Math.random().toString(36).substring(2, 9),
    companyId,
    type: 'entrada',
    amount: recAmount,
    date: recDate,
    categoryId: receivable.categoryId,
    financialAccountId: accId,
    paymentMethod: paymentMethod || receivable.paymentMethod,
    docRef: receivable.docNumber,
    clientId: receivable.clientId,
    receivableId: receivable.id,
    notes: `Recebimento: ${receivable.description}` + (notes ? ` (${notes})` : ''),
    status: 'realizado',
    createdAt: nowIso,
  });

  db.save();
  evaluateCompanyAlerts(companyId);

  res.json({
    message: receivable.status === 'recebido' ? 'Recebimento quitado com sucesso!' : 'Recebimento parcial registrado com sucesso!',
    receivable,
    newBalance: db.getAccountBalance(accId),
    consolidatedBalance: db.getCompanyConsolidatedBalance(companyId),
  });
});

// Cancelamento de conta a receber
router.post('/receivables/:id/cancel', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { id } = req.params;
  const { reason } = req.body;

  const data = db.getData();
  const receivable = data.receivables.find((r) => r.id === id && r.companyId === companyId);

  if (!receivable) {
    res.status(404).json({ error: 'Conta não encontrada.' });
    return;
  }

  const relatedTransactions = data.transactions.filter((t) => t.receivableId === receivable.id);
  for (const t of relatedTransactions) {
    t.status = 'estornado';
    t.notes = (t.notes || '') + ` [ESTORNADO em ${new Date().toLocaleDateString('pt-BR')}: ${reason || 'Cancelamento de recebível'}]`;
  }

  receivable.status = 'cancelado';
  receivable.notes = (receivable.notes || '') + ` [CANCELADO: ${reason || 'Sem motivo especificado'}]`;
  receivable.updatedAt = new Date().toISOString();

  db.save();
  evaluateCompanyAlerts(companyId);

  res.json({ message: 'Conta a receber cancelada e movimentações estornadas.', receivable });
});

router.delete('/receivables/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const idx = data.receivables.findIndex((r) => r.id === req.params.id && r.companyId === companyId);

  if (idx === -1) {
    res.status(404).json({ error: 'Conta não encontrada.' });
    return;
  }

  const rec = data.receivables[idx];
  // Remove recebimentos e movimentações vinculadas
  data.transactions = data.transactions.filter((t) => t.receivableId !== rec.id);
  data.receivablePayments = data.receivablePayments.filter((rp) => rp.receivableId !== rec.id);
  data.receivables.splice(idx, 1);

  db.save();
  evaluateCompanyAlerts(companyId);
  res.json({ message: 'Conta a receber excluída com sucesso.' });
});

// ==========================================
// 8. MOVIMENTAÇÕES FINANCEIRAS (TRANSAÇÕES)
// ==========================================

router.get('/transactions', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { type, accountId, categoryId, startDate, endDate, search } = req.query;
  const data = db.getData();

  let list = data.transactions.filter((t) => t.companyId === companyId);

  if (type) list = list.filter((t) => t.type === type);
  if (accountId) list = list.filter((t) => t.financialAccountId === accountId || t.destinationAccountId === accountId);
  if (categoryId) list = list.filter((t) => t.categoryId === categoryId);
  if (startDate) list = list.filter((t) => t.date >= (startDate as string));
  if (endDate) list = list.filter((t) => t.date <= (endDate as string));
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter((t) => (t.notes || '').toLowerCase().includes(q) || (t.docRef || '').toLowerCase().includes(q));
  }

  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const result = list.map((t) => {
    const account = data.financialAccounts.find((a) => a.id === t.financialAccountId);
    const destAccount = t.destinationAccountId ? data.financialAccounts.find((a) => a.id === t.destinationAccountId) : undefined;
    const category = t.categoryId ? data.categories.find((c) => c.id === t.categoryId) : undefined;
    const client = t.clientId ? data.clients.find((c) => c.id === t.clientId) : undefined;
    const supplier = t.supplierId ? data.suppliers.find((s) => s.id === t.supplierId) : undefined;

    return {
      ...t,
      accountName: account?.name || 'Conta Padrão',
      destAccountName: destAccount?.name,
      categoryName: category?.name || (t.type === 'transferencia' ? 'Transferência Interna' : 'Sem Categoria'),
      categoryColor: category?.color || '#64748b',
      contactName: client?.name || supplier?.name || '',
    };
  });

  res.json(result);
});

// Lançamento manual avulso de entrada ou saída
router.post('/transactions', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { type, amount, date, categoryId, financialAccountId, paymentMethod, docRef, clientId, supplierId, notes } = req.body;

  const parsedAmount = roundCurrency(Number(amount));
  if (!type || parsedAmount <= 0 || !financialAccountId) {
    res.status(400).json({ error: 'Tipo (entrada/saida), valor e conta financeira são obrigatórios.' });
    return;
  }

  const data = db.getData();
  const nowIso = new Date().toISOString();

  const tx: Transaction = {
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    companyId,
    type: type === 'entrada' ? 'entrada' : 'saida',
    amount: parsedAmount,
    date: date || nowIso.split('T')[0],
    categoryId,
    financialAccountId,
    paymentMethod: paymentMethod || 'Pix',
    docRef,
    clientId,
    supplierId,
    notes: notes || '',
    status: 'realizado',
    createdAt: nowIso,
  };

  data.transactions.push(tx);
  db.save();
  evaluateCompanyAlerts(companyId);

  res.status(201).json({
    message: 'Movimentação registrada com sucesso!',
    transaction: tx,
    newBalance: db.getAccountBalance(financialAccountId),
    consolidatedBalance: db.getCompanyConsolidatedBalance(companyId),
  });
});

// Estorno de movimentação avulsa
router.post('/transactions/:id/reverse', authMiddleware, requireCompany, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { id } = req.params;
  const { reason } = req.body;

  const data = db.getData();
  const tx = data.transactions.find((t) => t.id === id && t.companyId === companyId);

  if (!tx) {
    res.status(404).json({ error: 'Movimentação não encontrada.' });
    return;
  }

  if (tx.status === 'estornado') {
    res.status(400).json({ error: 'Esta movimentação já foi estornada.' });
    return;
  }

  tx.status = 'estornado';
  tx.notes = (tx.notes || '') + ` [ESTORNADO em ${new Date().toLocaleDateString('pt-BR')}: ${reason || 'Ajuste manual'}]`;

  db.save();
  evaluateCompanyAlerts(companyId);

  res.json({
    message: 'Movimentação estornada com sucesso!',
    transaction: tx,
    consolidatedBalance: db.getCompanyConsolidatedBalance(companyId),
  });
});

router.delete('/transactions/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const idx = data.transactions.findIndex((t) => t.id === req.params.id && t.companyId === companyId);

  if (idx === -1) {
    res.status(404).json({ error: 'Movimentação não encontrada.' });
    return;
  }

  data.transactions.splice(idx, 1);
  db.save();
  evaluateCompanyAlerts(companyId);

  res.json({
    message: 'Movimentação excluída com sucesso!',
    consolidatedBalance: db.getCompanyConsolidatedBalance(companyId),
  });
});

// ==========================================
// 9. FATURAMENTO E VENDAS
// ==========================================

router.get('/sales', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const sales = data.sales.filter((s) => s.companyId === companyId);

  sales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  const result = sales.map((s) => {
    const client = data.clients.find((c) => c.id === s.clientId);
    return {
      ...s,
      clientName: client?.name || 'Cliente Geral',
    };
  });

  res.json(result);
});

router.post('/sales', authMiddleware, requireCompany, requireRole(['admin', 'financeiro']), (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const {
    clientId,
    saleDate,
    items,
    discount = 0,
    paymentMethod = 'Boleto Bancário',
    installments = 1,
    estimatedReceiptDate,
    notes,
    generateReceivables = true,
    financialAccountId,
    categoryId,
  } = req.body;

  if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Cliente e pelo menos um item são obrigatórios.' });
    return;
  }

  const data = db.getData();
  let subtotal = 0;
  const formattedItems: SaleItem[] = [];

  for (const it of items) {
    const qty = Number(it.quantity) || 1;
    const price = roundCurrency(Number(it.unitPrice) || 0);
    const itemDisc = roundCurrency(Number(it.discount) || 0);
    const total = roundCurrency(qty * price - itemDisc);
    subtotal = roundCurrency(subtotal + total);

    formattedItems.push({
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      description: it.description || 'Produto / Serviço',
      quantity: qty,
      unitPrice: price,
      discount: itemDisc,
      total,
    });
  }

  const saleDiscount = roundCurrency(Number(discount) || 0);
  const totalSale = roundCurrency(Math.max(0, subtotal - saleDiscount));
  const numInstallments = Math.max(1, parseInt(installments, 10));

  const saleId = 'sale_' + Math.random().toString(36).substring(2, 9);
  const saleNumber = 'FAT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const nowIso = new Date().toISOString();

  const sale: Sale = {
    id: saleId,
    companyId,
    saleNumber,
    clientId,
    saleDate: saleDate || nowIso.split('T')[0],
    subtotal,
    discount: saleDiscount,
    total: totalSale,
    paymentMethod,
    installments: numInstallments,
    estimatedReceiptDate: estimatedReceiptDate || saleDate || nowIso.split('T')[0],
    status: 'faturada',
    items: formattedItems,
    notes: notes || '',
    createdAt: nowIso,
  };

  data.sales.push(sale);

  // Integração automática: gera contas a receber vinculadas
  if (generateReceivables && totalSale > 0) {
    const instAmount = roundCurrency(totalSale / numInstallments);
    let accum = 0;
    const parentRecId = numInstallments > 1 ? 'rec_par_' + saleId : undefined;
    const client = data.clients.find((c) => c.id === clientId);

    for (let i = 1; i <= numInstallments; i++) {
      const curAmount = i === numInstallments ? roundCurrency(totalSale - accum) : instAmount;
      accum = roundCurrency(accum + curAmount);

      const d = new Date(sale.estimatedReceiptDate);
      d.setMonth(d.getMonth() + (i - 1));
      const curDueDate = d.toISOString().split('T')[0];

      data.receivables.push({
        id: 'rec_' + Math.random().toString(36).substring(2, 9),
        companyId,
        clientId,
        categoryId: categoryId || data.categories.find((c) => c.companyId === companyId && c.type === 'receita')?.id || '',
        financialAccountId: financialAccountId || data.financialAccounts.find((a) => a.companyId === companyId)?.id || '',
        description: `Venda ${saleNumber} - ${client?.name || 'Cliente'} (${i}/${numInstallments})`,
        docNumber: `${saleNumber}-${i}`,
        originalAmount: curAmount,
        interestAmount: 0,
        fineAmount: 0,
        discountAmount: 0,
        finalAmount: curAmount,
        receivedAmount: 0,
        remainingAmount: curAmount,
        issueDate: sale.saleDate,
        dueDate: curDueDate,
        paymentMethod,
        recurrence: numInstallments > 1 ? 'parcelada' : 'unica',
        installmentNumber: numInstallments > 1 ? i : undefined,
        totalInstallments: numInstallments > 1 ? numInstallments : undefined,
        parentId: parentRecId,
        saleId: sale.id,
        notes: `Gerado automaticamente pelo Faturamento (${saleNumber})`,
        status: 'pendente',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  db.save();
  evaluateCompanyAlerts(companyId);

  res.status(201).json({
    message: 'Faturamento registrado com sucesso e contas a receber integradas!',
    sale,
  });
});

router.delete('/sales/:id', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const idx = data.sales.findIndex((s) => s.id === req.params.id && s.companyId === companyId);

  if (idx === -1) {
    res.status(404).json({ error: 'Venda não encontrada.' });
    return;
  }

  const sale = data.sales[idx];
  // Remove títulos a receber e pagamentos vinculados a esta venda
  const saleRecs = data.receivables.filter((r) => r.saleId === sale.id);
  const recIds = new Set(saleRecs.map((r) => r.id));
  data.transactions = data.transactions.filter((t) => !t.receivableId || !recIds.has(t.receivableId));
  data.receivablePayments = data.receivablePayments.filter((rp) => !recIds.has(rp.receivableId));
  data.receivables = data.receivables.filter((r) => r.saleId !== sale.id);
  data.sales.splice(idx, 1);

  db.save();
  evaluateCompanyAlerts(companyId);
  res.json({ message: 'Venda excluída com sucesso.' });
});

// Estatísticas de Faturamento (Diário, Semanal, Mensal, Anual, Bruto vs Líquido)
router.get('/sales/stats', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const sales = data.sales.filter((s) => s.companyId === companyId && s.status !== 'cancelada');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  // 7 dias atrás
  const d7 = new Date(today);
  d7.setDate(d7.getDate() - 7);
  const weekStartStr = d7.toISOString().split('T')[0];

  const daily = sales.filter((s) => s.saleDate === todayStr);
  const weekly = sales.filter((s) => s.saleDate >= weekStartStr);
  const monthly = sales.filter((s) => s.saleDate.startsWith(currentMonthStr));
  const annual = sales.filter((s) => s.saleDate.startsWith(currentYearStr));

  const calcStats = (items: Sale[]) => {
    const gross = roundCurrency(items.reduce((acc, s) => acc + s.subtotal, 0));
    const discounts = roundCurrency(items.reduce((acc, s) => acc + s.discount, 0));
    const net = roundCurrency(items.reduce((acc, s) => acc + s.total, 0));
    return { gross, discounts, net, count: items.length };
  };

  res.json({
    daily: calcStats(daily),
    weekly: calcStats(weekly),
    monthly: calcStats(monthly),
    annual: calcStats(annual),
  });
});

// ==========================================
// 10. FLUXO DE CAIXA
// ==========================================

router.get('/cash-flow', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { period = 'monthly', startDate, endDate, accountId } = req.query;
  const data = db.getData();

  const currentConsolidated = db.getCompanyConsolidatedBalance(companyId);

  // Define intervalo padrão (mês corrente) se não fornecido
  const today = new Date();
  const start = (startDate as string) || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const end = (endDate as string) || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // 1. Movimentações Realizadas
  let realizedTxs = data.transactions.filter(
    (t) => t.companyId === companyId && t.status !== 'estornado' && t.date >= start && t.date <= end
  );
  if (accountId) {
    realizedTxs = realizedTxs.filter((t) => t.financialAccountId === accountId || t.destinationAccountId === accountId);
  }

  const realizedInflows = roundCurrency(
    realizedTxs.filter((t) => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0)
  );
  const realizedOutflows = roundCurrency(
    realizedTxs.filter((t) => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0)
  );
  const realizedNet = roundCurrency(realizedInflows - realizedOutflows);

  // 2. Previsão / Projetado (Contas a pagar e receber pendentes no período)
  let pendingPayables = data.payables.filter(
    (p) =>
      p.companyId === companyId &&
      (p.status === 'pendente' || p.status === 'parcialmente_paga' || p.status === 'vencida') &&
      p.dueDate >= start &&
      p.dueDate <= end
  );
  if (accountId) pendingPayables = pendingPayables.filter((p) => p.financialAccountId === accountId);

  let pendingReceivables = data.receivables.filter(
    (r) =>
      r.companyId === companyId &&
      (r.status === 'pendente' || r.status === 'parcialmente_recebido' || r.status === 'vencido') &&
      r.dueDate >= start &&
      r.dueDate <= end
  );
  if (accountId) pendingReceivables = pendingReceivables.filter((r) => r.financialAccountId === accountId);

  const projectedInflows = roundCurrency(pendingReceivables.reduce((sum, r) => sum + r.remainingAmount, 0));
  const projectedOutflows = roundCurrency(pendingPayables.reduce((sum, p) => sum + p.remainingAmount, 0));
  const projectedBalance = roundCurrency(currentConsolidated + projectedInflows - projectedOutflows);

  // Linha do tempo diária para gráfico
  const dailyMap: { [date: string]: { realizedIn: number; realizedOut: number; projectedIn: number; projectedOut: number } } = {};

  // Preenche dias do período
  const curD = new Date(start);
  const endD = new Date(end);
  while (curD <= endD) {
    const ds = curD.toISOString().split('T')[0];
    dailyMap[ds] = { realizedIn: 0, realizedOut: 0, projectedIn: 0, projectedOut: 0 };
    curD.setDate(curD.getDate() + 1);
  }

  for (const t of realizedTxs) {
    if (dailyMap[t.date]) {
      if (t.type === 'entrada') dailyMap[t.date].realizedIn += t.amount;
      if (t.type === 'saida') dailyMap[t.date].realizedOut += t.amount;
    }
  }

  for (const r of pendingReceivables) {
    if (dailyMap[r.dueDate]) dailyMap[r.dueDate].projectedIn += r.remainingAmount;
  }

  for (const p of pendingPayables) {
    if (dailyMap[p.dueDate]) dailyMap[p.dueDate].projectedOut += p.remainingAmount;
  }

  const timeline = Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      date,
      realizedIn: roundCurrency(dailyMap[date].realizedIn),
      realizedOut: roundCurrency(dailyMap[date].realizedOut),
      projectedIn: roundCurrency(dailyMap[date].projectedIn),
      projectedOut: roundCurrency(dailyMap[date].projectedOut),
    }));

  res.json({
    period: { start, end },
    currentBalance: currentConsolidated,
    realized: {
      inflows: realizedInflows,
      outflows: realizedOutflows,
      net: realizedNet,
    },
    projected: {
      inflows: projectedInflows,
      outflows: projectedOutflows,
      finalProjectedBalance: projectedBalance,
    },
    timeline,
  });
});

// ==========================================
// 11. DASHBOARD COMPLETO E KPIS
// ==========================================

router.get('/dashboard', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonth = todayStr.substring(0, 7);

  // 1. Saldo Consolidado Atual
  const currentBalance = db.getCompanyConsolidatedBalance(companyId);

  // 2. Receitas e Despesas do Mês Atual (Realizadas)
  const monthTransactions = data.transactions.filter(
    (t) => t.companyId === companyId && t.status !== 'estornado' && t.date.startsWith(currentMonth)
  );

  const monthRevenue = roundCurrency(
    monthTransactions.filter((t) => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0)
  );
  const monthExpenses = roundCurrency(
    monthTransactions.filter((t) => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0)
  );
  const monthNetResult = roundCurrency(monthRevenue - monthExpenses);

  // 3. Contas a Receber (Total em Aberto e Vencidos)
  const openReceivables = data.receivables.filter(
    (r) => r.companyId === companyId && (r.status === 'pendente' || r.status === 'parcialmente_recebido' || r.status === 'vencido')
  );
  const totalReceivables = roundCurrency(openReceivables.reduce((sum, r) => sum + r.remainingAmount, 0));
  const overdueReceivables = roundCurrency(
    openReceivables.filter((r) => r.dueDate < todayStr).reduce((sum, r) => sum + r.remainingAmount, 0)
  );

  // 4. Contas a Pagar (Total em Aberto e Vencidos)
  const openPayables = data.payables.filter(
    (p) => p.companyId === companyId && (p.status === 'pendente' || p.status === 'parcialmente_paga' || p.status === 'vencida')
  );
  const totalPayables = roundCurrency(openPayables.reduce((sum, p) => sum + p.remainingAmount, 0));
  const overduePayables = roundCurrency(
    openPayables.filter((p) => p.dueDate < todayStr).reduce((sum, p) => sum + p.remainingAmount, 0)
  );

  // 5. Faturamento do Mês (Vendas)
  const monthSales = data.sales.filter(
    (s) => s.companyId === companyId && s.status !== 'cancelada' && s.saleDate.startsWith(currentMonth)
  );
  const monthlyBilling = roundCurrency(monthSales.reduce((sum, s) => sum + s.total, 0));

  // 6. Previsões de Saldo para os próximos 7, 15 e 30 dias
  const calcForecast = (days: number) => {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    const targetStr = targetDate.toISOString().split('T')[0];

    const inForecast = roundCurrency(
      openReceivables.filter((r) => r.dueDate <= targetStr).reduce((sum, r) => sum + r.remainingAmount, 0)
    );
    const outForecast = roundCurrency(
      openPayables.filter((p) => p.dueDate <= targetStr).reduce((sum, p) => sum + p.remainingAmount, 0)
    );

    const projected = roundCurrency(currentBalance + inForecast - outForecast);
    return { days, inForecast, outForecast, projected };
  };

  const forecast7 = calcForecast(7);
  const forecast15 = calcForecast(15);
  const forecast30 = calcForecast(30);

  // 7. Gráficos dos últimos 6 meses (Receitas vs Despesas)
  const last6Months: Array<{ month: string; label: string; revenues: number; expenses: number; billing: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const ym = d.toISOString().substring(0, 7);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    const rev = roundCurrency(
      data.transactions
        .filter((t) => t.companyId === companyId && t.status !== 'estornado' && t.type === 'entrada' && t.date.startsWith(ym))
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const exp = roundCurrency(
      data.transactions
        .filter((t) => t.companyId === companyId && t.status !== 'estornado' && t.type === 'saida' && t.date.startsWith(ym))
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const bill = roundCurrency(
      data.sales
        .filter((s) => s.companyId === companyId && s.status !== 'cancelada' && s.saleDate.startsWith(ym))
        .reduce((sum, s) => sum + s.total, 0)
    );

    last6Months.push({ month: ym, label, revenues: rev, expenses: exp, billing: bill });
  }

  // 8. Despesas por Categoria no Mês Atual
  const categoryExpenses: { [catId: string]: number } = {};
  for (const t of monthTransactions.filter((t) => t.type === 'saida')) {
    const catId = t.categoryId || 'sem_cat';
    categoryExpenses[catId] = roundCurrency((categoryExpenses[catId] || 0) + t.amount);
  }

  const expensesByCategory = Object.keys(categoryExpenses).map((catId) => {
    const cat = data.categories.find((c) => c.id === catId);
    return {
      categoryId: catId,
      name: cat?.name || 'Outras Despesas',
      color: cat?.color || '#94a3b8',
      amount: categoryExpenses[catId],
    };
  });

  // 9. Próximos Vencimentos
  const upcomingPayables = openPayables
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)
    .map((p) => {
      const supplier = data.suppliers.find((s) => s.id === p.supplierId);
      return { ...p, supplierName: supplier?.name || 'Fornecedor' };
    });

  const upcomingReceivables = openReceivables
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)
    .map((r) => {
      const client = data.clients.find((c) => c.id === r.clientId);
      return { ...r, clientName: client?.name || 'Cliente' };
    });

  res.json({
    kpis: {
      currentBalance,
      monthRevenue,
      monthExpenses,
      monthNetResult,
      totalReceivables,
      overdueReceivables,
      totalPayables,
      overduePayables,
      monthlyBilling,
    },
    forecasts: {
      forecast7,
      forecast15,
      forecast30,
    },
    charts: {
      last6Months,
      expensesByCategory,
    },
    upcoming: {
      payables: upcomingPayables,
      receivables: upcomingReceivables,
    },
  });
});

// ==========================================
// 12. ALERTAS FINANCEIROS AUTOMÁTICOS
// ==========================================

router.get('/alerts', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const alerts = evaluateCompanyAlerts(companyId);
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  res.json({ alerts, unreadCount });
});

router.post('/alerts/:id/read', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const alert = data.alerts.find((a) => a.id === req.params.id && a.companyId === companyId);

  if (alert) {
    alert.isRead = true;
    db.save();
  }

  res.json({ success: true });
});

router.post('/alerts/read-all', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  for (const a of data.alerts) {
    if (a.companyId === companyId) {
      a.isRead = true;
    }
  }
  db.save();
  res.json({ success: true });
});

// ==========================================
// 13. RELATÓRIOS FINANCEIROS GERENCIAIS
// ==========================================

router.get('/reports/dre', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const { startDate, endDate } = req.query;
  const data = db.getData();

  const today = new Date();
  const start = (startDate as string) || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const end = (endDate as string) || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // Vendas do período
  const periodSales = data.sales.filter(
    (s) => s.companyId === companyId && s.status !== 'cancelada' && s.saleDate >= start && s.saleDate <= end
  );

  const grossSales = roundCurrency(periodSales.reduce((acc, s) => acc + s.subtotal, 0));
  const salesDiscounts = roundCurrency(periodSales.reduce((acc, s) => acc + s.discount, 0));
  const netSales = roundCurrency(grossSales - salesDiscounts);

  // Outras receitas operacionais realizadas
  const otherRevenues = roundCurrency(
    data.transactions
      .filter((t) => t.companyId === companyId && t.status !== 'estornado' && t.type === 'entrada' && !t.receivableId && t.date >= start && t.date <= end)
      .reduce((acc, t) => acc + t.amount, 0)
  );

  const totalOperationalRevenue = roundCurrency(netSales + otherRevenues);

  // Despesas por categoria no período
  const expensesTxs = data.transactions.filter(
    (t) => t.companyId === companyId && t.status !== 'estornado' && t.type === 'saida' && t.date >= start && t.date <= end
  );

  const expensesByCatMap: { [catId: string]: number } = {};
  for (const t of expensesTxs) {
    const cid = t.categoryId || 'sem_cat';
    expensesByCatMap[cid] = roundCurrency((expensesByCatMap[cid] || 0) + t.amount);
  }

  const categoryBreakdown = Object.keys(expensesByCatMap).map((cid) => {
    const cat = data.categories.find((c) => c.id === cid);
    return {
      categoryId: cid,
      name: cat?.name || 'Despesas Diversas',
      amount: expensesByCatMap[cid],
    };
  });

  const totalExpenses = roundCurrency(expensesTxs.reduce((acc, t) => acc + t.amount, 0));
  const netOperatingResult = roundCurrency(totalOperationalRevenue - totalExpenses);

  res.json({
    period: { start, end },
    grossSales,
    salesDiscounts,
    netSales,
    otherRevenues,
    totalOperationalRevenue,
    categoryBreakdown,
    totalExpenses,
    netOperatingResult,
  });
});

router.get('/reports/delinquency', authMiddleware, requireCompany, (req: AuthRequest, res: Response) => {
  const companyId = req.headers['x-company-id'] as string;
  const data = db.getData();
  const todayStr = new Date().toISOString().split('T')[0];

  const overdueList = data.receivables.filter(
    (r) =>
      r.companyId === companyId &&
      (r.status === 'vencido' || ((r.status === 'pendente' || r.status === 'parcialmente_recebido') && r.dueDate < todayStr))
  );

  const totalOverdue = roundCurrency(overdueList.reduce((acc, r) => acc + r.remainingAmount, 0));

  const items = overdueList.map((r) => {
    const client = data.clients.find((c) => c.id === r.clientId);
    const dueDate = new Date(r.dueDate);
    const today = new Date(todayStr);
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      ...r,
      clientName: client?.name || 'Cliente Geral',
      clientPhone: client?.phone || '',
      clientEmail: client?.email || '',
      daysOverdue,
    };
  });

  items.sort((a, b) => b.daysOverdue - a.daysOverdue);

  res.json({ totalOverdue, count: items.length, items });
});

// ==========================================
// 14. SEED DEMO EMPRESARIAL
// ==========================================

router.post('/seed/demo', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { company } = seedDemoDataForUser(req.user!.id);
    evaluateCompanyAlerts(company.id);

    res.status(201).json({
      message: 'Ambiente de demonstração empresarial gerado com sucesso!',
      company,
    });
  } catch (err: any) {
    console.error('Erro no seed:', err);
    res.status(500).json({ error: 'Erro ao gerar dados de demonstração.' });
  }
});

// ==========================================
// 15. BACKUP E RESTAURAÇÃO DE DADOS
// ==========================================

router.get('/backup/export', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const data = db.getData();
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="finanpro_backup_${dateStr}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Erro ao exportar backup:', err);
    res.status(500).json({ error: 'Erro ao gerar arquivo de backup.' });
  }
});

router.post('/backup/import', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const importedData = req.body;
    if (!importedData || typeof importedData !== 'object' || !Array.isArray(importedData.companies)) {
      res.status(400).json({ error: 'Arquivo de backup inválido ou formato incompatível.' });
      return;
    }

    const currentData = db.getData();
    Object.assign(currentData, importedData);
    db.save();

    res.json({
      success: true,
      message: 'Backup restaurado com sucesso!',
    });
  } catch (err: any) {
    console.error('Erro ao restaurar backup:', err);
    res.status(500).json({ error: 'Erro ao processar restauração de backup.' });
  }
});

