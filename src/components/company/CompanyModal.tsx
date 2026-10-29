import React, { useState, useEffect } from 'react';
import { apiRequest, validateCPF, validateCNPJ, formatDocInput } from '../../lib/api';
import { Company } from '../../types';
import { Building2, X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company: Company) => void;
  editingCompany?: Company | null;
}

export function CompanyModal({ isOpen, onClose, onSuccess, editingCompany }: CompanyModalProps) {
  if (!isOpen) return null;

  const [type, setType] = useState<'PJ' | 'PF'>(editingCompany?.type || 'PJ');
  const [legalName, setLegalName] = useState(editingCompany?.legalName || '');
  const [tradeName, setTradeName] = useState(editingCompany?.tradeName || '');
  const [document, setDocument] = useState(editingCompany?.document || '');
  const [email, setEmail] = useState(editingCompany?.email || '');
  const [phone, setPhone] = useState(editingCompany?.phone || '');
  const [cep, setCep] = useState(editingCompany?.cep || '');
  const [state, setState] = useState(editingCompany?.state || 'SP');
  const [city, setCity] = useState(editingCompany?.city || '');
  const [neighborhood, setNeighborhood] = useState(editingCompany?.neighborhood || '');
  const [street, setStreet] = useState(editingCompany?.street || '');
  const [number, setNumber] = useState(editingCompany?.number || '');
  const [complement, setComplement] = useState(editingCompany?.complement || '');
  const [taxRegime, setTaxRegime] = useState(editingCompany?.taxRegime || 'simples_nacional');

  const [docValid, setDocValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCompany) {
      setType(editingCompany.type);
      setLegalName(editingCompany.legalName);
      setTradeName(editingCompany.tradeName);
      setDocument(editingCompany.document);
      setEmail(editingCompany.email);
      setPhone(editingCompany.phone);
      setCep(editingCompany.cep);
      setState(editingCompany.state);
      setCity(editingCompany.city);
      setNeighborhood(editingCompany.neighborhood);
      setStreet(editingCompany.street);
      setNumber(editingCompany.number);
      setComplement(editingCompany.complement || '');
      setTaxRegime(editingCompany.taxRegime || 'simples_nacional');
      setDocValid(true);
    }
  }, [editingCompany]);

  const handleDocChange = (val: string) => {
    const formatted = formatDocInput(val);
    setDocument(formatted);
    const clean = val.replace(/\D/g, '');
    if (type === 'PJ' && clean.length === 14) {
      setDocValid(validateCNPJ(clean));
    } else if (type === 'PF' && clean.length === 11) {
      setDocValid(validateCPF(clean));
    } else {
      setDocValid(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = document.replace(/\D/g, '');
    const isValid = type === 'PJ' ? validateCNPJ(clean) : validateCPF(clean);

    if (!isValid) {
      setError(`O ${type === 'PJ' ? 'CNPJ' : 'CPF'} informado não é válido. Verifique os dígitos verificadores.`);
      return;
    }

    setLoading(true);
    try {
      if (editingCompany) {
        const res = await apiRequest(`/api/companies/${editingCompany.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            legalName,
            tradeName,
            document,
            email,
            phone,
            cep,
            state,
            city,
            neighborhood,
            street,
            number,
            complement,
            taxRegime,
          }),
        });
        onSuccess(res.company);
      } else {
        const res = await apiRequest('/api/companies', {
          method: 'POST',
          body: JSON.stringify({
            type,
            legalName,
            tradeName,
            document,
            email,
            phone,
            cep,
            state,
            city,
            neighborhood,
            street,
            number,
            complement,
            taxRegime,
          }),
        });
        onSuccess(res.company);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preencha os dados cadastrais e fiscais da organização
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo de Cadastro */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Cadastro *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setType('PJ'); setDocValid(null); }}
                className={`py-2 px-4 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'PJ'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Pessoa Jurídica (CNPJ)
              </button>
              <button
                type="button"
                onClick={() => { setType('PF'); setDocValid(null); }}
                className={`py-2 px-4 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'PF'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Pessoa Física / Autônomo (CPF)
              </button>
            </div>
          </div>

          {/* Nome e Documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {type === 'PJ' ? 'Razão Social *' : 'Nome Completo do Titular *'}
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder={type === 'PJ' ? 'Ex: Alpha Serviços Tecnológicos Ltda' : 'Ex: João da Silva'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome Fantasia {type === 'PJ' ? '' : '(Opcional)'}
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Ex: Alpha Tech"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {type === 'PJ' ? 'CNPJ *' : 'CPF *'}
                </label>
                {docValid === true && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Válido
                  </span>
                )}
                {docValid === false && (
                  <span className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Inválido
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={document}
                onChange={(e) => handleDocChange(e.target.value)}
                placeholder={type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none ${
                  docValid === false
                    ? 'border-red-500 ring-1 ring-red-500'
                    : docValid === true
                    ? 'border-emerald-500 ring-1 ring-emerald-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Regime Tributário
              </label>
              <select
                value={taxRegime}
                onChange={(e) => setTaxRegime(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="simples_nacional">Simples Nacional</option>
                <option value="mei">MEI (Microempreendedor Individual)</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
              </select>
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail Financeiro / Contato
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="financeiro@empresa.com.br"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
              Endereço da Empresa
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white uppercase"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Logradouro / Rua</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Paulista"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bela Vista"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
