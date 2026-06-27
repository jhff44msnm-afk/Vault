import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { Card, SectionTitle, MonoAmount, AnimatedMonoAmount, Row, ProgressBar, Badge } from "./ui.jsx";
import { EXPENSE_CATEGORIES, CAT_COLORS } from "../utils/constants.js";
import {
  fmt, startOfWeek, startOfMonth, daysUntil, daysInMonth,
  nextDueDateForDay, buildMonthlySeries, buildPatrimonioSeries,
} from "../utils/calculations.js";

export function Dashboard({ t, data }) {
  const today = new Date();
  const allExpenses = useMemo(() => [...data.variableExpenses, ...data.paymentLog], [data.variableExpenses, data.paymentLog]);

  const totalIncome = data.incomes.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalExpenses = allExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const availableBalance = totalIncome - totalExpenses;

  const todayStr = today.toISOString().slice(0, 10);
  const spentToday = allExpenses.filter((x) => x.dateISO === todayStr).reduce((s, x) => s + Number(x.amount || 0), 0);
  const weekStart = startOfWeek(today);
  const spentThisWeek = allExpenses.filter((x) => new Date(x.dateISO) >= weekStart).reduce((s, x) => s + Number(x.amount || 0), 0);
  const incomeThisWeek = data.incomes.filter((x) => new Date(x.dateISO) >= weekStart).reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthStart = startOfMonth(today);
  const dayOfMonth = today.getDate();
  const spentThisMonth = allExpenses.filter((x) => new Date(x.dateISO) >= monthStart).reduce((s, x) => s + Number(x.amount || 0), 0);
  const incomeThisMonth = data.incomes.filter((x) => new Date(x.dateISO) >= monthStart).reduce((s, x) => s + Number(x.amount || 0), 0);
  const dailyAvg = spentThisMonth / dayOfMonth;
  const monthBalance = incomeThisMonth - spentThisMonth;
  const daysRemaining = Math.max(1, daysInMonth(today) - dayOfMonth + 1);
  const dailyBudgetRemaining = monthBalance / daysRemaining;

  const monthly = useMemo(() => buildMonthlySeries(data, 6), [data]);
  const periodIncome = monthly.reduce((s, m) => s + m.income, 0);
  const periodExpenses = monthly.reduce((s, m) => s + m.expenses, 0);
  const periodBalance = periodIncome - periodExpenses;
  const firstHalf = (monthly[0].balance + monthly[1].balance + monthly[2].balance) / 3;
  const secondHalf = (monthly[3].balance + monthly[4].balance + monthly[5].balance) / 3;
  const trend = secondHalf > firstHalf * 1.05 ? "Improving" : secondHalf < firstHalf * 0.95 ? "Declining" : "Stable";
  const trendColor = trend === "Improving" ? t.green : trend === "Declining" ? t.red : t.gold;

  const netWorthSeries = useMemo(() => buildPatrimonioSeries(data, 6), [data]);
  const currentMonthCats = useMemo(() => {
    return EXPENSE_CATEGORIES.map((c) => ({ name: c, value: allExpenses.filter((e) => e.category === c && new Date(e.dateISO) >= monthStart).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter((c) => c.value > 0);
  }, [allExpenses]);

  const upcoming = data.fixedExpenses.map((e) => ({ ...e, due: nextDueDateForDay(e.dayOfMonth, e.lastPaidISO) })).sort((a, b) => a.due - b.due).filter((e) => daysUntil(e.due) <= 7).slice(0, 4);
  const activeGoals = data.goals.filter((g) => g.savedAmount < g.targetAmount).slice(0, 2);

  return (
    <div>
      <Card t={t} style={{ textAlign: "center" }}>
        <SectionTitle t={t}>Available Balance</SectionTitle>
        <AnimatedMonoAmount t={t} value={availableBalance} size={30} color={availableBalance >= 0 ? t.green : t.red} />
        <div style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>Total income − total expenses (all recorded history)</div>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Today</SectionTitle>
        <Row t={t} label="Spent today" value={-spentToday} />
        <Row t={t} label="Daily average this month" value={-dailyAvg} />
        <Row t={t} label="Remaining daily budget" value={dailyBudgetRemaining} />
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>This Week</SectionTitle>
        <Row t={t} label="Income" value={incomeThisWeek} />
        <Row t={t} label="Spent" value={-spentThisWeek} />
        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: t.textDim }}>Week balance</span>
          <AnimatedMonoAmount t={t} value={incomeThisWeek - spentThisWeek} color={incomeThisWeek - spentThisWeek >= 0 ? t.green : t.red} />
        </div>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>This Month</SectionTitle>
        <Row t={t} label="Income" value={incomeThisMonth} />
        <Row t={t} label="Spent" value={-spentThisMonth} />
        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: t.textDim }}>Month balance</span>
          <AnimatedMonoAmount t={t} value={monthBalance} color={monthBalance >= 0 ? t.green : t.red} />
        </div>
      </Card>

      <Card t={t}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionTitle t={t}>Last 6 Months</SectionTitle>
          <Badge t={t} color={trendColor} pulse>{trend}</Badge>
        </div>
        <Row t={t} label="Total income" value={periodIncome} />
        <Row t={t} label="Total spent" value={-periodExpenses} />
        <Row t={t} label="Net balance" value={periodBalance} />
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthly}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textDim }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={42} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" name="Income" fill={t.green} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill={t.red} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Net Worth (estimated)</SectionTitle>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={netWorthSeries}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textDim }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={42} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="netWorth" stroke={t.gold} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 6, lineHeight: 1.4 }}>
          Cumulative balance from your history + current investment value + retirement balance. Investments use today's value (not historical), so this is an estimate.
        </div>
      </Card>

      {currentMonthCats.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Monthly Spending by Category</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={currentMonthCats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                {currentMonthCats.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Upcoming Bills (7 days)</SectionTitle>
          {upcoming.map((e) => {
            const d = daysUntil(e.due);
            return (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{e.name}</span>
                <span style={{ color: d < 0 ? t.red : d <= 2 ? t.gold : t.textDim, fontFamily: "ui-monospace, monospace" }}>
                  {d < 0 ? `overdue ${Math.abs(d)}d` : d === 0 ? "today" : `in ${d}d`} · {fmt(e.amount)}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      {activeGoals.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Active Goals</SectionTitle>
          {activeGoals.map((g) => {
            const p = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
            return (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{g.name}</span>
                  <span style={{ color: t.textDim, fontFamily: "ui-monospace, monospace" }}>{fmt(g.savedAmount)} / {fmt(g.targetAmount)}</span>
                </div>
                <ProgressBar t={t} pctValue={p} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
