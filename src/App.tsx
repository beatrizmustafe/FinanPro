/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import {
  apiRequest,
  getToken,
  removeToken,
  getActiveCompanyId,
  setActiveCompanyId,
  formatBRL,
} from './lib/api';
import { User, Company, FinancialAccount, Category, Supplier, Client, Alert } from './types';
import { AuthModal } from './components/auth/AuthModal';
import { CompanyModal } from './components/company/CompanyModal';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';

// Telas
import { DashboardView } from './components/views/DashboardView';
import { PayablesView } from './components/views/PayablesView';
import { ReceivablesView } from './components/views/ReceivablesView';
import { TransactionsView } from './components/views/TransactionsView';
import { CashFlowView } from './components/views/CashFlowView';
import { SalesView } from './components/views/SalesView';
import { ClientsView } from './components/views/ClientsView';
import { SuppliersView } from './components/views/SuppliersView';
import { AccountsView } from './components/views/AccountsView';
import { ReportsView } from './components/views/ReportsView';
import { AlertsView } from './components/views/AlertsView';
import { SettingsView } from './components/views/SettingsView';

import { Building2, Sparkles, Plus, RefreshCw, Menu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  // Tema Escuro / Claro
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('finanpro_dark') === 'true';
  });

  // Dados auxiliares compartilhados
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [consolidatedBalance, setConsolidatedBalance] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Modais de Criação Rápida
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Ações diretas disparadas pelo Dashboard
  const [openPayableModal, setOpenPayableModal] = useState(false);
  const [openReceivableModal, setOpenReceivableModal] = useState(false);
  const [openSaleModal, setOpenSaleModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);

  // Aplica classe dark na tag HTML e Body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('finanpro_dark', darkMode ? 'true' : 'false');
  }, [darkMode]);

  // Carrega autenticação inicial
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest<{ user: User; companies: Company[] }>('/api/auth/me');
        setUser(res.user);
        setCompanies(res.companies);

        const storedCompId = getActiveCompanyId();
        const active = res.companies.find((c) => c.id === storedCompId) || res.companies[0] || null;
        if (active) {
          setActiveCompany(active);
          setActiveCompanyId(active.id);
        }
      } catch (err) {
        removeToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Recarrega dados contextuais ao mudar a empresa ativa
  const fetchCompanyData = async () => {
    if (!activeCompany) return;
    try {
      const [accRes, catRes, supRes, cliRes, alertRes] = await Promise.all([
        apiRequest<{ accounts: FinancialAccount[]; consolidatedBalance: number }>('/api/financial-accounts'),
        apiRequest<Category[]>('/api/categories'),
        apiRequest<Supplier[]>('/api/suppliers'),
        apiRequest<Client[]>('/api/clients'),
        apiRequest<{ alerts: Alert[] }>('/api/alerts'),
      ]);

      setAccounts(accRes.accounts);
      setConsolidatedBalance(accRes.consolidatedBalance);
      setCategories(catRes);
      setSuppliers(supRes);
      setClients(cliRes);
      setAlerts(alertRes.alerts);
    } catch (err) {
      console.error('Erro ao buscar dados contextuais da empresa:', err);
    }
  };

  useEffect(() => {
    if (activeCompany) {
      fetchCompanyData();
    }
  }, [activeCompany?.id]);

  const handleAuthSuccess = (loggedUser: User, userCompanies: Company[]) => {
    setUser(loggedUser);
    setCompanies(userCompanies);
    if (userCompanies.length > 0) {
      setActiveCompany(userCompanies[0]);
      setActiveCompanyId(userCompanies[0].id);
    } else {
      setIsCompanyModalOpen(true);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setActiveCompany(null);
    setCompanies([]);
  };

  const handleSelectCompany = (comp: Company) => {
    setActiveCompany(comp);
    setActiveCompanyId(comp.id);
  };

  const handleCompanyCreated = (newComp: Company) => {
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === newComp.id);
      return exists ? prev.map((c) => (c.id === newComp.id ? newComp : c)) : [...prev, newComp];
    });
    setActiveCompany(newComp);
    setActiveCompanyId(newComp.id);
  };

  // Botão Carregar Dados de Exemplo
  const handleSeedDemo = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      const res = await apiRequest('/api/seed/demo', { method: 'POST' });
      const updatedCompanies = await apiRequest<Company[]>('/api/companies');
      setCompanies(updatedCompanies);
      setActiveCompany(res.company);
      setActiveCompanyId(res.company.id);
      setCurrentTab('dashboard');
    } catch (err: any) {
      console.error('Erro ao carregar dados de demonstração:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Iniciando FinanPro...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, exibe tela de login / registro / verificação
  if (!user) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  // Se autenticado, mas nenhuma empresa cadastrada ainda
  if (!activeCompany) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Bem-vindo ao FinanPro, {user.name}!</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Para começar a gerenciar suas finanças empresariais, cadastre os dados da sua empresa ou gere um ambiente completo de demonstração para testar todas as funcionalidades.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => { setEditingCompany(null); setIsCompanyModalOpen(true); }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Minha Empresa
            </button>

            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Carregar Empresa Demo com Dados Reais
            </button>
          </div>

          <button onClick={handleLogout} className="mt-6 text-xs text-slate-400 hover:underline">
            Sair da Conta
          </button>
        </div>

        {isCompanyModalOpen && (
          <CompanyModal
            isOpen={isCompanyModalOpen}
            onClose={() => setIsCompanyModalOpen(false)}
            onSuccess={handleCompanyCreated}
            editingCompany={null}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Barra Lateral Fixa / Drawer */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        alertsCount={alerts.filter((a) => !a.isRead).length}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Navbar
          user={user}
          companies={companies}
          activeCompany={activeCompany}
          onSelectCompany={handleSelectCompany}
          onOpenNewCompany={() => { setEditingCompany(null); setIsCompanyModalOpen(true); }}
          onLogout={handleLogout}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          alerts={alerts}
          onOpenAlertsModal={() => setCurrentTab('alerts')}
          onSeedDemo={handleSeedDemo}
          isSeeding={isSeeding}
          onOpenBackup={() => setCurrentTab('settings')}
        />

        {/* Botão Mobile Hamburger */}
        <div className="md:hidden px-4 pt-3 flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold capitalize text-slate-700 dark:text-slate-300">
            {currentTab.replace('-', ' ')}
          </span>
        </div>

        {/* Área Central da Tela */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              company={activeCompany}
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenNewPayable={() => { setCurrentTab('payables'); setOpenPayableModal(true); }}
              onOpenNewReceivable={() => { setCurrentTab('receivables'); setOpenReceivableModal(true); }}
              onOpenNewSale={() => { setCurrentTab('sales'); setOpenSaleModal(true); }}
              onOpenTransfer={() => { setCurrentTab('accounts'); setOpenTransferModal(true); }}
            />
          )}

          {currentTab === 'payables' && (
            <PayablesView
              company={activeCompany}
              suppliers={suppliers}
              categories={categories}
              accounts={accounts}
              onRefreshBalance={fetchCompanyData}
              openCreateModalDirectly={openPayableModal}
              onCloseCreateModalDirectly={() => setOpenPayableModal(false)}
            />
          )}

          {currentTab === 'receivables' && (
            <ReceivablesView
              company={activeCompany}
              clients={clients}
              categories={categories}
              accounts={accounts}
              onRefreshBalance={fetchCompanyData}
              openCreateModalDirectly={openReceivableModal}
              onCloseCreateModalDirectly={() => setOpenReceivableModal(false)}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              company={activeCompany}
              categories={categories}
              accounts={accounts}
              clients={clients}
              suppliers={suppliers}
              onRefreshBalance={fetchCompanyData}
            />
          )}

          {currentTab === 'cash-flow' && (
            <CashFlowView company={activeCompany} accounts={accounts} />
          )}

          {currentTab === 'sales' && (
            <SalesView
              company={activeCompany}
              clients={clients}
              accounts={accounts}
              categories={categories}
              onRefreshBalance={fetchCompanyData}
              openCreateModalDirectly={openSaleModal}
              onCloseCreateModalDirectly={() => setOpenSaleModal(false)}
            />
          )}

          {currentTab === 'clients' && (
            <ClientsView company={activeCompany} onRefresh={fetchCompanyData} />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersView company={activeCompany} onRefresh={fetchCompanyData} />
          )}

          {currentTab === 'accounts' && (
            <AccountsView
              company={activeCompany}
              accounts={accounts}
              consolidatedBalance={consolidatedBalance}
              onRefresh={fetchCompanyData}
              openTransferModalDirectly={openTransferModal}
              onCloseTransferModalDirectly={() => setOpenTransferModal(false)}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView company={activeCompany} />
          )}

          {currentTab === 'alerts' && (
            <AlertsView
              company={activeCompany}
              alerts={alerts}
              onRefreshAlerts={fetchCompanyData}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              company={activeCompany}
              user={user}
              onRefreshCompany={fetchCompanyData}
              onOpenEditCompanyModal={() => { setEditingCompany(activeCompany); setIsCompanyModalOpen(true); }}
            />
          )}
        </main>
      </div>

      {/* Modal de Cadastro / Edição de Empresa */}
      {isCompanyModalOpen && (
        <CompanyModal
          isOpen={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
          onSuccess={handleCompanyCreated}
          editingCompany={editingCompany}
        />
      )}
    </div>
  );
}
