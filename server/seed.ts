/**
 * Seeder de Demonstração Empresarial para o FinanPro
 * Cria uma empresa brasileira completa com clientes, fornecedores, contas bancárias,
 * faturamento, contas a pagar/receber e transações para visualização imediata de gráficos e KPIs.
 */
import { db, Company, FinancialAccount, Client, Supplier, Payable, Receivable, Transaction, Sale } from './db.js';
import { roundCurrency } from './utils/validators.js';

export function seedDemoDataForUser(userId: string): { company: Company } {
  const data = db.getData();
  const now = new Date();
  const nowIso = now.toISOString();

  // Helper para datas relativas (YYYY-MM-DD)
  const relDate = (daysOffset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  const companyId = 'comp_' + Math.random().toString(36).substring(2, 9);

  // 1. Cria a Empresa
  const company: Company = {
    id: companyId,
    type: 'PJ',
    legalName: 'TecnoVale Soluções em Tecnologia Ltda.',
    tradeName: 'TecnoVale Tech & Inovação',
    document: '12.345.678/0001-95',
    email: 'financeiro@tecnovale.com.br',
    phone: '(11) 3456-7890',
    cep: '04578-000',
    state: 'SP',
    city: 'São Paulo',
    neighborhood: 'Brooklin',
    street: 'Avenida das Nações Unidas',
    number: '12901',
    complement: 'Torre Oeste, Conjunto 802',
    taxRegime: 'simples_nacional',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.companies.push(company);

  // Vínculo Usuário-Empresa como Admin
  data.userCompanies.push({
    id: 'uc_' + Math.random().toString(36).substring(2, 9),
    userId,
    companyId,
    role: 'admin',
    createdAt: nowIso,
  });

  // Configurações
  data.companySettings.push({
    companyId,
    maxExpenseMonthlyLimit: 35000,
    revenueDropThresholdPercent: 20,
    lowLiquidityDays: 7,
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    updatedAt: nowIso,
  });

  // Categorias Padrão
  db.seedDefaultCategories(companyId);
  const categories = data.categories.filter((c) => c.companyId === companyId);
  const getCatId = (name: string) => categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?.id || categories[0].id;

  // 2. Contas Financeiras
  const accItau: FinancialAccount = {
    id: 'acc_itau_' + companyId,
    companyId,
    name: 'Itaú Empresas - Principal',
    bankName: 'Banco Itaú S.A.',
    type: 'corrente',
    initialBalance: 32500,
    initialBalanceDate: relDate(-60),
    status: 'active',
    color: '#ea580c',
    createdAt: nowIso,
  };

  const accBB: FinancialAccount = {
    id: 'acc_bb_' + companyId,
    companyId,
    name: 'Banco do Brasil - Operacional',
    bankName: 'Banco do Brasil',
    type: 'corrente',
    initialBalance: 15400,
    initialBalanceDate: relDate(-60),
    status: 'active',
    color: '#eab308',
    createdAt: nowIso,
  };

  const accCaixa: FinancialAccount = {
    id: 'acc_caixa_' + companyId,
    companyId,
    name: 'Caixa Pequeno / Despesas Gerais',
    bankName: 'Tesouraria Interna',
    type: 'caixa',
    initialBalance: 2800,
    initialBalanceDate: relDate(-60),
    status: 'active',
    color: '#10b981',
    createdAt: nowIso,
  };

  const accNubank: FinancialAccount = {
    id: 'acc_nu_' + companyId,
    companyId,
    name: 'Nubank PJ - Reserva de Emergência',
    bankName: 'Nu Pagamentos',
    type: 'investimento',
    initialBalance: 45000,
    initialBalanceDate: relDate(-60),
    status: 'active',
    color: '#8b5cf6',
    createdAt: nowIso,
  };

  data.financialAccounts.push(accItau, accBB, accCaixa, accNubank);

  // 3. Clientes
  const client1: Client = {
    id: 'cli_1_' + companyId,
    companyId,
    name: 'Supermercados Progresso S.A.',
    tradeName: 'Rede Progresso',
    document: '45.123.456/0001-10',
    email: 'compras@superprogresso.com.br',
    phone: '(11) 4123-9900',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  const client2: Client = {
    id: 'cli_2_' + companyId,
    companyId,
    name: 'Dra. Carolina Mendes Advocacia',
    tradeName: 'Mendes Advogados Associados',
    document: '218.459.871-34',
    email: 'financeiro@mendesadv.com.br',
    phone: '(11) 98765-4321',
    city: 'Campinas',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  const client3: Client = {
    id: 'cli_3_' + companyId,
    companyId,
    name: 'Indústria & Comércio Alvorada Ltda.',
    tradeName: 'Alvorada Metais',
    document: '33.987.654/0001-20',
    email: 'contato@alvorada.ind.br',
    phone: '(19) 3888-1234',
    city: 'Sorocaba',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  const client4: Client = {
    id: 'cli_4_' + companyId,
    companyId,
    name: 'Clínica Médica Bem Viver',
    tradeName: 'Bem Viver Saúde',
    document: '22.444.666/0001-88',
    email: 'gestao@bemviversaude.com.br',
    phone: '(11) 3322-1100',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  data.clients.push(client1, client2, client3, client4);

  // 4. Fornecedores
  const supAWS: Supplier = {
    id: 'sup_1_' + companyId,
    companyId,
    name: 'Amazon Web Services Serviços de Nuvem Ltda',
    tradeName: 'AWS Brasil',
    document: '23.456.789/0001-12',
    email: 'billing@amazon.com',
    phone: '(11) 3958-5200',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  const supImob: Supplier = {
    id: 'sup_2_' + companyId,
    companyId,
    name: 'Imobiliária Central Paulista Ltda',
    tradeName: 'Central Imóveis',
    document: '61.222.333/0001-44',
    email: 'locacoes@centralimoveis.com.br',
    phone: '(11) 3214-5500',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  const supEnergia: Supplier = {
    id: 'sup_3_' + companyId,
    companyId,
    name: 'Enel Distribuição São Paulo',
    tradeName: 'Enel SP',
    document: '61.695.227/0001-93',
    email: 'corporativo@enel.com.br',
    phone: '0800 72 72 120',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  const supContab: Supplier = {
    id: 'sup_4_' + companyId,
    companyId,
    name: 'Alfa Assessoria Contábil e Tributária S/S',
    tradeName: 'Alfa Contabilidade',
    document: '04.555.888/0001-33',
    email: 'honorarios@alfacontab.com.br',
    phone: '(11) 3105-7788',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: nowIso,
  };

  data.suppliers.push(supAWS, supImob, supEnergia, supContab);

  // 5. Vendas (Faturamento)
  const sale1: Sale = {
    id: 'sale_1_' + companyId,
    companyId,
    saleNumber: 'VEN-2026-001',
    clientId: client1.id,
    saleDate: relDate(-20),
    subtotal: 18500,
    discount: 500,
    total: 18000,
    paymentMethod: 'Boleto Bancário',
    installments: 2,
    estimatedReceiptDate: relDate(10),
    status: 'faturada',
    items: [
      { id: 'item_1', description: 'Implantação de ERP FinanPro e Treinamento', quantity: 1, unitPrice: 12000, discount: 500, total: 11500 },
      { id: 'item_2', description: 'Licença Anual de Software (10 Usuários)', quantity: 1, unitPrice: 6500, discount: 0, total: 6500 },
    ],
    createdAt: nowIso,
  };

  const sale2: Sale = {
    id: 'sale_2_' + companyId,
    companyId,
    saleNumber: 'VEN-2026-002',
    clientId: client2.id,
    saleDate: relDate(-5),
    subtotal: 7800,
    discount: 0,
    total: 7800,
    paymentMethod: 'Pix',
    installments: 1,
    estimatedReceiptDate: relDate(-5),
    status: 'faturada',
    items: [
      { id: 'item_3', description: 'Consultoria de Segurança e Backup em Nuvem', quantity: 1, unitPrice: 7800, discount: 0, total: 7800 },
    ],
    createdAt: nowIso,
  };

  const sale3: Sale = {
    id: 'sale_3_' + companyId,
    companyId,
    saleNumber: 'VEN-2026-003',
    clientId: client3.id,
    saleDate: relDate(-2),
    subtotal: 14500,
    discount: 0,
    total: 14500,
    paymentMethod: 'Transferência Bancária',
    installments: 1,
    estimatedReceiptDate: relDate(15),
    status: 'faturada',
    items: [
      { id: 'item_4', description: 'Desenvolvimento de Módulo Customizado', quantity: 1, unitPrice: 14500, discount: 0, total: 14500 },
    ],
    createdAt: nowIso,
  };

  data.sales.push(sale1, sale2, sale3);

  // 6. Contas a Receber
  // Recebido da Sale 2 (Pix já realizado)
  const recPaid: Receivable = {
    id: 'rec_1_' + companyId,
    companyId,
    clientId: client2.id,
    categoryId: getCatId('Serviços'),
    financialAccountId: accItau.id,
    description: 'Faturamento Venda VEN-2026-002 - Consultoria Mendes',
    docNumber: 'NF-1042',
    originalAmount: 7800,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    finalAmount: 7800,
    receivedAmount: 7800,
    remainingAmount: 0,
    issueDate: relDate(-5),
    dueDate: relDate(-5),
    receivedDate: relDate(-5),
    paymentMethod: 'Pix',
    recurrence: 'unica',
    saleId: sale2.id,
    status: 'recebido',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.receivables.push(recPaid);
  data.receivablePayments.push({
    id: 'rp_1_' + companyId,
    receivableId: recPaid.id,
    companyId,
    amount: 7800,
    date: relDate(-5),
    financialAccountId: accItau.id,
    paymentMethod: 'Pix',
    notes: 'Recebido via Pix à vista',
    createdAt: nowIso,
  });
  data.transactions.push({
    id: 'tx_rec_1_' + companyId,
    companyId,
    type: 'entrada',
    amount: 7800,
    date: relDate(-5),
    categoryId: getCatId('Serviços'),
    financialAccountId: accItau.id,
    paymentMethod: 'Pix',
    clientId: client2.id,
    receivableId: recPaid.id,
    notes: 'Recebimento de honorários de consultoria',
    status: 'realizado',
    createdAt: nowIso,
  });

  // A Receber - Parcela 1 Supermercado Progresso (Vence em 5 dias)
  const recDueSoon: Receivable = {
    id: 'rec_2_' + companyId,
    companyId,
    clientId: client1.id,
    categoryId: getCatId('Venda'),
    financialAccountId: accItau.id,
    description: 'Venda VEN-2026-001 - Parcela 1/2',
    docNumber: 'NF-1040',
    originalAmount: 9000,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    finalAmount: 9000,
    receivedAmount: 0,
    remainingAmount: 9000,
    issueDate: relDate(-20),
    dueDate: relDate(5),
    paymentMethod: 'Boleto Bancário',
    recurrence: 'parcelada',
    installmentNumber: 1,
    totalInstallments: 2,
    saleId: sale1.id,
    status: 'pendente',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.receivables.push(recDueSoon);

  // A Receber - Vencido (Inadimplente - Bem Viver)
  const recOverdue: Receivable = {
    id: 'rec_3_' + companyId,
    companyId,
    clientId: client4.id,
    categoryId: getCatId('Serviços'),
    financialAccountId: accBB.id,
    description: 'Manutenção Mensal Software Médico',
    docNumber: 'NF-1015',
    originalAmount: 3200,
    interestAmount: 64,
    fineAmount: 120,
    discountAmount: 0,
    finalAmount: 3384,
    receivedAmount: 0,
    remainingAmount: 3384,
    issueDate: relDate(-35),
    dueDate: relDate(-10),
    paymentMethod: 'Boleto Bancário',
    recurrence: 'mensal',
    status: 'vencido',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.receivables.push(recOverdue);

  // 7. Contas a Pagar
  // Aluguel Pago
  const payRentPaid: Payable = {
    id: 'pay_1_' + companyId,
    companyId,
    supplierId: supImob.id,
    categoryId: getCatId('Aluguel'),
    financialAccountId: accItau.id,
    description: 'Aluguel Escritório Comercial Brooklin',
    docNumber: 'REC-202604',
    originalAmount: 6500,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    finalAmount: 6500,
    paidAmount: 6500,
    remainingAmount: 0,
    issueDate: relDate(-25),
    dueDate: relDate(-15),
    paymentDate: relDate(-15),
    paymentMethod: 'Transferência Bancária',
    recurrence: 'mensal',
    status: 'paga',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.payables.push(payRentPaid);
  data.payablePayments.push({
    id: 'pp_1_' + companyId,
    payableId: payRentPaid.id,
    companyId,
    amount: 6500,
    date: relDate(-15),
    financialAccountId: accItau.id,
    paymentMethod: 'Transferência Bancária',
    notes: 'TED liquidada',
    createdAt: nowIso,
  });
  data.transactions.push({
    id: 'tx_pay_1_' + companyId,
    companyId,
    type: 'saida',
    amount: 6500,
    date: relDate(-15),
    categoryId: getCatId('Aluguel'),
    financialAccountId: accItau.id,
    paymentMethod: 'Transferência Bancária',
    supplierId: supImob.id,
    payableId: payRentPaid.id,
    notes: 'Pagamento aluguel escritórios',
    status: 'realizado',
    createdAt: nowIso,
  });

  // AWS a vencer em 2 dias (Atenção / Vencimento próximo)
  const payAWS: Payable = {
    id: 'pay_2_' + companyId,
    companyId,
    supplierId: supAWS.id,
    categoryId: getCatId('Internet'),
    financialAccountId: accItau.id,
    description: 'Fatura AWS Cloud Hosting Servidores Produção',
    docNumber: 'INV-AWS-98124',
    originalAmount: 4250,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    finalAmount: 4250,
    paidAmount: 0,
    remainingAmount: 4250,
    issueDate: relDate(-10),
    dueDate: relDate(2),
    paymentMethod: 'Cartão Corporativo',
    recurrence: 'mensal',
    status: 'pendente',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.payables.push(payAWS);

  // Contabilidade em Aberto com Pagamento Parcial
  const payContab: Payable = {
    id: 'pay_3_' + companyId,
    companyId,
    supplierId: supContab.id,
    categoryId: getCatId('Serviços'),
    financialAccountId: accBB.id,
    description: 'Honorários Contábeis e Fechamento Balanço',
    docNumber: 'NFS-5501',
    originalAmount: 3000,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    finalAmount: 3000,
    paidAmount: 1500,
    remainingAmount: 1500,
    issueDate: relDate(-20),
    dueDate: relDate(8),
    paymentMethod: 'Pix',
    recurrence: 'mensal',
    status: 'parcialmente_paga',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.payables.push(payContab);
  data.payablePayments.push({
    id: 'pp_2_' + companyId,
    payableId: payContab.id,
    companyId,
    amount: 1500,
    date: relDate(-2),
    financialAccountId: accBB.id,
    paymentMethod: 'Pix',
    notes: 'Adiantamento de 50% dos honorários',
    createdAt: nowIso,
  });
  data.transactions.push({
    id: 'tx_pay_2_' + companyId,
    companyId,
    type: 'saida',
    amount: 1500,
    date: relDate(-2),
    categoryId: getCatId('Serviços'),
    financialAccountId: accBB.id,
    paymentMethod: 'Pix',
    supplierId: supContab.id,
    payableId: payContab.id,
    notes: 'Adiantamento honorários Alfa Contábil',
    status: 'realizado',
    createdAt: nowIso,
  });

  // Salários da Equipe (a pagar em 10 dias)
  const paySalaries: Payable = {
    id: 'pay_4_' + companyId,
    companyId,
    supplierId: supImob.id,
    categoryId: getCatId('Salários'),
    financialAccountId: accItau.id,
    description: 'Folha de Pagamento - Equipe de Engenharia e Adm',
    docNumber: 'FOLHA-2026-04',
    originalAmount: 18400,
    interestAmount: 0,
    fineAmount: 0,
    discountAmount: 0,
    finalAmount: 18400,
    paidAmount: 0,
    remainingAmount: 18400,
    issueDate: relDate(-5),
    dueDate: relDate(10),
    paymentMethod: 'Transferência Bancária',
    recurrence: 'mensal',
    status: 'pendente',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.payables.push(paySalaries);

  // Transferência entre contas (Itaú para Caixa Físico R$ 1.500)
  data.transactions.push({
    id: 'tx_trans_1_' + companyId,
    companyId,
    type: 'transferencia',
    amount: 1500,
    date: relDate(-7),
    financialAccountId: accItau.id,
    destinationAccountId: accCaixa.id,
    paymentMethod: 'Transferência Interna',
    notes: 'Reposição de numerário para despesas do caixa físico',
    status: 'realizado',
    createdAt: nowIso,
  });

  db.save();

  return { company };
}
