import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR, exportToExcel, exportToPDF } from '../../lib/api';
import { Sale, SaleItem, Client, FinancialAccount, Category, Company } from '../../types';
import {
  Plus,
  Search,
  Receipt,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  X,
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface SalesViewProps {
  company: Company;
  clients: Client[];
  accounts: FinancialAccount[];
  categories: Category[];
  onRefreshBalance: () => void;
  openCreateModalDirectly?: boolean;
  onCloseCreateModalDirectly?: () => void;
}

export function SalesView({
  company,
  clients,
  accounts,
  categories,
  onRefreshBalance,
  openCreateModalDirectly,
  onCloseCreateModalDirectly,
}: SalesViewProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewDetailsItem, setViewDetailsItem] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Form Venda
  const [clientId, setClientId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedReceiptDate, setEstimatedReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Boleto Bancário');
  const [installments, setInstallments] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPrice: number; discount: number }>>([
    { description: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (openCreateModalDirectly) {
      setIsCreateOpen(true);
      if (onCloseCreateModalDirectly) onCloseCreateModalDirectly();
    }
  }, [openCreateModalDirectly]);

  const fetchSalesAndStats = async () => {
    setLoading(true);
    try {
      const [salesData, statsData] = await Promise.all([
        apiRequest<Sale[]>('/api/sales'),
        apiRequest<any>('/api/sales/stats'),
      ]);
      setSales(salesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      await apiRequest(`/api/sales/${saleToDelete.id}`, { method: 'DELETE' });
      setSaleToDelete(null);
      fetchSalesAndStats();
      onRefreshBalance();
    } catch (err: any) {
      console.error('Erro ao excluir venda:', err);
    }
  };

  useEffect(() => {
    fetchSalesAndStats();
  }, [company.id]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Cálculos do form
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice - it.discount), 0);
  const totalSale = Math.max(0, subtotal - (Number(discount) || 0));

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientId) {
      setFormError('Selecione o cliente.');
      return;
    }

    if (items.some((it) => !it.description || it.unitPrice <= 0)) {
      setFormError('Preencha a descrição e valor unitário de todos os itens.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          saleDate,
          estimatedReceiptDate,
          paymentMethod,
          installments: Number(installments),
          discount: Number(discount),
          items,
          notes,
          financialAccountId,
          categoryId,
          generateReceivables: true,
        }),
      });

      setIsCreateOpen(false);
      resetForm();
      fetchSalesAndStats();
      onRefreshBalance();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setClientId('');
    setItems([{ description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    setDiscount('0');
    setNotes('');
    setInstallments('1');
    setFormError(null);
  };

  const filteredSales = sales.filter((s) => {
    return (
      s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.clientName || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleExportExcel = () => {
    const rows = filteredSales.map((s) => ({
      'Número Venda': s.saleNumber,
      Cliente: s.clientName,
      Data: formatDateBR(s.saleDate),
      Subtotal: s.subtotal,
      Desconto: s.discount,
      'Total Líquido': s.total,
      'Forma Pagamento': s.paymentMethod,
      Parcelas: s.installments,
      Status: s.status,
    }));
    exportToExcel(rows, `FinanPro_Vendas_Faturamento_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const headers = ['Nº Venda', 'Cliente', 'Data', 'Bruto', 'Desconto', 'Total Líquido', 'Status'];
    const rows = filteredSales.map((s) => [
      s.saleNumber,
      s.clientName || '-',
      formatDateBR(s.saleDate),
      formatBRL(s.subtotal),
      formatBRL(s.discount),
      formatBRL(s.total),
      s.status.toUpperCase(),
    ]);
    exportToPDF('Relatório de Faturamento e Vendas', headers, rows, 'Relatorio_Faturamento');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Faturamento e Vendas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro de vendas, itens, emissão de faturamento gerencial e integração com recebíveis
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
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Venda / Faturamento
          </button>
        </div>
      </div>

      {/* Indicadores de Faturamento (Diário, Semanal, Mensal, Anual) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 block mb-1">Faturamento Hoje</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {formatBRL(stats.daily.net)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">{stats.daily.count} venda(s)</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 block mb-1">Últimos 7 Dias</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {formatBRL(stats.weekly.net)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">{stats.weekly.count} venda(s)</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 block mb-1">Faturamento do Mês</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatBRL(stats.monthly.net)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">Bruto: {formatBRL(stats.monthly.gross)}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 block mb-1">Faturamento Anual</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatBRL(stats.annual.net)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">{stats.annual.count} venda(s) no ano</span>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número da venda ou cliente..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Nº Venda</th>
                <th className="py-3 px-4 font-semibold">Cliente</th>
                <th className="py-3 px-4 font-semibold">Data da Venda</th>
                <th className="py-3 px-4 font-semibold text-center">Itens</th>
                <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                <th className="py-3 px-4 font-semibold text-right">Desconto</th>
                <th className="py-3 px-4 font-semibold text-right">Total Líquido</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma venda registrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {s.saleNumber}
                    </td>
                    <td className="py-3 px-4 font-medium">{s.clientName}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatDateBR(s.saleDate)}</td>
                    <td className="py-3 px-4 text-center">{s.items?.length || 1}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatBRL(s.subtotal)}</td>
                    <td className="py-3 px-4 text-right text-red-500">
                      {s.discount > 0 ? `-${formatBRL(s.discount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatBRL(s.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Faturada
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setViewDetailsItem(s)}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer font-medium inline-flex items-center gap-1 mr-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </button>
                      <button
                        onClick={() => setSaleToDelete(s)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                        title="Excluir Venda"
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

      {/* MODAL: NOVA VENDA */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Novo Faturamento / Venda</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente *</label>
                  <select
                    required
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
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Venda</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Itens da Venda */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Produtos ou Serviços
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Descrição do produto ou serviço..."
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="R$ Unit."
                          value={it.unitPrice || ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white text-right font-medium"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagamento e Parcelas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Pix">Pix</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Parcelas (Contas a Receber)</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">1º Vencimento</label>
                  <input
                    type="date"
                    required
                    value={estimatedReceiptDate}
                    onChange={(e) => setEstimatedReceiptDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Desconto Geral e Totais */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Desconto Geral na Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col justify-center text-right">
                  <span className="text-[11px] text-blue-700 dark:text-blue-300">Total Faturado:</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatBRL(totalSale)}</span>
                </div>
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
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Venda e Integrar Recebíveis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DA VENDA */}
      {viewDetailsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Detalhes da Venda {viewDetailsItem.saleNumber}
                </h3>
                <p className="text-xs text-slate-500">Cliente: {viewDetailsItem.clientName}</p>
              </div>
              <button onClick={() => setViewDetailsItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Data de Emissão:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDateBR(viewDetailsItem.saleDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{viewDetailsItem.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parcelamento:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{viewDetailsItem.installments}x</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-right">Unitário</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewDetailsItem.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{it.description}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-right">{formatBRL(it.unitPrice)}</td>
                      <td className="p-2 text-right font-bold">{formatBRL(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-xs text-right border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="text-slate-500">Subtotal: {formatBRL(viewDetailsItem.subtotal)}</div>
              {viewDetailsItem.discount > 0 && (
                <div className="text-red-500">Desconto: -{formatBRL(viewDetailsItem.discount)}</div>
              )}
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                Total Líquido: {formatBRL(viewDetailsItem.total)}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setViewDetailsItem(null)}
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
        isOpen={!!saleToDelete}
        title="Excluir Venda / Faturamento"
        message={`Deseja realmente excluir a venda "${saleToDelete?.saleNumber}" no valor de ${formatBRL(saleToDelete?.total || 0)}? Todos os títulos a receber e recebimentos atrelados serão removidos.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeleteSale}
        onCancel={() => setSaleToDelete(null)}
      />
    </div>
  );
}
