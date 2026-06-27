import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, SectionTitle, Row, Field, Input, CollapsibleSection, FormSheet, btnPrimary, btnGhost, pillBtn } from "./ui.jsx";
import { fmt, uid, DEFAULT_DATA } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";

export function Pension({ t, data, update }) {
  const toast = useToast();
  const pension = data.pension || DEFAULT_DATA.pension;
  const [form, setForm] = useState({
    afore: pension.afore || "", currentBalance: String(pension.currentBalance || 0),
    monthlyContribution: String(pension.monthlyContribution || 0), historicalReturnPct: String(pension.historicalReturnPct || 8),
    currentAge: String(pension.currentAge || ""), retirementAge: String(pension.retirementAge || 65),
  });
  const [contribAmount, setContribAmount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState("afore");

  useEffect(() => {
    const handler = () => { setFormKind("afore"); setShowForm(true); };
    window.addEventListener("vault-open-form", handler);
    return () => window.removeEventListener("vault-open-form", handler);
  }, []);

  function closeForm() { setShowForm(false); }

  function saveForm() {
    update({ pension: { ...pension, afore: form.afore, currentBalance: Number(form.currentBalance) || 0, monthlyContribution: Number(form.monthlyContribution) || 0, historicalReturnPct: Number(form.historicalReturnPct) || 0, currentAge: Number(form.currentAge) || "", retirementAge: Number(form.retirementAge) || 65 } });
    toast("Datos de AFORE guardados");
    closeForm();
  }
  function logContribution() {
    if (!contribAmount) return;
    const todayISO = new Date().toISOString().slice(0, 10);
    const entry = { id: uid(), amount: Number(contribAmount), dateISO: todayISO };
    update({ pension: { ...pension, contributions: [...(pension.contributions || []), entry], currentBalance: Number(pension.currentBalance || 0) + Number(contribAmount) } });
    setContribAmount("");
    toast("Aportación registrada");
    closeForm();
  }

  const yearsToRetire = Math.max(0, (Number(form.retirementAge) || 65) - (Number(form.currentAge) || 0));
  const n = yearsToRetire * 12;
  const r = (Number(form.historicalReturnPct) || 0) / 100 / 12;
  const PMT = Number(form.monthlyContribution) || 0;
  const projection = useMemo(() => {
    const pts = []; let balance = Number(form.currentBalance) || 0;
    for (let m = 0; m <= n; m++) { if (m > 0) balance = balance * (1 + r) + PMT; if (m % 12 === 0) pts.push({ year: m / 12, value: Math.round(balance) }); }
    return pts;
  }, [form.currentBalance, r, PMT, n]);
  const capitalEstimado = projection.length ? projection[projection.length - 1].value : Number(form.currentBalance) || 0;

  return (
    <div>
      <Card t={t}>
        <SectionTitle t={t}>Proyección de retiro</SectionTitle>
        <Row t={t} label="Años para retiro" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{yearsToRetire}</span>} />
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={projection}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: t.textDim }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={45} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={t.purple} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <Row t={t} label="Capital estimado al jubilarse" value={capitalEstimado} />
        <div style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>Proyección educativa basada en el rendimiento histórico que ingresaste. No es una garantía de tu AFORE.</div>
      </Card>

      <Card t={t}>
        <CollapsibleSection t={t} title="Historial de aportaciones" count={(pension.contributions || []).length}>
          {(pension.contributions || []).length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin aportaciones registradas.</div>}
          {(pension.contributions || []).slice().reverse().map((c) => <Row key={c.id} t={t} label={c.dateISO} value={c.amount} />)}
        </CollapsibleSection>
      </Card>

      <FormSheet t={t} open={showForm} onClose={closeForm} title={formKind === "afore" ? "Datos de AFORE" : "Aportación voluntaria"}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button onClick={() => setFormKind("afore")} style={pillBtn(t, formKind === "afore")}>🏦 AFORE</button>
          <button onClick={() => setFormKind("aportacion")} style={pillBtn(t, formKind === "aportacion")}>💵 Aportación</button>
        </div>
        {formKind === "afore" ? (
          <>
            <Field t={t} label="Administradora (AFORE)"><Input t={t} value={form.afore} onChange={(v) => setForm({ ...form, afore: v })} placeholder="Ej. Profuturo, XXI-Banorte" /></Field>
            <Field t={t} label="Saldo actual (USD)"><Input t={t} type="number" value={form.currentBalance} onChange={(v) => setForm({ ...form, currentBalance: v })} /></Field>
            <Field t={t} label="Aportación mensual (USD)"><Input t={t} type="number" value={form.monthlyContribution} onChange={(v) => setForm({ ...form, monthlyContribution: v })} /></Field>
            <Field t={t} label="Rendimiento histórico anual (%)"><Input t={t} type="number" value={form.historicalReturnPct} onChange={(v) => setForm({ ...form, historicalReturnPct: v })} /></Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Field t={t} label="Edad actual"><Input t={t} type="number" value={form.currentAge} onChange={(v) => setForm({ ...form, currentAge: v })} /></Field>
              <Field t={t} label="Edad de retiro"><Input t={t} type="number" value={form.retirementAge} onChange={(v) => setForm({ ...form, retirementAge: v })} /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={saveForm} style={btnPrimary(t)}>Guardar datos de AFORE</button>
            </div>
          </>
        ) : (
          <>
            <Input t={t} placeholder="Monto (USD)" type="number" value={contribAmount} onChange={setContribAmount} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={logContribution} style={btnPrimary(t)}>Registrar aportación</button>
            </div>
          </>
        )}
      </FormSheet>
    </div>
  );
}
