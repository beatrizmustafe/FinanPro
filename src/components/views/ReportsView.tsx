import React, { useState, useEffect } from 'react';
import { apiRequest, formatBRL, formatDateBR, exportToExcel, exportToPDF } from '../../lib/api';
import { Company } from '../../types';
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface ReportsViewProps {
  company: Company;
}

export function ReportsView({ company }: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<'dre' | 'inadimplencia'>('dre');
  const [loading, setLoading] = useState(true);

  // Filtros DRE
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dreData, setDreData] = useState<any>(null);

  // Inadimplência
  const [delinquencyData, setDelinquencyData] = useState<any>(null);

  const fetchDRE = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      const data = await apiRequest(`/api/reports/dre?${q.toString()}`);
      setDreData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDelinquency = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/reports/delinquency');
      setDelinquencyData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'dre') {
      fetchDRE();
    } else {
      fetchDelinquency();
    }
  }, [company.id, activeReport]);

  const handleExportDREExcel = () => {
    if (!dreData) return;
    const rows = [
      { Rubrica: '1. Receita Bruta de Vendas', Valor: dreData.grossSales },
      { Rubrica: '(-) Deduções e Descontos Concedidos', Valor: -dreData.salesDiscounts },
      { Rubrica: '= Receita Líquida de Vendas', Valor: dreData.netSales },
      { Rubrica: '(+) Outras Receitas Operacionais', Valor: dreData.otherRevenues },
      { Rubrica: '= RECEITA OPERACIONAL TOTAL', Valor: dreData.totalOperationalRevenue },
      ...dreData.categoryBreakdown.map((cat: any) => ({
        Rubrica: `(-) Despesa: ${cat.name}`,
        Valor: -cat.amount,
      })),
      { Rubrica: '= TOTAL DE DESPESAS OPERACIONAIS', Valor: -dreData.totalExpenses },
      { Rubrica: '= RESULTADO OPERACIONAL LÍQUIDO', Valor: dreData.netOperatingResult },
    ];
    exportToExcel(rows, `FinanPro_DRE_Gerencial_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportDREPDF = () => {
    if (!dreData) return;
    const headers = ['Estrutura da Demonstração (DRE Gerencial)', 'Valor (R$)'];
    const rows = [
      ['1. Receita Bruta de Vendas', formatBRL(dreData.grossSales)],
      ['(-) Deduções e Descontos Concedidos', `-${formatBRL(dreData.salesDiscounts)}`],
      ['= Receita Líquida de Vendas', formatBRL(dreData.netSales)],
      ['(+) Outras Receitas Operacionais', `+${formatBRL(dreData.otherRevenues)}`],
      ['= TOTAL DE RECEITA OPERACIONAL', formatBRL(dreData.totalOperationalRevenue)],
      ...dreData.categoryBreakdown.map((cat: any) => [
        `(-) Despesa: ${cat.name}`,
        `-${formatBRL(cat.amount)}`,
      ]),
      ['= TOTAL DE DESPESAS OPERACIONAIS', `-${formatBRL(dreData.totalExpenses)}`],
      ['= RESULTADO OPERACIONAL LÍQUIDO DO PERÍODO', formatBRL(dreData.netOperatingResult)],
    ];
    exportToPDF('Demonstrativo do Resultado do Exercício (Gerencial)', headers, rows, 'DRE_Gerencial');
  };

  const handleExportDelinquencyExcel = () => {
    if (!delinquencyData) return;
    const rows = delinquencyData.items.map((it: any) => ({
      Cliente: it.clientName,
      'Telefone / WhatsApp': it.clientPhone,
      'E-mail': it.clientEmail,
      'Valor Pendente': it.remainingAmount,
      Vencimento: formatDateBR(it.dueDate),
      'Dias em Atraso': it.daysOverdue,
    }));
    exportToExcel(rows, `FinanPro_Relatorio_Inadimplencia_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportDelinquencyPDF = () => {
    if (!delinquencyData) return;
    const headers = ['Cliente', 'Contato', 'Vencimento', 'Atraso (Dias)', 'Valor Devido'];
    const rows = delinquencyData.items.map((it: any) => [
      it.clientName,
      it.clientPhone || it.clientEmail || '-',
      formatDateBR(it.dueDate),
      `${it.daysOverdue} dias`,
      formatBRL(it.remainingAmount),
    ]);
    exportToPDF('Relatório de Inadimplência de Clientes', headers, rows, 'Relatorio_Inadimplencia');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Relatórios Financeiros Gerenciais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            DRE gerencial, demonstrativo de receitas e despesas, controle de inadimplência e exportações
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeReport === 'dre' ? (
            <>
              <button
                onClick={handleExportDREExcel}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Excel DRE
              </button>
              <button
                onClick={handleExportDREPDF}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-red-600" />
                PDF DRE
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExportDelinquencyExcel}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Excel Inadimplência
              </button>
              <button
                onClick={handleExportDelinquencyPDF}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-red-600" />
                PDF Inadimplência
              </button>
            </>
          )}
        </div>
      </div>

      {/* Seletor de Tipo de Relatório */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveReport('dre')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
            activeReport === 'dre'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Demonstrativo do Resultado do Exercício (DRE Gerencial)
        </button>
        <button
          onClick={() => setActiveReport('inadimplencia')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
            activeReport === 'inadimplencia'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Relatório de Inadimplência de Clientes
        </button>
      </div>

      {/* RELATÓRIO 1: DRE GERENCIAL */}
      {activeReport === 'dre' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Filtrar Competência:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
            />
            <button
              onClick={fetchDRE}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold cursor-pointer shadow-xs"
            >
              Atualizar DRE
            </button>
          </div>

          {loading || !dreData ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Calculando demonstrativo gerencial...
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden p-6">
              <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {company.legalName}
                </h2>
                <p className="text-xs text-slate-500">
                  DRE Gerencial do Período ({formatDateBR(dreData.period.start)} a {formatDateBR(dreData.period.end)})
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-3 text-xs">
                {/* Receitas */}
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">1. Receita Bruta de Vendas</span>
                  <span className="text-slate-900 dark:text-white">{formatBRL(dreData.grossSales)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-500 pl-4">
                  <span>(-) Deduções da Receita / Descontos Concedidos</span>
                  <span className="text-red-500">-{formatBRL(dreData.salesDiscounts)}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800/40 px-3 rounded-lg">
                  <span className="text-slate-900 dark:text-white">= Receita Líquida de Vendas</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatBRL(dreData.netSales)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-500 pl-4">
                  <span>(+) Outras Receitas Operacionais</span>
                  <span className="text-emerald-600">+{formatBRL(dreData.otherRevenues)}</span>
                </div>

                <div className="flex justify-between py-2 border-b-2 border-slate-200 dark:border-slate-700 font-bold bg-blue-50/50 dark:bg-blue-950/30 px-3 rounded-lg">
                  <span className="text-blue-900 dark:text-blue-200">= RECEITA OPERACIONAL TOTAL</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatBRL(dreData.totalOperationalRevenue)}</span>
                </div>

                {/* Despesas por Categoria */}
                <div className="pt-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
                    2. Despesas Operacionais e Custos
                  </span>

                  <div className="space-y-1.5 pl-4">
                    {dreData.categoryBreakdown.map((cat: any) => (
                      <div key={cat.categoryId} className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                        <span>(-) {cat.name}</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">-{formatBRL(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800/40 px-3 rounded-lg">
                  <span className="text-slate-900 dark:text-white">= Total de Despesas Operacionais</span>
                  <span className="text-red-600 dark:text-red-400">-{formatBRL(dreData.totalExpenses)}</span>
                </div>

                {/* Resultado Líquido Final */}
                <div className="flex justify-between py-3 border-t-2 border-slate-900 dark:border-white font-bold text-sm bg-slate-100 dark:bg-slate-800 px-4 rounded-xl mt-4">
                  <span className="text-slate-900 dark:text-white uppercase tracking-wider">
                    = RESULTADO OPERACIONAL LÍQUIDO DO EXERCÍCIO
                  </span>
                  <span className={dreData.netOperatingResult >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {formatBRL(dreData.netOperatingResult)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RELATÓRIO 2: INADIMPLÊNCIA */}
      {activeReport === 'inadimplencia' && (
        <div className="space-y-4">
          {loading || !delinquencyData ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Carregando títulos em atraso...
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-red-50/50 dark:bg-red-950/20">
                <div>
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Total Inadimplente: {formatBRL(delinquencyData.totalOverdue)}
                  </h3>
                  <p className="text-xs text-slate-500">{delinquencyData.count} título(s) com prazo de vencimento expirado</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">Cliente</th>
                      <th className="py-3 px-4 font-semibold">Contato / Telefone</th>
                      <th className="py-3 px-4 font-semibold">Vencimento</th>
                      <th className="py-3 px-4 font-semibold text-center">Dias de Atraso</th>
                      <th className="py-3 px-4 font-semibold text-right">Valor em Aberto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {delinquencyData.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Nenhum cliente inadimplente no momento! Finanças em dia.
                        </td>
                      </tr>
                    ) : (
                      delinquencyData.items.map((it: any) => (
                        <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{it.clientName}</td>
                          <td className="py-3 px-4 text-slate-500">{it.clientPhone || it.clientEmail || '-'}</td>
                          <td className="py-3 px-4 font-mono">{formatDateBR(it.dueDate)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              {it.daysOverdue} dias
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">
                            {formatBRL(it.remainingAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
