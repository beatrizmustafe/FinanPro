import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR } from '../../lib/api';
import { DashboardData, Company } from '../../types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  company: Company;
  onNavigate: (tab: any) => void;
  onOpenNewPayable: () => void;
  onOpenNewReceivable: () => void;
  onOpenNewSale: () => void;
  onOpenTransfer: () => void;
}

export function DashboardView({
  company,
  onNavigate,
  onOpenNewPayable,
  onOpenNewReceivable,
  onOpenNewSale,
  onOpenTransfer,
}: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<DashboardData>('/api/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [company.id]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Calculando indicadores financeiros...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">{error || 'Erro ao carregar dashboard.'}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { kpis, forecasts, charts, upcoming } = data;
  const isPositiveNet = kpis.monthNetResult >= 0;

  // Encontra maior valor nos gráficos dos 6 meses para escala
  const maxMonthVal = Math.max(
    ...charts.last6Months.map((m) => Math.max(m.revenues, m.expenses, m.billing)),
    1000
  );

  return (
    <div className="space-y-6">
      {/* Barra de Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Painel Financeiro
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resumo consolidado em tempo real de {company.tradeName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewPayable}
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            + Conta a Pagar
          </button>
          <button
            onClick={onOpenNewReceivable}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            + Conta a Receber
          </button>
          <button
            onClick={onOpenNewSale}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            + Nova Venda
          </button>
          <button
            onClick={onOpenTransfer}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Transferência
          </button>
        </div>
      </div>

      {/* Cartões Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Atual */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Saldo Consolidado</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${
            kpis.currentBalance < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'
          }`}>
            {formatBRL(kpis.currentBalance)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Disponível em bancos e caixas</span>
            <button onClick={() => onNavigate('accounts')} className="text-blue-600 dark:text-blue-400 hover:underline">
              Ver contas &rarr;
            </button>
          </div>
        </div>

        {/* Receitas do Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Receitas Realizadas (Mês)</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatBRL(kpis.monthRevenue)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Faturamento: {formatBRL(kpis.monthlyBilling)}</span>
            <button onClick={() => onNavigate('sales')} className="text-blue-600 dark:text-blue-400 hover:underline">
              Vendas &rarr;
            </button>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Despesas Realizadas (Mês)</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/50 rounded-xl text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 tracking-tight">
            {formatBRL(kpis.monthExpenses)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Saídas e pagamentos efetuados</span>
            <button onClick={() => onNavigate('transactions')} className="text-blue-600 dark:text-blue-400 hover:underline">
              Extrato &rarr;
            </button>
          </div>
        </div>

        {/* Resultado Financeiro */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Resultado do Período</span>
            <div className={`p-2 rounded-xl ${
              isPositiveNet
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
            }`}>
              {isPositiveNet ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${
            isPositiveNet ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatBRL(kpis.monthNetResult)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {isPositiveNet ? 'Superávit operacional líquido' : 'Déficit operacional líquido'}
          </div>
        </div>
      </div>

      {/* Cartões Secundários: Contas a Receber, Contas a Pagar e Vencidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contas a Receber Resumo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contas a Receber</span>
              <button onClick={() => onNavigate('receivables')} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Gerenciar Recebíveis &rarr;
              </button>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Total em Aberto:</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">{formatBRL(kpis.totalReceivables)}</span>
            </div>
            {kpis.overdueReceivables > 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Inadimplência (Vencidos):
                </span>
                <span className="font-bold">{formatBRL(kpis.overdueReceivables)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contas a Pagar Resumo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contas a Pagar</span>
              <button onClick={() => onNavigate('payables')} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Gerenciar Pagamentos &rarr;
              </button>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Total de Obrigações:</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">{formatBRL(kpis.totalPayables)}</span>
            </div>
            {kpis.overduePayables > 0 && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Obrigações Vencidas:
                </span>
                <span className="font-bold">{formatBRL(kpis.overduePayables)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Previsão de Saldo (Próximos 7, 15 e 30 dias) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Previsão de Saldo de Caixa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Projeção futura calculada com base no saldo atual, recebíveis programados e pagamentos previstos
            </p>
          </div>
          <button
            onClick={() => onNavigate('cash-flow')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            Ver Fluxo de Caixa Projetado Completo &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 7 Dias */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Próximos 7 Dias
            </span>
            <div className={`text-xl font-bold tracking-tight mb-2 ${
              forecasts.forecast7.projected < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'
            }`}>
              {formatBRL(forecasts.forecast7.projected)}
            </div>
            <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span>Entradas estimadas:</span>
                <span className="text-emerald-600 font-medium">+{formatBRL(forecasts.forecast7.inForecast)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saídas previstas:</span>
                <span className="text-red-600 font-medium">-{formatBRL(forecasts.forecast7.outForecast)}</span>
              </div>
            </div>
          </div>

          {/* 15 Dias */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Próximos 15 Dias
            </span>
            <div className={`text-xl font-bold tracking-tight mb-2 ${
              forecasts.forecast15.projected < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'
            }`}>
              {formatBRL(forecasts.forecast15.projected)}
            </div>
            <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span>Entradas estimadas:</span>
                <span className="text-emerald-600 font-medium">+{formatBRL(forecasts.forecast15.inForecast)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saídas previstas:</span>
                <span className="text-red-600 font-medium">-{formatBRL(forecasts.forecast15.outForecast)}</span>
              </div>
            </div>
          </div>

          {/* 30 Dias */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Próximos 30 Dias
            </span>
            <div className={`text-xl font-bold tracking-tight mb-2 ${
              forecasts.forecast30.projected < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'
            }`}>
              {formatBRL(forecasts.forecast30.projected)}
            </div>
            <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span>Entradas estimadas:</span>
                <span className="text-emerald-600 font-medium">+{formatBRL(forecasts.forecast30.inForecast)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saídas previstas:</span>
                <span className="text-red-600 font-medium">-{formatBRL(forecasts.forecast30.outForecast)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Comparativo 6 Meses: Receitas vs Despesas */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolução Semestral: Receitas vs Despesas
              </h3>
              <p className="text-xs text-slate-500">Histórico real dos lançamentos nos últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500" /> Despesas
              </span>
            </div>
          </div>

          {/* Gráfico de Barras Responsivo */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
            {charts.last6Months.map((m) => {
              const revPercent = Math.min(100, Math.max(5, (m.revenues / maxMonthVal) * 100));
              const expPercent = Math.min(100, Math.max(5, (m.expenses / maxMonthVal) * 100));

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                    <div>Rec: {formatBRL(m.revenues)}</div>
                    <div>Desp: {formatBRL(m.expenses)}</div>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Barra Receitas */}
                    <div
                      style={{ height: `${revPercent}%` }}
                      className="w-full max-w-[20px] bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all"
                    />
                    {/* Barra Despesas */}
                    <div
                      style={{ height: `${expPercent}%` }}
                      className="w-full max-w-[20px] bg-red-500 hover:bg-red-400 rounded-t-md transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-2 capitalize">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Despesas por Categoria (Mês)
            </h3>
            <p className="text-xs text-slate-500 mb-4">Onde o dinheiro da empresa está sendo aplicado</p>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {charts.expensesByCategory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhuma despesa registrada este mês.</p>
              ) : (
                charts.expensesByCategory.map((cat) => {
                  const totalExp = kpis.monthExpenses || 1;
                  const pct = Math.round((cat.amount / totalExp) * 100);

                  return (
                    <div key={cat.categoryId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{cat.name}</span>
                        <span className="text-slate-500">{formatBRL(cat.amount)} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="w-full py-2 mt-4 text-xs font-semibold text-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer"
          >
            Ver Demonstrativo Completo (DRE) &rarr;
          </button>
        </div>
      </div>

      {/* Próximos Vencimentos de Contas a Pagar e Receber */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos a Pagar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-red-500" />
              Próximas Contas a Pagar
            </h3>
            <button onClick={() => onNavigate('payables')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Ver todas ({upcoming.payables.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.payables.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma conta pendente para os próximos dias.</p>
            ) : (
              upcoming.payables.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{p.description}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.supplierName} &bull; Vence em: {formatDateBR(p.dueDate)}
                    </div>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatBRL(p.remainingAmount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Próximos a Receber */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              Próximos Valores a Receber
            </h3>
            <button onClick={() => onNavigate('receivables')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Ver todas ({upcoming.receivables.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.receivables.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum recebível pendente para os próximos dias.</p>
            ) : (
              upcoming.receivables.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{r.description}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.clientName} &bull; Vence em: {formatDateBR(r.dueDate)}
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(r.remainingAmount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
