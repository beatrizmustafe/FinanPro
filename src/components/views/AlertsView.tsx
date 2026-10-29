import React from 'react';
import { apiRequest } from '../../lib/api';
import { Alert, Company } from '../../types';
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AlertsViewProps {
  company: Company;
  alerts: Alert[];
  onRefreshAlerts: () => void;
  onNavigate: (tab: any) => void;
}

export function AlertsView({ company, alerts, onRefreshAlerts, onNavigate }: AlertsViewProps) {
  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/alerts/${id}/read`, { method: 'POST' });
      onRefreshAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/api/alerts/read-all', { method: 'POST' });
      onRefreshAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const mapLinkToTab = (link: string) => {
    if (link.includes('pagar')) return 'payables';
    if (link.includes('receber')) return 'receivables';
    if (link.includes('caixa')) return 'cash-flow';
    if (link.includes('faturamento')) return 'sales';
    if (link.includes('contas-financeiras')) return 'accounts';
    return 'dashboard';
  };

  const unreadAlerts = alerts.filter((a) => !a.isRead);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Central de Alertas Financeiros Automáticos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoramento preditivo de liquidez, risco de saldo negativo, inadimplência e metas financeiras
          </p>
        </div>

        {unreadAlerts.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
            Marcar Todos como Lidos
          </button>
        )}
      </div>

      {/* Regras Ativas Informativo */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-900 dark:text-blue-200">
        <div className="font-bold flex items-center gap-1.5 mb-1">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          8 Regras Financeiras Monitoradas Continuamente:
        </div>
        <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
          1. Saldo negativo &bull; 2. Risco de saldo negativo nos próximos 7 dias &bull; 3. Contas vencidas &bull; 4. Vencimentos em 3 dias &bull; 5. Recebimentos atrasados &bull; 6. Despesas elevadas &bull; 7. Queda no faturamento &bull; 8. Baixa liquidez imediata.
        </p>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Tudo sob controle!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nenhuma anomalia financeira ou risco de liquidez detectado para a empresa {company.tradeName}.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all ${
                alert.priority === 'critica'
                  ? 'border-red-200 dark:border-red-900/60 hover:border-red-400'
                  : alert.priority === 'atencao'
                  ? 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                  : 'border-blue-200 dark:border-blue-900/60'
              } ${alert.isRead ? 'opacity-70' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    alert.priority === 'critica'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600'
                      : alert.priority === 'atencao'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                  }`}>
                    {alert.priority === 'critica' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : alert.priority === 'atencao' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        alert.priority === 'critica'
                          ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                          : alert.priority === 'atencao'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}>
                        {alert.priority.toUpperCase()}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{alert.title}</h3>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {alert.description}
                    </p>

                    {/* Ação Recomendada */}
                    {alert.recommendedAction && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                          💡 Ação Recomendada pelo Sistema:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">{alert.recommendedAction}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => onNavigate(mapLinkToTab(alert.link))}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    Acessar Módulo <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {!alert.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline cursor-pointer"
                    >
                      Marcar como lido
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
