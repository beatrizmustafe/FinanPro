/**
 * Motor de Avaliação de Alertas Financeiros Automáticos
 * Avalia regras financeiras reais com base nos dados persistidos da empresa
 */
import { db, Alert } from './db.js';
import { formatBRL, roundCurrency } from './utils/validators.js';

export function evaluateCompanyAlerts(companyId: string): Alert[] {
  const data = db.getData();
  const existingAlerts = data.alerts.filter((a) => a.companyId === companyId);
  const readAlertIds = new Set(existingAlerts.filter((a) => a.isRead).map((a) => a.id));

  const newAlerts: Alert[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Helper de data
  const addDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res.toISOString().split('T')[0];
  };

  const day3Str = addDays(today, 3);
  const day7Str = addDays(today, 7);
  const day15Str = addDays(today, 15);

  const consolidatedBalance = db.getCompanyConsolidatedBalance(companyId);

  // 1. Alerta de Saldo Negativo (Consolidado ou de Conta Específica)
  if (consolidatedBalance < 0) {
    newAlerts.push({
      id: `alert_neg_balance_${todayStr}`,
      companyId,
      type: 'saldo_negativo',
      title: 'Saldo Consolidado Negativo',
      description: `O saldo total da empresa está negativo em ${formatBRL(consolidatedBalance)}. Regularize transferências ou aportes para evitar juros e tarifas.`,
      priority: 'critica',
      isRead: readAlertIds.has(`alert_neg_balance_${todayStr}`),
      link: '/contas-financeiras',
      recommendedAction: 'Aporte recursos ou antecipe recebíveis imediatamente para cobrir o saldo devedor.',
      createdAt: new Date().toISOString(),
    });
  }

  // Verifica contas bancárias individuais
  const accounts = data.financialAccounts.filter((a) => a.companyId === companyId && a.status === 'active');
  for (const acc of accounts) {
    const accBal = db.getAccountBalance(acc.id);
    if (accBal < 0) {
      const alertId = `alert_neg_acc_${acc.id}_${todayStr}`;
      newAlerts.push({
        id: alertId,
        companyId,
        type: 'saldo_negativo',
        title: `Saldo Negativo em ${acc.name}`,
        description: `A conta "${acc.name}" (${acc.bankName || 'Caixa'}) está com saldo devedor de ${formatBRL(accBal)}.`,
        priority: 'critica',
        isRead: readAlertIds.has(alertId),
        link: '/contas-financeiras',
        recommendedAction: 'Realize uma transferência interna a partir de outra conta positiva ou aporte capital.',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 2. Risco de Saldo Negativo nos Próximos 7 Dias
  const payablesNext7Days = data.payables.filter(
    (p) =>
      p.companyId === companyId &&
      (p.status === 'pendente' || p.status === 'parcialmente_paga' || p.status === 'vencida') &&
      p.dueDate <= day7Str
  );
  const totalPayables7 = roundCurrency(
    payablesNext7Days.reduce((acc, p) => acc + p.remainingAmount, 0)
  );

  const receivablesNext7Days = data.receivables.filter(
    (r) =>
      r.companyId === companyId &&
      (r.status === 'pendente' || r.status === 'parcialmente_recebido') &&
      r.dueDate <= day7Str
  );
  const totalReceivables7 = roundCurrency(
    receivablesNext7Days.reduce((acc, r) => acc + r.remainingAmount, 0)
  );

  const projected7Balance = roundCurrency(consolidatedBalance + totalReceivables7 - totalPayables7);

  if (projected7Balance < 0 && consolidatedBalance >= 0) {
    const deficit = Math.abs(projected7Balance);
    const alertId = `alert_risk_neg_${todayStr}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'risco_saldo_negativo',
      title: 'Risco de Saldo Negativo nos Próximos 7 Dias',
      description: `Seu saldo projetado ficará negativo nos próximos 7 dias. As despesas previstas (${formatBRL(totalPayables7)}) superam o saldo atual somado às entradas estimadas em ${formatBRL(deficit)}.`,
      priority: 'critica',
      isRead: readAlertIds.has(alertId),
      link: '/fluxo-de-caixa',
      recommendedAction: 'Consulte suas contas a pagar e receber para renegociar prazos com fornecedores ou antecipar recebíveis.',
      createdAt: new Date().toISOString(),
    });
  }

  // 3. Contas Vencidas (A pagar e a receber)
  const overduePayables = data.payables.filter(
    (p) =>
      p.companyId === companyId &&
      (p.status === 'pendente' || p.status === 'parcialmente_paga' || p.status === 'vencida') &&
      p.dueDate < todayStr
  );
  if (overduePayables.length > 0) {
    const totalOverduePay = roundCurrency(overduePayables.reduce((acc, p) => acc + p.remainingAmount, 0));
    const alertId = `alert_overdue_pay_${todayStr}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'contas_vencidas',
      title: `${overduePayables.length} Conta(s) a Pagar Vencida(s)`,
      description: `Existem ${overduePayables.length} obrigação(ões) vencida(s) totalizando ${formatBRL(totalOverduePay)}. O atraso acarreta juros e multas contratuais.`,
      priority: 'critica',
      isRead: readAlertIds.has(alertId),
      link: '/contas-a-pagar',
      recommendedAction: 'Acesse o módulo de contas a pagar para quitar ou registrar pagamentos parciais.',
      createdAt: new Date().toISOString(),
    });
  }

  // 4. Vencimentos Próximos (Próximos 3 a 7 dias)
  const dueSoonPayables = data.payables.filter(
    (p) =>
      p.companyId === companyId &&
      (p.status === 'pendente' || p.status === 'parcialmente_paga') &&
      p.dueDate >= todayStr &&
      p.dueDate <= day3Str
  );
  if (dueSoonPayables.length > 0) {
    const totalDueSoon = roundCurrency(dueSoonPayables.reduce((acc, p) => acc + p.remainingAmount, 0));
    const alertId = `alert_due_soon_${todayStr}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'vencimentos_proximos',
      title: `${dueSoonPayables.length} Conta(s) a Vencer nos Próximos 3 Dias`,
      description: `Total de ${formatBRL(totalDueSoon)} em compromissos com vencimento até ${day3Str.split('-').reverse().join('/')}.`,
      priority: 'atencao',
      isRead: readAlertIds.has(alertId),
      link: '/contas-a-pagar',
      recommendedAction: 'Programe os pagamentos junto ao caixa ou banco para evitar multas.',
      createdAt: new Date().toISOString(),
    });
  }

  // 5. Recebimentos Atrasados (Inadimplência de Clientes)
  const overdueReceivables = data.receivables.filter(
    (r) =>
      r.companyId === companyId &&
      (r.status === 'pendente' || r.status === 'parcialmente_recebido' || r.status === 'vencido') &&
      r.dueDate < todayStr
  );
  if (overdueReceivables.length > 0) {
    const totalOverdueRec = roundCurrency(overdueReceivables.reduce((acc, r) => acc + r.remainingAmount, 0));
    const alertId = `alert_overdue_rec_${todayStr}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'recebimentos_atrasados',
      title: `${overdueReceivables.length} Recebimento(s) em Atraso`,
      description: `A empresa possui ${formatBRL(totalOverdueRec)} em aberto com prazo de vencimento já ultrapassado.`,
      priority: 'atencao',
      isRead: readAlertIds.has(alertId),
      link: '/contas-a-receber',
      recommendedAction: 'Inicie a régua de cobrança amigável com os clientes inadimplentes.',
      createdAt: new Date().toISOString(),
    });
  }

  // 6. Despesas Elevadas (Ultrapassando o Teto Mensal Definido)
  const settings = data.companySettings.find((s) => s.companyId === companyId);
  const maxLimit = settings?.maxExpenseMonthlyLimit || 30000;

  // Calcula despesas realizadas no mês atual
  const currentYearMonth = todayStr.substring(0, 7);
  const currentMonthExpenses = data.transactions
    .filter(
      (t) =>
        t.companyId === companyId &&
        t.type === 'saida' &&
        t.status !== 'estornado' &&
        t.date.startsWith(currentYearMonth)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  if (currentMonthExpenses > maxLimit) {
    const alertId = `alert_high_exp_${currentYearMonth}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'despesas_elevadas',
      title: 'Limite Mensal de Despesas Excedido',
      description: `As saídas deste mês atingiram ${formatBRL(currentMonthExpenses)}, superando o limite configurado de ${formatBRL(maxLimit)}.`,
      priority: 'atencao',
      isRead: readAlertIds.has(alertId),
      link: '/receitas-e-despesas',
      recommendedAction: 'Analise o demonstrativo de despesas por categoria para identificar custos excedentes.',
      createdAt: new Date().toISOString(),
    });
  }

  // 7. Queda no Faturamento (Comparativo com Mês Anterior)
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevYearMonth = prevMonthDate.toISOString().substring(0, 7);

  const prevMonthRevenue = data.sales
    .filter((s) => s.companyId === companyId && s.status !== 'cancelada' && s.saleDate.startsWith(prevYearMonth))
    .reduce((sum, s) => sum + s.total, 0);

  const currentMonthRevenue = data.sales
    .filter((s) => s.companyId === companyId && s.status !== 'cancelada' && s.saleDate.startsWith(currentYearMonth))
    .reduce((sum, s) => sum + s.total, 0);

  // Se já passamos do dia 15 e o faturamento caiu mais que 30% em relação ao mês anterior
  if (today.getDate() >= 15 && prevMonthRevenue > 2000 && currentMonthRevenue < prevMonthRevenue * 0.7) {
    const dropPercent = Math.round(((prevMonthRevenue - currentMonthRevenue) / prevMonthRevenue) * 100);
    const alertId = `alert_rev_drop_${currentYearMonth}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'queda_faturamento',
      title: `Queda de ${dropPercent}% no Faturamento`,
      description: `O faturamento do mês atual (${formatBRL(currentMonthRevenue)}) está ${dropPercent}% abaixo do registrado no mês anterior (${formatBRL(prevMonthRevenue)}).`,
      priority: 'atencao',
      isRead: readAlertIds.has(alertId),
      link: '/faturamento',
      recommendedAction: 'Revise estratégias de vendas e campanhas comerciais para acelerar o fechamento de propostas.',
      createdAt: new Date().toISOString(),
    });
  }

  // 8. Baixa Liquidez (Saldo Disponível não cobre despesas imediatas de 7 dias)
  if (consolidatedBalance > 0 && totalPayables7 > consolidatedBalance) {
    const alertId = `alert_low_liq_${todayStr}`;
    newAlerts.push({
      id: alertId,
      companyId,
      type: 'baixa_liquidez',
      title: 'Alerta de Baixa Liquidez Imediata',
      description: `O saldo em caixa (${formatBRL(consolidatedBalance)}) é insuficiente para honrar os compromissos dos próximos 7 dias (${formatBRL(totalPayables7)}).`,
      priority: 'critica',
      isRead: readAlertIds.has(alertId),
      link: '/fluxo-de-caixa',
      recommendedAction: 'Acelere cobranças pendentes e postergue pagamentos não essenciais.',
      createdAt: new Date().toISOString(),
    });
  }

  // Atualiza banco de dados preservando status de lido
  data.alerts = data.alerts.filter((a) => a.companyId !== companyId).concat(newAlerts);
  db.save();

  return newAlerts;
}
