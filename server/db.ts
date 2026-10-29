/**
 * Banco de Dados Persistente e Gerenciador de Estado do FinanPro
 * Armazena entidades completas em JSON estruturado com persistência atômica,
 * controle de integridade referencial, e histórico auditável.
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { roundCurrency } from './utils/validators.js';

// Em funções serverless (Netlify/Lambda) só /tmp é gravável; o arquivo empacotado serve de semente
const IS_SERVERLESS = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const BUNDLED_DB_FILE = path.resolve(process.cwd(), 'data', 'finanpro_db.json');
const DATA_DIR = IS_SERVERLESS ? '/tmp/finanpro-data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'finanpro_db.json');

// Interfaces completas
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  role: 'admin' | 'financeiro' | 'visualizador';
  avatar?: string;
  createdAt: string;
}

export interface EmailVerification {
  id: string;
  email: string;
  code: string;
  type: 'register' | 'forgot_password';
  attempts: number;
  expiresAt: string;
  createdAt: string;
}

export interface Company {
  id: string;
  type: 'PJ' | 'PF';
  legalName: string; // Razão Social / Nome Titular
  tradeName: string; // Nome Fantasia
  document: string; // CNPJ ou CPF validado
  email: string;
  phone: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement?: string;
  taxRegime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCompany {
  id: string;
  userId: string;
  companyId: string;
  role: 'admin' | 'financeiro' | 'visualizador';
  createdAt: string;
}

export interface FinancialAccount {
  id: string;
  companyId: string;
  name: string;
  bankName: string;
  type: 'caixa' | 'corrente' | 'poupanca' | 'pagamento' | 'investimento';
  initialBalance: number;
  initialBalanceDate: string;
  status: 'active' | 'archived';
  color: string;
  createdAt: string;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  type: 'receita' | 'despesa';
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  tradeName?: string;
  document: string; // CPF ou CNPJ
  email: string;
  phone: string;
  cep?: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  tradeName?: string;
  document: string; // CNPJ ou CPF
  email: string;
  phone: string;
  cep?: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PayablePayment {
  id: string;
  payableId: string;
  companyId: string;
  amount: number;
  date: string;
  financialAccountId: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface Payable {
  id: string;
  companyId: string;
  supplierId: string;
  categoryId: string;
  financialAccountId: string;
  description: string;
  docNumber?: string;
  originalAmount: number;
  interestAmount: number;
  fineAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod: string;
  recurrence: 'unica' | 'mensal' | 'parcelada';
  installmentNumber?: number;
  totalInstallments?: number;
  parentId?: string;
  notes?: string;
  status: 'pendente' | 'parcialmente_paga' | 'paga' | 'vencida' | 'cancelada';
  createdAt: string;
  updatedAt: string;
}

export interface ReceivablePayment {
  id: string;
  receivableId: string;
  companyId: string;
  amount: number;
  date: string;
  financialAccountId: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface Receivable {
  id: string;
  companyId: string;
  clientId: string;
  categoryId: string;
  financialAccountId: string;
  description: string;
  docNumber?: string;
  originalAmount: number;
  interestAmount: number;
  fineAmount: number;
  discountAmount: number;
  finalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  issueDate: string;
  dueDate: string;
  receivedDate?: string;
  paymentMethod: string;
  recurrence: 'unica' | 'mensal' | 'parcelada';
  installmentNumber?: number;
  totalInstallments?: number;
  parentId?: string;
  saleId?: string;
  notes?: string;
  status: 'pendente' | 'parcialmente_recebido' | 'recebido' | 'vencido' | 'cancelado';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  type: 'entrada' | 'saida' | 'transferencia';
  amount: number;
  date: string;
  categoryId?: string;
  financialAccountId: string;
  destinationAccountId?: string; // Para transferências
  paymentMethod: string;
  docRef?: string;
  clientId?: string;
  supplierId?: string;
  payableId?: string;
  receivableId?: string;
  notes?: string;
  status: 'realizado' | 'estornado';
  createdAt: string;
}

export interface SaleItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  companyId: string;
  saleNumber: string;
  clientId: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  installments: number;
  estimatedReceiptDate: string;
  status: 'faturada' | 'pendente' | 'cancelada';
  items: SaleItem[];
  notes?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  companyId: string;
  type: 'saldo_negativo' | 'risco_saldo_negativo' | 'contas_vencidas' | 'vencimentos_proximos' | 'recebimentos_atrasados' | 'despesas_elevadas' | 'queda_faturamento' | 'baixa_liquidez';
  title: string;
  description: string;
  priority: 'critica' | 'atencao' | 'informativa';
  isRead: boolean;
  link: string;
  recommendedAction: string;
  createdAt: string;
}

export interface CompanySettings {
  companyId: string;
  maxExpenseMonthlyLimit: number;
  revenueDropThresholdPercent: number;
  lowLiquidityDays: number;
  currency: string;
  dateFormat: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  emailVerifications: EmailVerification[];
  companies: Company[];
  userCompanies: UserCompany[];
  financialAccounts: FinancialAccount[];
  categories: Category[];
  clients: Client[];
  suppliers: Supplier[];
  payables: Payable[];
  payablePayments: PayablePayment[];
  receivables: Receivable[];
  receivablePayments: ReceivablePayment[];
  transactions: Transaction[];
  sales: Sale[];
  alerts: Alert[];
  companySettings: CompanySettings[];
}

// Inicializa banco de dados
class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private getDefaultState(): DatabaseSchema {
    return {
      users: [],
      emailVerifications: [],
      companies: [],
      userCompanies: [],
      financialAccounts: [],
      categories: [],
      clients: [],
      suppliers: [],
      payables: [],
      payablePayments: [],
      receivables: [],
      receivablePayments: [],
      transactions: [],
      sales: [],
      alerts: [],
      companySettings: [],
    };
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (IS_SERVERLESS && !fs.existsSync(DB_FILE) && fs.existsSync(BUNDLED_DB_FILE)) {
        fs.copyFileSync(BUNDLED_DB_FILE, DB_FILE);
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return { ...this.getDefaultState(), ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Erro ao ler banco de dados JSON:', e);
    }
    const def = this.getDefaultState();
    this.saveDirect(def);
    return def;
  }

  private saveDirect(data: DatabaseSchema) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tmpFile, DB_FILE);
    } catch {
      // Fallback para Windows onde renameSync pode falhar com EPERM quando o destino já existe
      fs.copyFileSync(tmpFile, DB_FILE);
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // Ignora se o tmp não puder ser removido imediatamente
      }
    }
  }

  public save() {
    this.saveDirect(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  // --- SEED DE CATEGORIAS PADRÃO ---
  public seedDefaultCategories(companyId: string) {
    const defaultCategories: Array<Omit<Category, 'id' | 'createdAt'>> = [
      // Receitas
      { companyId, name: 'Venda de Mercadorias', type: 'receita', color: '#10b981', icon: 'ShoppingBag', isDefault: true },
      { companyId, name: 'Prestação de Serviços', type: 'receita', color: '#06b6d4', icon: 'Briefcase', isDefault: true },
      { companyId, name: 'Rendimentos Financeiros', type: 'receita', color: '#8b5cf6', icon: 'TrendingUp', isDefault: true },
      { companyId, name: 'Outras Receitas', type: 'receita', color: '#64748b', icon: 'PlusCircle', isDefault: true },
      // Despesas
      { companyId, name: 'Salários e Encargos', type: 'despesa', color: '#f43f5e', icon: 'Users', isDefault: true },
      { companyId, name: 'Aluguel e Condomínio', type: 'despesa', color: '#e11d48', icon: 'Home', isDefault: true },
      { companyId, name: 'Energia, Água e Gás', type: 'despesa', color: '#ea580c', icon: 'Zap', isDefault: true },
      { companyId, name: 'Internet e Telefonia', type: 'despesa', color: '#d97706', icon: 'Wifi', isDefault: true },
      { companyId, name: 'Fornecedores e Matéria-Prima', type: 'despesa', color: '#b45309', icon: 'Truck', isDefault: true },
      { companyId, name: 'Impostos e Tributos', type: 'despesa', color: '#dc2626', icon: 'FileText', isDefault: true },
      { companyId, name: 'Marketing e Publicidade', type: 'despesa', color: '#9333ea', icon: 'Megaphone', isDefault: true },
      { companyId, name: 'Manutenção e Equipamentos', type: 'despesa', color: '#475569', icon: 'Wrench', isDefault: true },
      { companyId, name: 'Tarifas e Taxas Bancárias', type: 'despesa', color: '#64748b', icon: 'CreditCard', isDefault: true },
      { companyId, name: 'Outras Despesas Operacionais', type: 'despesa', color: '#475569', icon: 'MinusCircle', isDefault: true },
    ];

    const now = new Date().toISOString();
    for (const cat of defaultCategories) {
      this.data.categories.push({
        id: 'cat_' + Math.random().toString(36).substring(2, 9),
        ...cat,
        createdAt: now,
      });
    }
    this.save();
  }

  // --- CONTAS BANCÁRIAS E SALDOS REAIS ---
  public getAccountBalance(accountId: string): number {
    const account = this.data.financialAccounts.find((a) => a.id === accountId);
    if (!account) return 0;

    let balance = roundCurrency(account.initialBalance);

    for (const t of this.data.transactions) {
      if (t.status === 'estornado') continue;

      if (t.type === 'entrada' && t.financialAccountId === accountId) {
        balance = roundCurrency(balance + t.amount);
      } else if (t.type === 'saida' && t.financialAccountId === accountId) {
        balance = roundCurrency(balance - t.amount);
      } else if (t.type === 'transferencia') {
        if (t.financialAccountId === accountId) {
          // Origem: saída
          balance = roundCurrency(balance - t.amount);
        } else if (t.destinationAccountId === accountId) {
          // Destino: entrada
          balance = roundCurrency(balance + t.amount);
        }
      }
    }

    return balance;
  }

  public getCompanyConsolidatedBalance(companyId: string): number {
    const accounts = this.data.financialAccounts.filter(
      (a) => a.companyId === companyId && a.status === 'active'
    );
    let total = 0;
    for (const acc of accounts) {
      total = roundCurrency(total + this.getAccountBalance(acc.id));
    }
    return total;
  }
}

export const db = new Database();
