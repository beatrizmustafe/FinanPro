import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR, exportToExcel, exportToPDF } from '../../lib/api';
import { CashFlowData, FinancialAccount, Company } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface CashFlowViewProps {
  company: Company;
  accounts: FinancialAccount[];
}

export function CashFlowView({ company, accounts }: CashFlowViewProps) {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountId, setAccountId] = useState('');

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (accountId) query.append('accountId', accountId);

      const res = await apiRequest<CashFlowData>(`/api/cash-flow?${query.toString()}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [company.id, accountId]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCashFlow();
  };

  const handleExportExcel = () => {
    if (!data) return;
    const rows = data.timeline.map((item) => ({
      Data: formatDateBR(item.date),
      'Entradas Realizadas': item.realizedIn,
      'Saídas Realizadas': item.realizedOut,
      'Saldo Líquido Realizado': item.realizedIn - item.realizedOut,
      'Entradas Projetadas': item.projectedIn,
      'Saídas Projetadas': item.projectedOut,
      'Saldo Líquido Projetado': item.projectedIn - item.projectedOut,
    }));
    exportToExcel(rows, `FinanPro_Fluxo_de_Caixa_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    if (!data) return;
    const headers = ['Data', 'Entradas Realizadas', 'Saídas Realizadas', 'Entradas Previstas', 'Saídas Previstas'];
    const rows = data.timeline.map((item) => [
      formatDateBR(item.date),
      formatBRL(item.realizedIn),
      formatBRL(item.realizedOut),
      formatBRL(item.projectedIn),
      formatBRL(item.projectedOut),
    ]);
    exportToPDF('Demonstrativo de Fluxo de Caixa', headers, rows, 'Fluxo_de_Caixa');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Fluxo de Caixa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento detalhado de liquidez diária: valores realizados versus projeção de caixa
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
        </div>
      </div>

      {/* Barra de Filtros */}
      <form onSubmit={handleFilterSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-slate-500 font-medium">De:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-500 font-medium">Até:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white"
        >
          <option value="">Todas as Contas (Consolidado)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtrar Período
        </button>
      </form>

      {/* Cartões Comparativos: Realizado vs Projetado */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Realizado */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Fluxo Realizado (Efetivado)
              </span>
              <span className="text-[11px] text-slate-400">Transações Liquidadas</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  Entradas Realizadas:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  +{formatBRL(data.realized.inflows)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-red-500" />
                  Saídas Realizadas:
                </span>
                <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                  -{formatBRL(data.realized.outflows)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Saldo Líquido Realizado no Período:
                </span>
                <span className={`font-bold text-base ${
                  data.realized.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatBRL(data.realized.net)}
                </span>
              </div>
            </div>
          </div>

          {/* Projetado */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Fluxo Previsto (Projetado)
              </span>
              <span className="text-[11px] text-slate-400">Contas Pendentes</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-blue-500" />
                  Entradas Previstas (Recebíveis):
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  +{formatBRL(data.projected.inflows)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-amber-500" />
                  Saídas Previstas (Obrigações):
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  -{formatBRL(data.projected.outflows)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Saldo Projetado ao Final do Período:
                </span>
                <span className={`font-bold text-base ${
                  data.projected.finalProjectedBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600'
                }`}>
                  {formatBRL(data.projected.finalProjectedBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Linha do Tempo Diária */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Movimentação Diária e Previsão
          </h3>
          <span className="text-xs text-slate-400">
            Fórmula: Saldo Atual + Recebimentos Futuros - Pagamentos Futuros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Data</th>
                <th className="py-3 px-4 font-semibold text-right text-emerald-600">Entradas Realizadas</th>
                <th className="py-3 px-4 font-semibold text-right text-red-600">Saídas Realizadas</th>
                <th className="py-3 px-4 font-semibold text-right">Líquido do Dia</th>
                <th className="py-3 px-4 font-semibold text-right text-blue-600">Entradas Previstas</th>
                <th className="py-3 px-4 font-semibold text-right text-amber-600">Saídas Previstas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading || !data ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1" />
                    Carregando fluxo de caixa...
                  </td>
                </tr>
              ) : data.timeline.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum registro no período selecionado.
                  </td>
                </tr>
              ) : (
                data.timeline.map((item) => {
                  const dayNet = item.realizedIn - item.realizedOut;
                  const hasActivity = item.realizedIn > 0 || item.realizedOut > 0 || item.projectedIn > 0 || item.projectedOut > 0;

                  return (
                    <tr
                      key={item.date}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        hasActivity ? 'font-medium' : 'text-slate-400'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono">{formatDateBR(item.date)}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {item.realizedIn > 0 ? `+${formatBRL(item.realizedIn)}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-red-600 dark:text-red-400">
                        {item.realizedOut > 0 ? `-${formatBRL(item.realizedOut)}` : '-'}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold ${
                        dayNet > 0 ? 'text-emerald-600' : dayNet < 0 ? 'text-red-600' : 'text-slate-400'
                      }`}>
                        {dayNet !== 0 ? formatBRL(dayNet) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-blue-600 dark:text-blue-400">
                        {item.projectedIn > 0 ? `+${formatBRL(item.projectedIn)}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-600 dark:text-amber-400">
                        {item.projectedOut > 0 ? `-${formatBRL(item.projectedOut)}` : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
