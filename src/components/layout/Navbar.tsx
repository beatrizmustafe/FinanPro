import React, { useState } from 'react';
import { Company, User, Alert } from '../../types';
import { Building2, ChevronDown, Bell, Sun, Moon, LogOut, Plus, Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Check, RefreshCw, Database } from 'lucide-react';

interface NavbarProps {
  user: User;
  companies: Company[];
  activeCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  onOpenNewCompany: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  alerts: Alert[];
  onOpenAlertsModal: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
  onOpenBackup?: () => void;
}

export function Navbar({
  user,
  companies,
  activeCompany,
  onSelectCompany,
  onOpenNewCompany,
  onLogout,
  darkMode,
  onToggleDarkMode,
  alerts,
  onOpenAlertsModal,
  onSeedDemo,
  isSeeding,
  onOpenBackup,
}: NavbarProps) {
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const criticalCount = alerts.filter((a) => a.priority === 'critica').length;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Esquerda: Seletor de Empresa */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => { setShowCompanyMenu(!showCompanyMenu); setShowUserMenu(false); setShowAlertsDropdown(false); }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {activeCompany ? activeCompany.tradeName.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="text-left hidden sm:block max-w-[200px]">
              <div className="text-xs font-bold truncate">
                {activeCompany ? activeCompany.tradeName : 'Selecionar Empresa'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {activeCompany?.document || 'Nenhuma ativa'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown de Empresas */}
          {showCompanyMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Suas Empresas
              </div>
              <div className="max-h-60 overflow-y-auto">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCompany(c);
                      setShowCompanyMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                      activeCompany?.id === c.id ? 'bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="truncate">{c.tradeName || c.legalName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.document}</div>
                    </div>
                    {activeCompany?.id === c.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    onOpenNewCompany();
                    setShowCompanyMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Nova Empresa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Badge da Permissão */}
        {activeCompany?.userRole && (
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {activeCompany.userRole}
          </span>
        )}
      </div>

      {/* Direita: Ações, Alertas, Tema, Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botão Gerar Dados de Demonstração */}
        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          title="Carregar cenário empresarial completo de demonstração"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shadow-xs"
        >
          {isSeeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
          <span>{isSeeding ? 'Carregando...' : 'Carregar Dados Demo'}</span>
        </button>

        {/* Alternador de Tema Escuro / Claro */}
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notificações de Alertas Automáticos */}
        <div className="relative">
          <button
            onClick={() => { setShowAlertsDropdown(!showAlertsDropdown); setShowCompanyMenu(false); setShowUserMenu(false); }}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors relative cursor-pointer"
            title="Alertas Financeiros"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse ${
                criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'
              }`}>
                {alerts.length}
              </span>
            )}
          </button>

          {/* Dropdown de Alertas Rápidos */}
          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Alertas Financeiros Automáticos</span>
                </div>
                <span className="text-[11px] text-slate-400">{alerts.length} ativo(s)</span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    Finanças em dia! Nenhum alerta crítico detectado no momento.
                  </div>
                ) : (
                  alerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start gap-2">
                        {alert.priority === 'critica' ? (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                            {alert.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => {
                    onOpenAlertsModal();
                    setShowAlertsDropdown(false);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Ver Central de Alertas e Ações Recomendadas →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Perfil do Usuário e Logout */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowCompanyMenu(false); setShowAlertsDropdown(false); }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-semibold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{user.name}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
              </div>

              {onOpenBackup && (
                <button
                  onClick={() => {
                    onOpenBackup();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Backup e Segurança
                </button>
              )}

              <button
                onClick={() => {
                  onLogout();
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 font-medium cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800 mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
