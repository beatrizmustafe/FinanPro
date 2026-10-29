/**
 * Utilitários de validação e cálculos com precisão financeira para o FinanPro
 */

/**
 * Validação real de CPF com algoritmo dos dígitos verificadores (Módulo 11)
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;

  // Elimina sequências conhecidas de dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9), 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação real de CNPJ com algoritmo dos dígitos verificadores (Módulo 11)
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;

  // Elimina sequências conhecidas de dígitos iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  // Primeiro dígito verificador
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  // Segundo dígito verificador
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

/**
 * Valida documento brasileiro (CPF ou CNPJ)
 */
export function validateDocument(doc: string, type?: 'CPF' | 'CNPJ'): { valid: boolean; formatted: string; type: 'CPF' | 'CNPJ' | 'UNKNOWN' } {
  const clean = (doc || '').replace(/\D/g, '');
  if (clean.length === 11) {
    const valid = validateCPF(clean);
    const formatted = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return { valid, formatted, type: 'CPF' };
  } else if (clean.length === 14) {
    const valid = validateCNPJ(clean);
    const formatted = clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return { valid, formatted, type: 'CNPJ' };
  }
  return { valid: false, formatted: doc, type: 'UNKNOWN' };
}

/**
 * Arredondamento monetário seguro com 2 casas decimais usando centavos inteiros
 */
export function roundCurrency(val: number): number {
  if (isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Formata moeda para padrão brasileiro R$ 1.234,56
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}

/**
 * Formata data ISO para padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
