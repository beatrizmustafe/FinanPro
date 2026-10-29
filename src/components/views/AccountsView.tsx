import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR } from '../../lib/api';
import { FinancialAccount, Transaction, Company } from '../../types';
import {
  Plus,
  Landmark,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  X,
  RefreshCw,
  Eye,
  Trash2,
  Edit3,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface AccountsViewProps {
  company: Company;
  accounts: FinancialAccount[];
  consolidatedBalance: number;
  onRefresh: () => void;
  openTransferModalDirectly?: boolean;
  onCloseTransferModalDirectly?: () => void;
}

export function AccountsView({
  company,
  accounts,
  consolidatedBalance,
  onRefresh,
  openTransferModalDirectly,
  onCloseTransferModalDirectly,
}: AccountsViewProps) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [statementAccount, setStatementAccount] = useState<{ account: FinancialAccount; transactions: Transaction[]; currentBalance: number } | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);

  // Form Conta
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [type, setType] = useState<FinancialAccount['type']>('corrente');
  const [initialBalance, setInitialBalance] = useState('0');
  const [initialBalanceDate, setInitialBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [color, setColor] = useState('#2563eb');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Transferência
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => {
    if (openTransferModalDirectly) {
      if (accounts.length >= 2) {
        setSourceAccountId(accounts[0].id);
        setDestinationAccountId(accounts[1].id);
      }
      setIsTransferModalOpen(true);
      if (onCloseTransferModalDirectly) onCloseTransferModalDirectly();
    }
  }, [openTransferModalDirectly]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/financial-accounts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          bankName,
          type,
          initialBalance: Number(initialBalance),
          initialBalanceDate,
          color,
        }),
      });
      setIsAccountModalOpen(false);
      resetAccountForm();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAccountForm = () => {
    setName('');
    setBankName('');
    setType('corrente');
    setInitialBalance('0');
    setColor('#2563eb');
    setFormError(null);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!sourceAccountId || !destinationAccountId || Number(transferAmount) <= 0) {
      setFormError('Selecione contas válidas e informe um valor positivo.');
      return;
    }
    if (sourceAccountId === destinationAccountId) {
      setFormError('A conta de origem e destino não podem ser as mesmas.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/financial-accounts/transfer', {
        method: 'POST',
        body: JSON.stringify({
          sourceAccountId,
          destinationAccountId,
          amount: Number(transferAmount),
          date: transferDate,
          notes: transferNotes,
        }),
      });
      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferNotes('');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openStatement = async (acc: FinancialAccount) => {
    try {
      const data = await apiRequest(`/api/financial-accounts/${acc.id}/statement`);
      setStatementAccount(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await apiRequest(`/api/financial-accounts/${accountToDelete.id}`, { method: 'DELETE' });
      setAccountToDelete(null);
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir conta bancária:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Contas Financeiras e Bancos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerenciamento de contas correntes, poupanças, caixas físicos e transferências entre contas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (accounts.length >= 2) {
                setSourceAccountId(accounts[0].id);
                setDestinationAccountId(accounts[1].id);
              }
              setIsTransferModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transferência entre Contas
          </button>

          <button
            onClick={() => { resetAccountForm(); setIsAccountModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Conta Financeira
          </button>
        </div>
      </div>

      {/* Saldo Consolidado Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Saldo Consolidado Total da Empresa
            </span>
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              consolidatedBalance < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'
            }`}>
              {formatBRL(consolidatedBalance)}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Soma líquida de todas as contas ativas considerando saldos iniciais, receitas, despesas e transferências.
        </div>
      </div>

      {/* Grid de Contas Bancárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  style={{ backgroundColor: `${acc.color}15`, color: acc.color, borderColor: `${acc.color}40` }}
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border"
                >
                  {acc.type.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400 capitalize">{acc.status === 'active' ? 'Ativa' : 'Arquivada'}</span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-0.5">{acc.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{acc.bankName || 'Tesouraria Interna'}</p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-3">
                <div className="text-[11px] text-slate-500">Saldo Atual Líquido:</div>
                <div className={`text-xl font-bold tracking-tight ${
                  acc.currentBalance < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'
                }`}>
                  {formatBRL(acc.currentBalance)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Saldo Inicial: {formatBRL(acc.initialBalance)} em {formatDateBR(acc.initialBalanceDate)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                onClick={() => openStatement(acc)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Ver Extrato
              </button>
              <button
                onClick={() => setAccountToDelete(acc)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                title="Remover ou arquivar conta"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: NOVA CONTA FINANCEIRA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cadastrar Conta Financeira</h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleAccountSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Itaú Empresas - CC, Caixa Pequeno..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Instituição / Banco</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Banco Itaú, Nubank..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Conta</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="corrente">Conta Corrente</option>
                    <option value="caixa">Caixa Físico</option>
                    <option value="poupanca">Poupança</option>
                    <option value="pagamento">Conta de Pagamento</option>
                    <option value="investimento">Investimento / Reserva</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Saldo Inicial</label>
                  <input
                    type="date"
                    required
                    value={initialBalanceDate}
                    onChange={(e) => setInitialBalanceDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERÊNCIA ENTRE CONTAS */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                Transferência entre Contas
              </h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta de Origem (Débito) *</label>
                <select
                  required
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="">Selecione a conta de saída...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo: {formatBRL(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conta de Destino (Crédito) *</label>
                <select
                  required
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="">Selecione a conta de entrada...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo: {formatBRL(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Valor da Transferência (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo / Descrição</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Ex: Aporte para pagamento de folha, Reposição de caixa..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <strong>Regra Financeira:</strong> A transferência interna não altera o resultado operacional nem conta como receita/despesa da empresa.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Efetuar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXTRATO DA CONTA */}
      {statementAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Extrato de Movimentações: {statementAccount.account.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Saldo Líquido Atual: <strong className="text-blue-600">{formatBRL(statementAccount.currentBalance)}</strong>
                </p>
              </div>
              <button onClick={() => setStatementAccount(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {statementAccount.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        Nenhuma movimentação para esta conta.
                      </td>
                    </tr>
                  ) : (
                    statementAccount.transactions.map((t) => (
                      <tr key={t.id} className={t.status === 'estornado' ? 'opacity-40 line-through' : ''}>
                        <td className="p-2.5 whitespace-nowrap">{formatDateBR(t.date)}</td>
                        <td className="p-2.5 font-medium">{t.notes || 'Movimentação'}</td>
                        <td className="p-2.5 capitalize">{t.type}</td>
                        <td className={`p-2.5 text-right font-bold ${
                          t.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {t.type === 'saida' ? '-' : '+'}{formatBRL(t.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={() => setStatementAccount(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!accountToDelete}
        title="Remover Conta Financeira"
        message={`Deseja realmente excluir a conta "${accountToDelete?.name}" (${formatBRL(accountToDelete?.currentBalance || 0)})? Caso possua movimentações históricas, a conta será desativada de forma segura para preservar relatórios contábeis.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setAccountToDelete(null)}
      />
    </div>
  );
}
