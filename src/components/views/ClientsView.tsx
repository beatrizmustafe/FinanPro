import React, { useState, useEffect } from 'react';
import { apiRequest, validateCPF, validateCNPJ, formatDocInput, formatBRL, formatDateBR } from '../../lib/api';
import { Client, Company } from '../../types';
import { Plus, Search, UserCheck, Phone, Mail, MapPin, X, Trash2, Edit3, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface ClientsViewProps {
  company: Company;
  onRefresh: () => void;
}

export function ClientsView({ company, onRefresh }: ClientsViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewHistoryClient, setViewHistoryClient] = useState<any | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Form
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Client[]>('/api/clients');
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [company.id]);

  const openCreate = () => {
    setEditingClient(null);
    setName('');
    setTradeName('');
    setDocument('');
    setEmail('');
    setPhone('');
    setCity('');
    setState('SP');
    setAddress('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (cli: Client) => {
    setEditingClient(cli);
    setName(cli.name);
    setTradeName(cli.tradeName || '');
    setDocument(cli.document);
    setEmail(cli.email);
    setPhone(cli.phone);
    setCity(cli.city || '');
    setState(cli.state || 'SP');
    setAddress(cli.address || '');
    setNotes(cli.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const clean = document.replace(/\D/g, '');
    const isValid = clean.length === 11 ? validateCPF(clean) : clean.length === 14 ? validateCNPJ(clean) : false;
    if (!isValid) {
      setFormError('CPF ou CNPJ inválido. Verifique os dígitos verificadores.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await apiRequest(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, tradeName, document, email, phone, city, state, address, notes }),
        });
      } else {
        await apiRequest('/api/clients', {
          method: 'POST',
          body: JSON.stringify({ name, tradeName, document, email, phone, city, state, address, notes }),
        });
      }
      setIsModalOpen(false);
      fetchClients();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      await apiRequest(`/api/clients/${clientToDelete.id}`, { method: 'DELETE' });
      setClientToDelete(null);
      fetchClients();
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
    }
  };

  const viewHistory = async (cli: Client) => {
    try {
      const details = await apiRequest(`/api/clients/${cli.id}/details`);
      setViewHistoryClient(details);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.document.includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Base de clientes, contratos, histórico de vendas e contas a receber
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, documento CPF/CNPJ ou e-mail..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Grid de Cartões de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Nenhum cliente cadastrado.
          </div>
        ) : (
          filteredClients.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 truncate">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{c.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">{c.document}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3">
                  {c.email && (
                    <div className="flex items-center gap-2 truncate text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.city} - {c.state}</span>
                    </div>
                  )}
                </div>

                {/* Resumo Financeiro do Cliente */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Faturado:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatBRL(c.totalSales || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Saldo em Aberto:</span>
                    <span className="font-bold text-blue-600">{formatBRL(c.pendingReceivables || 0)}</span>
                  </div>
                  {(c.overdueReceivables || 0) > 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Inadimplente:</span>
                      <span>{formatBRL(c.overdueReceivables || 0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => viewHistory(c)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Histórico
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setClientToDelete(c)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: CRIAR / EDITAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do cliente ou empresa..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">CPF ou CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(formatDocInput(e.target.value))}
                    placeholder="000.000.000-00 ou CNPJ"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail para Faturamento</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="financeiro@cliente.com.br"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DO CLIENTE */}
      {viewHistoryClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Histórico do Cliente: {viewHistoryClient.client.name}
                </h3>
                <p className="text-xs text-slate-500">{viewHistoryClient.client.document}</p>
              </div>
              <button onClick={() => setViewHistoryClient(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Vendas Faturadas</h4>
                {viewHistoryClient.sales?.length === 0 ? (
                  <p className="text-slate-400 py-2">Nenhuma venda faturada para este cliente.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                          <th className="p-2">Nº Venda</th>
                          <th className="p-2">Data</th>
                          <th className="p-2 text-right">Valor Total</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {viewHistoryClient.sales?.map((s: any) => (
                          <tr key={s.id}>
                            <td className="p-2 font-mono">{s.saleNumber}</td>
                            <td className="p-2">{formatDateBR(s.saleDate)}</td>
                            <td className="p-2 text-right font-bold">{formatBRL(s.total)}</td>
                            <td className="p-2 text-center capitalize">{s.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Contas a Receber e Pagamentos</h4>
                {viewHistoryClient.receivables?.length === 0 ? (
                  <p className="text-slate-400 py-2">Nenhum título a receber vinculado.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                          <th className="p-2">Descrição</th>
                          <th className="p-2">Vencimento</th>
                          <th className="p-2 text-right">Valor</th>
                          <th className="p-2 text-right">Saldo</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {viewHistoryClient.receivables?.map((r: any) => (
                          <tr key={r.id}>
                            <td className="p-2 font-medium">{r.description}</td>
                            <td className="p-2">{formatDateBR(r.dueDate)}</td>
                            <td className="p-2 text-right">{formatBRL(r.finalAmount)}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">{formatBRL(r.remainingAmount)}</td>
                            <td className="p-2 text-center capitalize">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={() => setViewHistoryClient(null)}
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
        isOpen={!!clientToDelete}
        title="Remover Cliente"
        message={`Deseja realmente excluir o cliente "${clientToDelete?.name}" (${clientToDelete?.document})? Todo o histórico de lançamentos associados permanecerá auditável.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setClientToDelete(null)}
      />
    </div>
  );
}
