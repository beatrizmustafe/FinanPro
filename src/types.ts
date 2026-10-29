export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'financeiro' | 'visualizador';
  avatar?: string;
}

export interface Company {
  id: string;
  type: 'PJ' | 'PF';
  legalName: string;
  tradeName: string;
  document: string;
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
  userRole?: 'admin' | 'financeiro' | 'visualizador';
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAccount {
  id: string;
  companyId: string;
  name: string;
  bankName: string;
  type: 'caixa' | 'corrente' | 'poupanca' | 'pagamento' | 'investimento';
  initialBalance: number;
  initialBalanceDate: string;
  currentBalance: number;
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
  document: string;
  email: string;
  phone: string;
  cep?: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  totalSales?: number;
  pendingReceivables?: number;
  overdueReceivables?: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  tradeName?: string;
  document: string;
  email: string;
  phone: string;
  cep?: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  totalPurchased?: number;
  totalPaid?: number;
  pendingAmount?: number;
  createdAt: string;
}

export interface PayablePayment {
  id: string;
  payableId: string;
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
  supplierName?: string;
  categoryId: string;
  categoryName?: string;
  categoryColor?: string;
  financialAccountId: string;
  accountName?: string;
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
  notes?: string;
  status: 'pendente' | 'parcialmente_paga' | 'paga' | 'vencida' | 'cancelada';
  payments?: PayablePayment[];
  createdAt: string;
}

export interface ReceivablePayment {
  id: string;
  receivableId: string;
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
  clientName?: string;
  categoryId: string;
  categoryName?: string;
  categoryColor?: string;
  financialAccountId: string;
  accountName?: string;
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
  saleId?: string;
  notes?: string;
  status: 'pendente' | 'parcialmente_recebido' | 'recebido' | 'vencido' | 'cancelado';
  payments?: ReceivablePayment[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  type: 'entrada' | 'saida' | 'transferencia';
  amount: number;
  date: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  financialAccountId: string;
  accountName?: string;
  destinationAccountId?: string;
  destAccountName?: string;
  paymentMethod: string;
  docRef?: string;
  clientId?: string;
  supplierId?: string;
  contactName?: string;
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
  clientName?: string;
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

export interface DashboardData {
  kpis: {
    currentBalance: number;
    monthRevenue: number;
    monthExpenses: number;
    monthNetResult: number;
    totalReceivables: number;
    overdueReceivables: number;
    totalPayables: number;
    overduePayables: number;
    monthlyBilling: number;
  };
  forecasts: {
    forecast7: { days: number; inForecast: number; outForecast: number; projected: number };
    forecast15: { days: number; inForecast: number; outForecast: number; projected: number };
    forecast30: { days: number; inForecast: number; outForecast: number; projected: number };
  };
  charts: {
    last6Months: Array<{ month: string; label: string; revenues: number; expenses: number; billing: number }>;
    expensesByCategory: Array<{ categoryId: string; name: string; color: string; amount: number }>;
  };
  upcoming: {
    payables: Array<Payable & { supplierName: string }>;
    receivables: Array<Receivable & { clientName: string }>;
  };
}

export interface CashFlowData {
  period: { start: string; end: string };
  currentBalance: number;
  realized: {
    inflows: number;
    outflows: number;
    net: number;
  };
  projected: {
    inflows: number;
    outflows: number;
    finalProjectedBalance: number;
  };
  timeline: Array<{
    date: string;
    realizedIn: number;
    realizedOut: number;
    projectedIn: number;
    projectedOut: number;
  }>;
}
