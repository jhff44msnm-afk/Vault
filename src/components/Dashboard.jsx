import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { Card, SectionTitle, MonoAmount, Row, ProgressBar, Badge } from "./ui.jsx";
import { EXPENSE_CATEGORIES, CAT_COLORS } from "../utils/constants.js";
import {
  fmt, startOfMonth, daysUntil, daysInMonth,
  nextDueDateForDay, buildMonthlySeries, buildPatrimonioSeries,
} from "../utils/calculations.js";

export function Dashboard({ t, data }) {
  const today = new Date();
  const allExpenses = useMemo(() => [...data.variableExpenses, ...data.paymentLog], [data.variableExpenses, data.paymentLog]);

  // Saldo disponible global
  const totalIngresos = data.incomes.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalGastos = allExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const saldoDisponible = totalIngresos - totalGastos;

  // Día
  const todayStr = today.toISOString().slice(0, 10);
  const gastoHoy = allExpenses.filter((x) => x.dateISO === todayStr).reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthStart = startOfMonth(today);
  const diaDelMes = today.getDate();
  const gastadoMes = allExpenses.filter((x) => new Date(x.dateISO) >= monthStart).reduce((s, x) => s + Number(x.amount || 0), 0);
  const ingresosMes = data.incomes.filter((x) => new Date(x.dateISO) >= monthStart).reduce((s, x) => s + Number(x.amount || 0), 0);
  const promedioDiario = gastadoMes / diaDelMes;
  const saldoDisponibleMes = ingresosMes - gastadoMes;
  const diasRestantesMes = Math.max(1, daysInMonth(today) - diaDelMes + 1);
  const saldoRestanteDiario = saldoDisponibleMes / diasRestantesMes;

  // Período de 6 meses
  const monthly = useMemo(() => buildMonthlySeries(data, 6), [data]);
  const periodoIngresos = monthly.reduce((s, m) => s + m.ingresos, 0);
  const periodoGastos = monthly.reduce((s, m) => s + m.gastos, 0);
  const periodoBalance = periodoIngresos - periodoGastos;
  const primeraMitad = (monthly[0].balance + monthly[1].balance + monthly[2].balance) / 3;
  const segundaMitad = (monthly[3].balance + monthly[4].balance + monthly[5].balance) / 3;
  const tendencia = segundaMitad > primeraMitad * 1.05 ? "Mejorando" : segundaMitad < primeraMitad * 0.95 ? "Empeorando" : "Estable";
  const tendenciaColor = tendencia === "Mejorando" ? t.green : tendencia === "Empeorando" ? t.red : t.gold;

  const patrimonioSeries = useMemo(() => buildPatrimonioSeries(data, 6), [data]);
  const currentMonthCats = useMemo(() => {
    return EXPENSE_CATEGORIES.map((c) => ({ name: c, value: allExpenses.filter((e) => e.category === c && new Date(e.dateISO) >= monthStart).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter((c) => c.value > 0);
  }, [allExpenses]);

  const upcoming = data.fixedExpenses.map((e) => ({ ...e, due: nextDueDateForDay(e.dayOfMonth, e.lastPaidISO) })).sort((a, b) => a.due - b.due).filter((e) => daysUntil(e.due) <= 7).slice(0, 4);
  const activeGoals = data.goals.filter((g) => g.savedAmount < g.targetAmount).slice(0, 2);

  return (
    <div>
      <Card t={t} style={{ textAlign: "center" }}>
        <SectionTitle t={t}>Saldo disponible</SectionTitle>
        <MonoAmount t={t} value={saldoDisponible} size={30} color={saldoDisponible >= 0 ? t.green : t.red} />
        <div style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>Ingresos totales − gastos totales (todo el historial registrado)</div>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Hoy</SectionTitle>
        <Row t={t} label="Gastado hoy" value={-gastoHoy} />
        <Row t={t} label="Promedio diario del mes" value={-promedioDiario} />
        <Row t={t} label="Saldo restante / día (resto del mes)" value={saldoRestanteDiario} />
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Este mes</SectionTitle>
        <Row t={t} label="Ingresos del mes" value={ingresosMes} />
        <Row t={t} label="Gastado del mes" value={-gastadoMes} />
        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: t.textDim }}>Saldo disponible del mes</span>
          <MonoAmount t={t} value={saldoDisponibleMes} color={saldoDisponibleMes >= 0 ? t.green : t.red} />
        </div>
      </Card>

      <Card t={t}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionTitle t={t}>Últimos 6 meses</SectionTitle>
          <Badge t={t} color={tendenciaColor}>{tendencia}</Badge>
        </div>
        <Row t={t} label="Total ingresado" value={periodoIngresos} />
        <Row t={t} label="Total gastado" value={-periodoGastos} />
        <Row t={t} label="Balance neto" value={periodoBalance} />
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthly}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textDim }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={42} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="ingresos" name="Ingresos" fill={t.green} radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" name="Gastos" fill={t.red} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Evolución de patrimonio (estimado)</SectionTitle>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={patrimonioSeries}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textDim }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={42} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="patrimonio" stroke={t.gold} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 6, lineHeight: 1.4 }}>
          Saldo acumulado de tu historial + valor actual de inversiones + saldo AFORE. Las inversiones se aplican a su valor de hoy (no histórico), así que es una estimación.
        </div>
      </Card>

      {currentMonthCats.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Gastos del mes por categoría</SectionTitle>
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
          <SectionTitle t={t}>Próximos pagos (7 días)</SectionTitle>
          {upcoming.map((e) => {
            const d = daysUntil(e.due);
            return (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{e.name}</span>
                <span style={{ color: d < 0 ? t.red : d <= 2 ? t.gold : t.textDim, fontFamily: "ui-monospace, monospace" }}>
                  {d < 0 ? `vencido hace ${Math.abs(d)}d` : d === 0 ? "hoy" : `en ${d}d`} · {fmt(e.amount)}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      {activeGoals.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Metas en curso</SectionTitle>
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

