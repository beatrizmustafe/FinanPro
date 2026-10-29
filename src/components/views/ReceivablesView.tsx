import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR, exportToExcel, exportToPDF } from '../../lib/api';
import { Receivable, Client, Category, FinancialAccount, Company } from '../../types';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Trash2,
  FileSpreadsheet,
  FileText,
  X,
  RefreshCw,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface ReceivablesViewProps {
  company: Company;
  clients: Client[];
  categories: Category[];
  accounts: FinancialAccount[];
  onRefreshBalance: () => void;
  openCreateModalDirectly?: boolean;
  onCloseCreateModalDirectly?: () => void;
}

export function ReceivablesView({
  company,
  clients,
  categories,
  accounts,
  onRefreshBalance,
  openCreateModalDirectly,
  onCloseCreateModalDirectly,
}: ReceivablesViewProps) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receiveModalItem, setReceiveModalItem] = useState<Receivable | null>(null);
  const [cancelModalItem, setCancelModalItem] = useState<Receivable | null>(null);

  // Form Criação
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('0');
  const [fineAmount, setFineAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [recurrence, setRecurrence] = useState<'unica' | 'mensal' | 'parcelada'>('unica');
  const [installments, setInstallments] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Recebimento (Baixa)
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveAccountId, setReceiveAccountId] = useState('');
  const [receiveMethod, setReceiveMethod] = useState('Pix');
  const [receiveNotes, setReceiveNotes] = useState('');

  // Cancelamento
  const [cancelReason, setCancelReason] = useState('');

  // Exclusão com Modal
  const [receivableToDelete, setReceivableToDelete] = useState<Receivable | null>(null);

  useEffect(() => {
    if (openCreateModalDirectly) {
      setIsCreateOpen(true);
      if (onCloseCreateModalDirectly) onCloseCreateModalDirectly();
    }
  }, [openCreateModalDirectly]);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Receivable[]>('/api/receivables');
      setReceivables(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [company.id]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/receivables', {
        method: 'POST',
        body: JSON.stringify({
          description,
          clientId,
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
      fetchReceivables();
      onRefreshBalance();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setDescription('');
    setClientId('');
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

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalItem) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/receivables/${receiveModalItem.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(receiveAmount),
          date: receiveDate,
          financialAccountId: receiveAccountId || receiveModalItem.financialAccountId,
          paymentMethod: receiveMethod,
          notes: receiveNotes,
        }),
      });
      setReceiveModalItem(null);
      fetchReceivables();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro no recebimento:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalItem) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/receivables/${cancelModalItem.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      setCancelModalItem(null);
      setCancelReason('');
      fetchReceivables();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao cancelar recebível:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!receivableToDelete) return;
    try {
      await apiRequest(`/api/receivables/${receivableToDelete.id}`, { method: 'DELETE' });
      setReceivableToDelete(null);
      fetchReceivables();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao excluir conta a receber:', err);
    }
  };

  const filteredReceivables = receivables.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.docNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesClient = !clientFilter || r.clientId === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const handleExportExcel = () => {
    const rows = filteredReceivables.map((r) => ({
      Descrição: r.description,
      Cliente: r.clientName,
      Categoria: r.categoryName,
      'Valor Original': r.originalAmount,
      'Valor Final': r.finalAmount,
      'Valor Recebido': r.receivedAmount,
      'Saldo Pendente': r.remainingAmount,
      Vencimento: formatDateBR(r.dueDate),
      Status: r.status,
      'Forma Recebimento': r.paymentMethod,
    }));
    exportToExcel(rows, `FinanPro_Contas_a_Receber_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const headers = ['Descrição', 'Cliente', 'Vencimento', 'Valor', 'Recebido', 'Saldo', 'Status'];
    const rows = filteredReceivables.map((r) => [
      r.description,
      r.clientName || '-',
      formatDateBR(r.dueDate),
      formatBRL(r.finalAmount),
      formatBRL(r.receivedAmount),
      formatBRL(r.remainingAmount),
      r.status.toUpperCase(),
    ]);
    exportToPDF('Relatório de Contas a Receber', headers, rows, 'Relatorio_Contas_Receber');
  };

  const getStatusBadge = (status: Receivable['status']) => {
    switch (status) {
      case 'recebido':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Recebido
          </span>
        );
      case 'vencido':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <AlertCircle className="w-3 h-3" /> Vencido
          </span>
        );
      case 'parcialmente_recebido':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="w-3 h-3" /> Parcial
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Ban className="w-3 h-3" /> Cancelado
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
            Contas a Receber
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento de direitos a receber, cobrança de clientes e fluxo de entradas
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Conta a Receber
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
            placeholder="Buscar por descrição, cliente ou documento..."
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
          <option value="vencido">Vencido</option>
          <option value="parcialmente_recebido">Parcialmente Recebido</option>
          <option value="recebido">Recebido</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
        >
          <option value="">Todos os Clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tabela de Contas a Receber */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Descrição / Doc</th>
                <th className="py-3 px-4 font-semibold">Cliente</th>
                <th className="py-3 px-4 font-semibold">Vencimento</th>
                <th className="py-3 px-4 font-semibold">Categoria</th>
                <th className="py-3 px-4 font-semibold text-right">Valor Total</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Pendente</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma conta a receber encontrada.
                  </td>
                </tr>
              ) : (
                filteredReceivables.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.description}</div>
                      {r.docNumber && <div className="text-[10px] text-slate-400">Doc: {r.docNumber}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium">{r.clientName}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{formatDateBR(r.dueDate)}</div>
                      {r.status === 'vencido' && (
                        <div className="text-[10px] text-red-500 font-bold">Vencido</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        style={{ color: r.categoryColor }}
                        className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]"
                      >
                        {r.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatBRL(r.finalAmount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBRL(r.remainingAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {r.status !== 'recebido' && r.status !== 'cancelado' && (
                        <button
                          onClick={() => {
                            setReceiveModalItem(r);
                            setReceiveAmount(r.remainingAmount.toString());
                            setReceiveAccountId(r.financialAccountId || accounts[0]?.id || '');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold mr-1.5 cursor-pointer shadow-xs"
                        >
                          Receber
                        </button>
                      )}
                      {r.status !== 'cancelado' && (
                        <button
                          onClick={() => setCancelModalItem(r)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mr-1 cursor-pointer"
                          title="Cancelar ou Estornar"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setReceivableToDelete(r)}
                        className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                        title="Excluir Conta a Receber"
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

      {/* MODAL: NOVA CONTA A RECEBER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cadastrar Conta a Receber</h2>
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
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição do Recebimento *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Prestação de serviços de consultoria, Venda a prazo..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione o Cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
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
                    {categories.filter((c) => c.type === 'receita').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Bancária de Destino</label>
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
                    placeholder="Ex: NFS-9901"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$) *</label>
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
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <label className="block font-medium text-emerald-900 dark:text-emerald-300 mb-1">Quantidade de Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    As parcelas serão criadas com vencimentos mensais consecutivos.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais..."
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Recebível'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR RECEBIMENTO */}
      {receiveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Registrar Recebimento</h3>
                <p className="text-[11px] text-slate-500">{receiveModalItem.description}</p>
              </div>
              <button onClick={() => setReceiveModalItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Valor Recebido (R$) (Pendente: {formatBRL(receiveModalItem.remainingAmount)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={receiveModalItem.remainingAmount}
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Recebimento</label>
                <input
                  type="date"
                  required
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Bancária / Caixa de Crédito</label>
                <select
                  required
                  value={receiveAccountId}
                  onChange={(e) => setReceiveAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo Atual: {formatBRL(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Forma de Recebimento</label>
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="Pix">Pix</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Transferência Bancária (TED/DOC)">Transferência TED/DOC</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações do Recebimento</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Ex: Identificação do comprovante Pix..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalItem(null)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Recebimento'}
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
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Cancelar / Estornar Recebimento</h3>
            <p className="text-xs text-slate-500 mb-4">
              Deseja cancelar "{cancelModalItem.description}"? Caso existam recebimentos associados, o saldo bancário será estornado e preservado na auditoria.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo do Cancelamento</label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Cancelamento de pedido pelo cliente..."
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
        isOpen={!!receivableToDelete}
        title="Excluir Conta a Receber"
        message={`Deseja realmente excluir a conta a receber "${receivableToDelete?.description}" no valor de ${formatBRL(receivableToDelete?.finalAmount || 0)}? Todos os recebimentos vinculados serão cancelados.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setReceivableToDelete(null)}
      />
    </div>
  );
}
