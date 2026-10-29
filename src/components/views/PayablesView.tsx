import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR, exportToExcel, exportToPDF } from '../../lib/api';
import { Payable, Supplier, Category, FinancialAccount, Company } from '../../types';
import {
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Trash2,
  Calendar,
  X,
  CreditCard,
  RefreshCw,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface PayablesViewProps {
  company: Company;
  suppliers: Supplier[];
  categories: Category[];
  accounts: FinancialAccount[];
  onRefreshBalance: () => void;
  openCreateModalDirectly?: boolean;
  onCloseCreateModalDirectly?: () => void;
}

export function PayablesView({
  company,
  suppliers,
  categories,
  accounts,
  onRefreshBalance,
  openCreateModalDirectly,
  onCloseCreateModalDirectly,
}: PayablesViewProps) {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payModalItem, setPayModalItem] = useState<Payable | null>(null);
  const [cancelModalItem, setCancelModalItem] = useState<Payable | null>(null);

  // Formulário de Criação
  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('0');
  const [fineAmount, setFineAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Boleto Bancário');
  const [recurrence, setRecurrence] = useState<'unica' | 'mensal' | 'parcelada'>('unica');
  const [installments, setInstallments] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formulário de Pagamento (Baixa)
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAccountId, setPayAccountId] = useState('');
  const [payMethod, setPayMethod] = useState('Boleto Bancário');
  const [payNotes, setPayNotes] = useState('');

  // Cancelamento
  const [cancelReason, setCancelReason] = useState('');

  // Exclusão com Modal
  const [payableToDelete, setPayableToDelete] = useState<Payable | null>(null);

  useEffect(() => {
    if (openCreateModalDirectly) {
      setIsCreateOpen(true);
      if (onCloseCreateModalDirectly) onCloseCreateModalDirectly();
    }
  }, [openCreateModalDirectly]);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Payable[]>('/api/payables');
      setPayables(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [company.id]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/payables', {
        method: 'POST',
        body: JSON.stringify({
          description,
          supplierId,
          categoryId,
          financialAccountId,
          docNumber,
          originalAmount: Number(originalAmount),
          interestAmount: Number(interestAmount),
          fineAmount: Number(fineAmount),
          discountAmount: Number(discountAmount),
          dueDate,
          issueDate,
          paymentMethod,
          recurrence,
          installments: Number(installments),
          notes,
        }),
      });
      setIsCreateOpen(false);
      resetCreateForm();
      fetchPayables();
      onRefreshBalance();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setDescription('');
    setSupplierId('');
    setCategoryId('');
    setFinancialAccountId('');
    setDocNumber('');
    setOriginalAmount('');
    setInterestAmount('0');
    setFineAmount('0');
    setDiscountAmount('0');
    setNotes('');
    setRecurrence('unica');
    setInstallments('1');
    setFormError(null);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalItem) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/payables/${payModalItem.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(payAmount),
          date: payDate,
          financialAccountId: payAccountId || payModalItem.financialAccountId,
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });
      setPayModalItem(null);
      fetchPayables();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro na baixa da conta a pagar:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalItem) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/payables/${cancelModalItem.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      setCancelModalItem(null);
      setCancelReason('');
      fetchPayables();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao cancelar conta a pagar:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!payableToDelete) return;
    try {
      await apiRequest(`/api/payables/${payableToDelete.id}`, { method: 'DELETE' });
      setPayableToDelete(null);
      fetchPayables();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao excluir conta a pagar:', err);
    }
  };

  // Filtragem
  const filteredPayables = payables.filter((p) => {
    const matchesSearch =
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.docNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    const matchesSupplier = !supplierFilter || p.supplierId === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Exportação Excel
  const handleExportExcel = () => {
    const rows = filteredPayables.map((p) => ({
      Descrição: p.description,
      Fornecedor: p.supplierName,
      Categoria: p.categoryName,
      'Valor Original': p.originalAmount,
      'Valor Final': p.finalAmount,
      'Valor Pago': p.paidAmount,
      'Saldo Restante': p.remainingAmount,
      Vencimento: formatDateBR(p.dueDate),
      Status: p.status,
      'Forma Pagamento': p.paymentMethod,
    }));
    exportToExcel(rows, `FinanPro_Contas_a_Pagar_${new Date().toISOString().split('T')[0]}`);
  };

  // Exportação PDF
  const handleExportPDF = () => {
    const headers = ['Descrição', 'Fornecedor', 'Vencimento', 'Valor', 'Pago', 'Saldo', 'Status'];
    const rows = filteredPayables.map((p) => [
      p.description,
      p.supplierName || '-',
      formatDateBR(p.dueDate),
      formatBRL(p.finalAmount),
      formatBRL(p.paidAmount),
      formatBRL(p.remainingAmount),
      p.status.toUpperCase(),
    ]);
    exportToPDF('Relatório de Contas a Pagar', headers, rows, 'Relatorio_Contas_Pagar');
  };

  const getStatusBadge = (status: Payable['status']) => {
    switch (status) {
      case 'paga':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Paga
          </span>
        );
      case 'vencida':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <AlertCircle className="w-3 h-3" /> Vencida
          </span>
        );
      case 'parcialmente_paga':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="w-3 h-3" /> Parcial
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Ban className="w-3 h-3" /> Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Contas a Pagar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administração de obrigações financeiras, parcelas e pagamentos a fornecedores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            PDF
          </button>
          <button
            onClick={() => { resetCreateForm(); setIsCreateOpen(true); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Conta a Pagar
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, fornecedor ou documento..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
        >
          <option value="">Todos os Status</option>
          <option value="pendente">Pendente</option>
          <option value="vencida">Vencida</option>
          <option value="parcialmente_paga">Parcialmente Paga</option>
          <option value="paga">Paga</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
        >
          <option value="">Todos os Fornecedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Tabela de Contas a Pagar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Descrição / Doc</th>
                <th className="py-3 px-4 font-semibold">Fornecedor</th>
                <th className="py-3 px-4 font-semibold">Vencimento</th>
                <th className="py-3 px-4 font-semibold">Categoria</th>
                <th className="py-3 px-4 font-semibold text-right">Valor Final</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Devedor</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredPayables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma conta a pagar encontrada.
                  </td>
                </tr>
              ) : (
                filteredPayables.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{p.description}</div>
                      {p.docNumber && <div className="text-[10px] text-slate-400">Doc: {p.docNumber}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium">{p.supplierName}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{formatDateBR(p.dueDate)}</div>
                      {p.status === 'vencida' && (
                        <div className="text-[10px] text-red-500 font-bold">Atrasada</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        style={{ color: p.categoryColor }}
                        className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]"
                      >
                        {p.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatBRL(p.finalAmount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">
                      {formatBRL(p.remainingAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {p.status !== 'paga' && p.status !== 'cancelada' && (
                        <button
                          onClick={() => {
                            setPayModalItem(p);
                            setPayAmount(p.remainingAmount.toString());
                            setPayAccountId(p.financialAccountId || accounts[0]?.id || '');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold mr-1.5 cursor-pointer shadow-xs"
                        >
                          Pagar
                        </button>
                      )}
                      {p.status !== 'cancelada' && (
                        <button
                          onClick={() => setCancelModalItem(p)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mr-1 cursor-pointer"
                          title="Cancelar ou Estornar"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setPayableToDelete(p)}
                        className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                        title="Excluir Conta a Pagar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVA CONTA A PAGAR */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cadastrar Conta a Pagar</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição da Despesa *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel da sede, Fatura de internet, Compra de peças..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Fornecedor</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria Financeira</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione a Categoria...</option>
                    {categories.filter((c) => c.type === 'despesa').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Bancária de Débito</label>
                  <select
                    value={financialAccountId}
                    onChange={(e) => setFinancialAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione a Conta Bancária/Caixa...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.bankName || 'Caixa'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Nº Nota Fiscal / Documento</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="Ex: NF-12345"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Original (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Juros / Multa (+)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Desconto (-)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Datas e Parcelamento */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data Emissão</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Recorrência</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="unica">Única</option>
                    <option value="parcelada">Parcelada (1/N)</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>

              {recurrence === 'parcelada' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <label className="block font-medium text-blue-900 dark:text-blue-300 mb-1">Quantidade de Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                    O sistema dividirá o valor e criará parcelas mensais consecutivas automaticamente.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais para auditoria..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAGAR / BAIXAR CONTA */}
      {payModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Registrar Pagamento</h3>
                <p className="text-[11px] text-slate-500">{payModalItem.description}</p>
              </div>
              <button onClick={() => setPayModalItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Valor a Pagar (R$) (Saldo Restante: {formatBRL(payModalItem.remainingAmount)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={payModalItem.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Bancária / Caixa de Débito</label>
                <select
                  required
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo: {formatBRL(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Pix">Pix</option>
                  <option value="Transferência Bancária (TED/DOC)">Transferência TED/DOC</option>
                  <option value="Cartão Corporativo">Cartão Corporativo</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações do Pagamento</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Comprovante de TED #9821..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayModalItem(null)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR OU ESTORNAR */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Cancelar / Estornar Conta</h3>
            <p className="text-xs text-slate-500 mb-4">
              Deseja cancelar "{cancelModalItem.description}"? Caso existam pagamentos associados, o saldo bancário será estornado e preservado no histórico de auditoria.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo do Cancelamento</label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Nota fiscal cancelada pelo fornecedor..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalItem(null)}
                  className="px-4 py-2 text-slate-500"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!payableToDelete}
        title="Excluir Conta a Pagar"
        message={`Deseja realmente excluir a conta "${payableToDelete?.description}" no valor de ${formatBRL(payableToDelete?.finalAmount || 0)}? Todos os lançamentos e pagamentos vinculados serão removidos.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPayableToDelete(null)}
      />
    </div>
  );
}
