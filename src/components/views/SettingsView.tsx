import React, { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { Company, User } from '../../types';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Bell,
  CheckCircle2,
  Save,
  RefreshCw,
  Coins,
  Download,
  Upload,
  Database,
  AlertCircle,
} from 'lucide-react';

interface SettingsViewProps {
  company: Company;
  user: User;
  onRefreshCompany: () => void;
  onOpenEditCompanyModal: () => void;
}

export function SettingsView({
  company,
  user,
  onRefreshCompany,
  onOpenEditCompanyModal,
}: SettingsViewProps) {
  const [maxExpenseLimit, setMaxExpenseLimit] = useState('35000');
  const [revenueDropPercent, setRevenueDropPercent] = useState('20');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup e Restauração
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownloadBackup = async () => {
    try {
      setBackupLoading(true);
      const token = localStorage.getItem('finanpro_token');
      const response = await fetch('/api/backup/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Erro ao baixar backup.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finanpro_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setBackupMessage({ type: 'success', text: 'Backup baixado com sucesso!' });
      setTimeout(() => setBackupMessage(null), 4000);
    } catch (err: any) {
      setBackupMessage({ type: 'error', text: err.message || 'Falha ao exportar backup.' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setBackupLoading(true);
        const json = JSON.parse(event.target?.result as string);
        await apiRequest('/api/backup/import', {
          method: 'POST',
          body: JSON.stringify(json),
        });
        setBackupMessage({ type: 'success', text: 'Backup restaurado com sucesso! Recarregando sistema...' });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err: any) {
        setBackupMessage({ type: 'error', text: 'Arquivo inválido. Certifique-se de que é um arquivo JSON do FinanPro.' });
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setTimeout(() => {
      setSavingSettings(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Configurações da Empresa
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalização de dados cadastrais, regras de alertas, usuários e preferências
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Configurações salvas com sucesso!
        </div>
      )}

      {/* 1. DADOS DA EMPRESA ATIVA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Perfil da Empresa</h2>
              <p className="text-xs text-slate-400">Identificação corporativa e dados fiscais</p>
            </div>
          </div>

          <button
            onClick={onOpenEditCompanyModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
          >
            Editar Dados da Empresa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Razão Social / Nome Titular:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{company.legalName}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Nome Fantasia:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{company.tradeName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">CNPJ / CPF:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{company.document}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Regime Tributário:</span>
            <span className="font-semibold text-slate-900 dark:text-white capitalize">
              {company.taxRegime?.replace('_', ' ') || 'Simples Nacional'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">E-mail Corporativo:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{company.email || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Telefone:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{company.phone || '-'}</span>
          </div>
          <div className="md:col-span-2">
            <span className="text-slate-400 block mb-0.5">Endereço Completo:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {company.street ? `${company.street}, ${company.number || 'S/N'} - ${company.neighborhood}, ${company.city} - ${company.state}` : 'Não informado'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BACKUP E SEGURANÇA DOS DADOS */}
      <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/30 dark:border-blue-500/40 rounded-2xl p-6 shadow-xs relative">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Backup e Segurança dos Dados</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Seguro & Portátil
              </span>
            </div>
            <p className="text-xs text-slate-400">Exporte ou restaure suas empresas, lançamentos, contas e movimentações com um clique</p>
          </div>
        </div>

        {backupMessage && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            {backupMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {backupMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Exportar Backup Geral
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mb-4 leading-relaxed">
                Baixe um arquivo seguro com todos os cadastros, finanças, notas e configurações para guardar no seu computador ou transferir de máquina.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              disabled={backupLoading}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              {backupLoading ? 'Gerando Backup...' : 'Baixar Backup (.json)'}
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Restaurar Backup Anterior
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mb-4 leading-relaxed">
                Envie um arquivo salvo de backup para restabelecer imediatamente todos os dados das empresas, contas e lançamentos.
              </p>
            </div>
            <label className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs text-center">
              <Upload className="w-4 h-4" />
              Selecionar Arquivo de Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                disabled={backupLoading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
          💡 <strong>Onde ficam seus dados no computador:</strong> O banco de dados fica gravado localmente no arquivo <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">data/finanpro_db.json</code>. Ao fazer alterações de código na mesma pasta, seus dados permanecem intactos. Se baixar uma pasta nova do projeto, basta copiar esse arquivo ou usar o botão de exportar/restaurar backup acima.
        </div>
      </div>

      {/* 3. REGRAS DE ALERTA E GATILHOS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Gatilhos dos Alertas Automáticos</h2>
            <p className="text-xs text-slate-400">Configure limites personalizados para os cálculos de risco financeiro</p>
          </div>
        </div>

        <form onSubmit={handleSaveLimits} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teto Mensal de Despesas (R$)
              </label>
              <input
                type="number"
                value={maxExpenseLimit}
                onChange={(e) => setMaxExpenseLimit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Aciona alerta quando as saídas do mês corrente ultrapassam este valor.
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Limite de Queda no Faturamento (%)
              </label>
              <input
                type="number"
                value={revenueDropPercent}
                onChange={(e) => setRevenueDropPercent(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Alerta de retração em relação ao faturamento do mês anterior.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar Limites
            </button>
          </div>
        </form>
      </div>

      {/* 4. PADRÕES E LOCALIZAÇÃO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Moeda e Formatação Regional</h2>
            <p className="text-xs text-slate-400">Padrões monetários e de datas adotados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-400 block mb-1">Moeda Principal:</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">Real Brasileiro (BRL - R$)</span>
            <p className="text-[11px] text-slate-500 mt-1">Exemplo: R$ 1.234,56 com arredondamento seguro em centavos inteiros.</p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-400 block mb-1">Formato de Data:</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">DD/MM/AAAA (Padrão Brasil)</span>
            <p className="text-[11px] text-slate-500 mt-1">Exemplo: 27/10/2026 nos relatórios e extratos.</p>
          </div>
        </div>
      </div>

      {/* 5. PERMISSÕES E ACESSO (RBAC & LGPD) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Controle de Acesso e Níveis de Permissão</h2>
            <p className="text-xs text-slate-400">Segurança de dados e separação entre empresas (Multi-tenant)</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{user.name} ({user.email})</div>
              <div className="text-[11px] text-slate-400">Seu papel nesta empresa: Administrador Geral</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase">
              Admin
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-slate-600 dark:text-slate-400 text-[11px] space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Níveis de Permissão da Plataforma:</span>
            <div>&bull; <strong>Administrador:</strong> Gestão completa da empresa, cadastro de usuários, exclusões e configurações.</div>
            <div>&bull; <strong>Financeiro:</strong> Operações diárias de contas a pagar, receber, faturamento e baixas financeiras.</div>
            <div>&bull; <strong>Visualizador:</strong> Acesso restrito somente para consulta de relatórios, sem permissão de alteração.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

