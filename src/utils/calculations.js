export const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pctStr = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + "%";
export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_DATA = {
  inflationRate: 3,
  incomes: [],
  fixedExpenses: [],
  variableExpenses: [],
  paymentLog: [],
  goals: [],
  investments: [],
  watchlist: [],
  insuranceLife: [],
  insuranceHealth: [],
  pension: { provider: "", currentBalance: 0, monthlyContribution: 0, historicalReturnPct: 8, currentAge: "", retirementAge: 65, contributions: [] },
  statements: [],
  apiKeys: { alphaVantage: "" },
};

export function migrateOldData(old) {
  const today = new Date().toISOString().slice(0, 10);
  const incomes = [];
  if (old.salary) {
    incomes.push({
      id: uid(), name: "Salary", amount: Number(old.salary) || 0, dateISO: today,
      category: "Salary", notes: "Migrated from your previous setup. Add your actual deposits as they come in.",
    });
  }
  const fixedExpenses = (old.fixedExpenses || []).map((e) => ({
    id: e.id || uid(),
    name: e.name,
    category: e.category || "Other",
    amount: Number(e.amount) || 0,
    dayOfMonth: 1,
    lastPaidISO: e.lastPaidISO || null,
    notes: `${e.notes ? e.notes + " · " : ""}Auto-migrated: was every ${e.frequencyDays || 30} days${e.day ? ` (${e.day})` : ""} — confirm the payment day.`,
  }));
  return {
    ...DEFAULT_DATA,
    inflationRate: old.inflationRate ?? 3,
    incomes,
    fixedExpenses,
    variableExpenses: (old.variableExpenses || []).map((e) => ({ ...e, paymentMethod: e.paymentMethod || "Other" })),
    goals: old.goals || [],
  };
}

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function startOfWeek(d) { const date = startOfDay(d); const day = date.getDay(); date.setDate(date.getDate() - day); return date; }
export function startOfMonth(d) { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0, 0, 0, 0); return x; }
export function endOfMonth(d) { const x = new Date(d.getFullYear(), d.getMonth() + 1, 0); x.setHours(23, 59, 59, 999); return x; }
export function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
export function monthLabel(d) { return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }); }
export function daysUntil(date) { const ms = startOfDay(date).getTime() - startOfDay(new Date()).getTime(); return Math.round(ms / 86400000); }
export function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

export function nextDueDateForDay(dayOfMonth, lastPaidISO) {
  const today = startOfDay(new Date());
  const dom = Math.min(Math.max(Number(dayOfMonth) || 1, 1), 31);
  let due = new Date(today.getFullYear(), today.getMonth(), dom);
  if (lastPaidISO) {
    const lp = new Date(lastPaidISO);
    if (lp.getFullYear() === due.getFullYear() && lp.getMonth() === due.getMonth()) {
      due = new Date(due.getFullYear(), due.getMonth() + 1, dom);
    }
  }
  due.setHours(0, 0, 0, 0);
  return due;
}

export function buildMonthlySeries(data, monthsCount) {
  const now = new Date();
  const months = [];
  for (let i = monthsCount - 1; i >= 0; i--) months.push(addMonths(now, -i));
  const allExpenses = [...data.variableExpenses, ...data.paymentLog];
  return months.map((d) => {
    const s = startOfMonth(d), e = endOfMonth(d);
    const income = data.incomes.filter((x) => { const dt = new Date(x.dateISO); return dt >= s && dt <= e; }).reduce((a, x) => a + Number(x.amount || 0), 0);
    const expenses = allExpenses.filter((x) => { const dt = new Date(x.dateISO); return dt >= s && dt <= e; }).reduce((a, x) => a + Number(x.amount || 0), 0);
    return { label: monthLabel(d), income, expenses, balance: income - expenses };
  });
}

export function buildPatrimonioSeries(data, monthsCount) {
  const series = buildMonthlySeries(data, monthsCount);
  const investTotal = data.investments.reduce((a, i) => a + Number(i.currentValue || i.valorActual || 0), 0);
  const pensionBal = Number(data.pension?.currentBalance || 0);
  const firstMonthStart = startOfMonth(addMonths(new Date(), -(monthsCount - 1)));
  const allExpenses = [...data.variableExpenses, ...data.paymentLog];
  const priorIncome = data.incomes.filter((x) => new Date(x.dateISO) < firstMonthStart).reduce((a, x) => a + Number(x.amount || 0), 0);
  const priorExpenses = allExpenses.filter((x) => new Date(x.dateISO) < firstMonthStart).reduce((a, x) => a + Number(x.amount || 0), 0);
  let cum = priorIncome - priorExpenses;
  return series.map((m) => { cum += m.balance; return { ...m, netWorth: Math.round(cum + investTotal + pensionBal) }; });
}
