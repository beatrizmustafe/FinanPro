import React from 'react';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  TrendingUp,
  Receipt,
  Users,
  Building,
  Landmark,
  FileBarChart,
  Bell,
  Settings,
  Shield,
  X,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'payables'
  | 'receivables'
  | 'transactions'
  | 'cash-flow'
  | 'sales'
  | 'clients'
  | 'suppliers'
  | 'accounts'
  | 'reports'
  | 'alerts'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  alertsCount: number;
}

export function Sidebar({ currentTab, onSelectTab, isOpen, onCloseMobile, alertsCount }: SidebarProps) {
  const navItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payables', label: 'Contas a Pagar', icon: ArrowDownCircle },
    { id: 'receivables', label: 'Contas a Receber', icon: ArrowUpCircle },
    { id: 'transactions', label: 'Receitas e Despesas', icon: ArrowLeftRight },
    { id: 'cash-flow', label: 'Fluxo de Caixa', icon: TrendingUp },
    { id: 'sales', label: 'Faturamento & Vendas', icon: Receipt },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Fornecedores', icon: Building },
    { id: 'accounts', label: 'Contas Financeiras', icon: Landmark },
    { id: 'reports', label: 'Relatórios Gerenciais', icon: FileBarChart },
    { id: 'alerts', label: 'Alertas Automáticos', icon: Bell, badge: alertsCount },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ease-in-out md:translate-x-0 md:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header da Barra Lateral */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Finan<span className="text-blue-500">Pro</span>
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
                Gestão Empresarial
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Módulos Financeiros
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          FinanPro Enterprise &bull; 2026
        </div>
      </aside>
    </>
  );
}
