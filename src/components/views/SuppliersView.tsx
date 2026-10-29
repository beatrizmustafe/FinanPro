import React, { useState, useEffect } from 'react';
import { apiRequest, validateCPF, validateCNPJ, formatDocInput, formatBRL, formatDateBR } from '../../lib/api';
import { Supplier, Company } from '../../types';
import { Plus, Search, Building, Phone, Mail, MapPin, X, Trash2, Edit3, Eye, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface SuppliersViewProps {
  company: Company;
  onRefresh: () => void;
}

export function SuppliersView({ company, onRefresh }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewHistorySupplier, setViewHistorySupplier] = useState<any | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

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

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Supplier[]>('/api/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [company.id]);

  const openCreate = () => {
    setEditingSupplier(null);
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

  const openEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setTradeName(sup.tradeName || '');
    setDocument(sup.document);
    setEmail(sup.email);
    setPhone(sup.phone);
    setCity(sup.city || '');
    setState(sup.state || 'SP');
    setAddress(sup.address || '');
    setNotes(sup.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const clean = document.replace(/\D/g, '');
    const isValid = clean.length === 14 ? validateCNPJ(clean) : clean.length === 11 ? validateCPF(clean) : false;
    if (!isValid) {
      setFormError('CNPJ ou CPF inválido. Verifique os números digitados.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSupplier) {
        await apiRequest(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, tradeName, document, email, phone, city, state, address, notes }),
        });
      } else {
        await apiRequest('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify({ name, tradeName, document, email, phone, city, state, address, notes }),
        });
      }
      setIsModalOpen(false);
      fetchSuppliers();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await apiRequest(`/api/suppliers/${supplierToDelete.id}`, { method: 'DELETE' });
      setSupplierToDelete(null);
      fetchSuppliers();
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir fornecedor:', err);
    }
  };

  const viewHistory = async (sup: Supplier) => {
    try {
      const details = await apiRequest(`/api/suppliers/${sup.id}/details`);
      setViewHistorySupplier(details);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.document.includes(search) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fornecedores</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Parceiros comerciais, compras efetuadas e histórico de obrigações
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
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
            placeholder="Pesquisar por razão social, CNPJ ou e-mail..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Grid de Cartões de Fornecedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Nenhum fornecedor cadastrado.
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="flex-1 truncate">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{s.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">{s.document}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3">
                  {s.email && (
                    <div className="flex items-center gap-2 truncate text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.city && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.city} - {s.state}</span>
                    </div>
                  )}
                </div>

                {/* Resumo Financeiro */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total de Despesas:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatBRL(s.totalPurchased || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Pago:</span>
                    <span className="font-bold text-emerald-600">{formatBRL(s.totalPaid || 0)}</span>
                  </div>
                  {(s.pendingAmount || 0) > 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Pendente a Pagar:</span>
                      <span>{formatBRL(s.pendingAmount || 0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => viewHistory(s)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Histórico
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSupplierToDelete(s)}
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

      {/* MODAL: CRIAR / EDITAR FORNECEDOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Razão Social / Nome *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do fornecedor ou prestador..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">CNPJ ou CPF *</label>
                  <input
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(formatDocInput(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 3456-7890"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail de Contato</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="comercial@fornecedor.com.br"
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
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DO FORNECEDOR */}
      {viewHistorySupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Histórico: {viewHistorySupplier.supplier.name}
                </h3>
                <p className="text-xs text-slate-500">{viewHistorySupplier.supplier.document}</p>
              </div>
              <button onClick={() => setViewHistorySupplier(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 text-xs">Contas a Pagar ao Fornecedor</h4>
              {viewHistorySupplier.payables?.length === 0 ? (
                <p className="text-slate-400 py-2 text-xs">Nenhuma conta cadastrada para este fornecedor.</p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                      <tr>
                        <th className="p-2">Descrição</th>
                        <th className="p-2">Vencimento</th>
                        <th className="p-2 text-right">Valor</th>
                        <th className="p-2 text-right">Pago</th>
                        <th className="p-2 text-right">Saldo Devedor</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewHistorySupplier.payables?.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 font-medium">{p.description}</td>
                          <td className="p-2">{formatDateBR(p.dueDate)}</td>
                          <td className="p-2 text-right">{formatBRL(p.finalAmount)}</td>
                          <td className="p-2 text-right text-emerald-600">{formatBRL(p.paidAmount)}</td>
                          <td className="p-2 text-right font-bold text-red-600">{formatBRL(p.remainingAmount)}</td>
                          <td className="p-2 text-center capitalize">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={() => setViewHistorySupplier(null)}
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
        isOpen={!!supplierToDelete}
        title="Remover Fornecedor"
        message={`Deseja realmente excluir o fornecedor "${supplierToDelete?.name}" (${supplierToDelete?.document})? O histórico de despesas e compras permanecerá auditável.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
}
