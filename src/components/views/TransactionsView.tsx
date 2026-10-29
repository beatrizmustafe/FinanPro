import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR, exportToExcel, exportToPDF } from '../../lib/api';
import { Transaction, Category, FinancialAccount, Client, Supplier, Company } from '../../types';
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface TransactionsViewProps {
  company: Company;
  categories: Category[];
  accounts: FinancialAccount[];
  clients: Client[];
  suppliers: Supplier[];
  onRefreshBalance: () => void;
}

export function TransactionsView({
  company,
  categories,
  accounts,
  clients,
  suppliers,
  onRefreshBalance,
}: TransactionsViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reverseModalItem, setReverseModalItem] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Form Criação Manual
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [docRef, setDocRef] = useState('');
  const [contactId, setContactId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Transaction[]>('/api/transactions');
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await apiRequest(`/api/transactions/${transactionToDelete.id}`, { method: 'DELETE' });
      setTransactionToDelete(null);
      fetchTransactions();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao excluir transação:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [company.id]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type,
          amount: Number(amount),
          date,
          categoryId,
          financialAccountId: financialAccountId || accounts[0]?.id,
          paymentMethod,
          docRef,
          clientId: type === 'entrada' ? contactId : undefined,
          supplierId: type === 'saida' ? contactId : undefined,
          notes,
        }),
      });
      setIsCreateOpen(false);
      setAmount('');
      setNotes('');
      setDocRef('');
      fetchTransactions();
      onRefreshBalance();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseModalItem) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/transactions/${reverseModalItem.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: reverseReason }),
      });
      setReverseModalItem(null);
      setReverseReason('');
      fetchTransactions();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao estornar transação:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.docRef || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || t.type === typeFilter;
    const matchesAccount = !accountFilter || t.financialAccountId === accountFilter || t.destinationAccountId === accountFilter;
    const matchesCategory = !categoryFilter || t.categoryId === categoryFilter;
    return matchesSearch && matchesType && matchesAccount && matchesCategory;
  });

  const totalInflows = filteredTransactions
    .filter((t) => t.type === 'entrada' && t.status !== 'estornado')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = filteredTransactions
    .filter((t) => t.type === 'saida' && t.status !== 'estornado')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalInflows - totalOutflows;

  const handleExportExcel = () => {
    const rows = filteredTransactions.map((t) => ({
      Data: formatDateBR(t.date),
      Tipo: t.type.toUpperCase(),
      Valor: t.amount,
      Conta: t.accountName,
      Categoria: t.categoryName,
      Contato: t.contactName,
      Documento: t.docRef,
      Status: t.status,
      Observações: t.notes,
    }));
    exportToExcel(rows, `FinanPro_Extrato_Movimentacoes_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const headers = ['Data', 'Tipo', 'Descrição / Notas', 'Conta', 'Categoria', 'Valor', 'Status'];
    const rows = filteredTransactions.map((t) => [
      formatDateBR(t.date),
      t.type.toUpperCase(),
      t.notes || t.docRef || '-',
      t.accountName || '-',
      t.categoryName || '-',
      formatBRL(t.amount),
      t.status.toUpperCase(),
    ]);
    exportToPDF('Extrato de Movimentações Financeiras', headers, rows, 'Extrato_Movimentacoes');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Receitas e Despesas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Livro de movimentações e conciliação de entradas, saídas e transferências
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
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento Avulso
          </button>
        </div>
      </div>

      {/* Cartões de Resumo do Extrato */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Total de Entradas</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" /> +{formatBRL(totalInflows)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Total de Saídas</span>
          <span className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
            <ArrowDownLeft className="w-4 h-4" /> -{formatBRL(totalOutflows)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Resultado Líquido do Filtro</span>
          <span className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatBRL(netBalance)}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, contato ou documento..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
        >
          <option value="">Todos os Tipos</option>
          <option value="entrada">Entradas (Receitas)</option>
          <option value="saida">Saídas (Despesas)</option>
          <option value="transferencia">Transferências Internas</option>
        </select>

        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
        >
          <option value="">Todas as Contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Data</th>
                <th className="py-3 px-4 font-semibold">Tipo</th>
                <th className="py-3 px-4 font-semibold">Descrição / Contato</th>
                <th className="py-3 px-4 font-semibold">Categoria</th>
                <th className="py-3 px-4 font-semibold">Conta Financeira</th>
                <th className="py-3 px-4 font-semibold text-right">Valor</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma movimentação financeira encontrada.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      t.status === 'estornado' ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">{formatDateBR(t.date)}</td>
                    <td className="py-3 px-4">
                      {t.type === 'entrada' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Entrada
                        </span>
                      )}
                      {t.type === 'saida' && (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Saída
                        </span>
                      )}
                      {t.type === 'transferencia' && (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                          <ArrowLeftRight className="w-3.5 h-3.5" /> Transferência
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {t.notes || (t.type === 'transferencia' ? 'Transferência Interna' : 'Lançamento Avulso')}
                      </div>
                      {t.contactName && <div className="text-[10px] text-slate-400">{t.contactName}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        style={{ color: t.categoryColor }}
                        className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]"
                      >
                        {t.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{t.accountName}</div>
                      {t.destAccountName && (
                        <div className="text-[10px] text-slate-400">&rarr; {t.destAccountName}</div>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      t.type === 'entrada'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : t.type === 'saida'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {t.type === 'saida' ? '-' : '+'}{formatBRL(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.status === 'estornado' ? (
                        <span className="text-[10px] font-bold text-red-500 uppercase">Estornado</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase">Liquidado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {t.status !== 'estornado' && !t.payableId && !t.receivableId && (
                        <button
                          onClick={() => setReverseModalItem(t)}
                          className="p-1 mr-1 text-slate-400 hover:text-amber-500 cursor-pointer"
                          title="Estornar movimentação"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setTransactionToDelete(t)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                        title="Excluir movimentação"
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

      {/* MODAL: NOVO LANÇAMENTO AVULSO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Novo Lançamento Avulso</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('entrada')}
                  className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    type === 'entrada'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  + Entrada (Receita)
                </button>
                <button
                  type="button"
                  onClick={() => setType('saida')}
                  className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    type === 'saida'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  - Saída (Despesa)
                </button>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Movimentação</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Bancária / Caixa</label>
                <select
                  required
                  value={financialAccountId}
                  onChange={(e) => setFinancialAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} (Saldo: {formatBRL(a.currentBalance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="">Selecione a Categoria...</option>
                  {categories.filter((c) => c.type === (type === 'entrada' ? 'receita' : 'despesa')).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição / Observações</label>
                <input
                  type="text"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Compra de suprimentos de escritório, Recebimento de consultoria..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNO AUDITADO */}
      {reverseModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Estornar Movimentação Financeira</h3>
            <p className="text-xs text-slate-500 mb-4">
              O estorno anulará o impacto no saldo da conta ({formatBRL(reverseModalItem.amount)}) e preservará o histórico auditável de lançamentos.
            </p>

            <form onSubmit={handleReverseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo do Estorno</label>
                <input
                  type="text"
                  required
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="Ex: Lançamento em duplicidade, valor digitado incorretamente..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReverseModalItem(null)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Estorno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!transactionToDelete}
        title="Excluir Movimentação"
        message={`Deseja realmente excluir este lançamento de ${formatBRL(transactionToDelete?.amount || 0)} (${transactionToDelete?.notes || transactionToDelete?.type})? O saldo da conta será recalculado.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
}
