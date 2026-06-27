import React, { useState } from "react";
import { Card, SectionTitle, AnimatedMonoAmount, Row, Input, Select, CollapsibleSection, btnPrimary, btnGhost, btnSmall, iconBtn } from "./ui.jsx";
import { EXPENSE_CATEGORIES } from "../utils/constants.js";
import { fmt, uid, startOfMonth, daysUntil, nextDueDateForDay } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Pagos({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", amount: "", dayOfMonth: "1", category: "Otros", notes: "" });
  const [editingId, setEditingId] = useState(null);

  const list = data.fixedExpenses.map((e) => ({ ...e, due: nextDueDateForDay(e.dayOfMonth, e.lastPaidISO) })).sort((a, b) => a.due - b.due);
  const monthStart = startOfMonth(new Date());
  const realizados = data.paymentLog.filter((p) => new Date(p.dateISO) >= monthStart).sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const vencidos = list.filter((e) => daysUntil(e.due) < 0);
  const proximos = list.filter((e) => { const d = daysUntil(e.due); return d >= 0 && d <= 5; });

  function resetForm() { setForm({ name: "", amount: "", dayOfMonth: "1", category: "Otros", notes: "" }); setEditingId(null); }
  function submit() {
    if (!form.name.trim() || !form.amount) return;
    const dom = Math.min(31, Math.max(1, Number(form.dayOfMonth) || 1));
    const payload = { name: form.name, amount: Number(form.amount), dayOfMonth: dom, category: form.category, notes: form.notes };
    const next = editingId ? data.fixedExpenses.map((e) => (e.id === editingId ? { ...e, ...payload } : e)) : [...data.fixedExpenses, { id: uid(), ...payload, lastPaidISO: null }];
    update({ fixedExpenses: next });
    toast(editingId ? "Pago actualizado" : "Pago agregado");
    resetForm();
  }
  function edit(e) { setForm({ name: e.name, amount: String(e.amount), dayOfMonth: String(e.dayOfMonth), category: e.category, notes: e.notes || "" }); setEditingId(e.id); }
  async function remove(id) {
    if (!await confirm("¿Eliminar este pago recurrente?")) return;
    update({ fixedExpenses: data.fixedExpenses.filter((e) => e.id !== id) });
    if (editingId === id) resetForm();
    toast("Pago eliminado");
  }
  function markPaid(e) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const log = { id: uid(), fixedExpenseId: e.id, name: e.name, category: e.category, amount: e.amount, dateISO: todayISO };
    update({
      fixedExpenses: data.fixedExpenses.map((x) => (x.id === e.id ? { ...x, lastPaidISO: todayISO } : x)),
      paymentLog: [...data.paymentLog, log],
    });
    toast("Pago marcado como realizado");
  }
  async function unmarkLog(logId) {
    if (!await confirm("¿Eliminar este registro de pago?")) return;
    update({ paymentLog: data.paymentLog.filter((p) => p.id !== logId) });
    toast("Registro eliminado");
  }

  const totalMonthly = data.fixedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div>
      <Card t={t}>
        <SectionTitle t={t}>Total de pagos fijos (mensual)</SectionTitle>
        <AnimatedMonoAmount t={t} value={totalMonthly} size={26} />
      </Card>

      {(vencidos.length > 0 || proximos.length > 0) && (
        <Card t={t}>
          <SectionTitle t={t}>Alertas</SectionTitle>
          {vencidos.map((e) => <Row key={e.id} t={t} label={`🔴 ${e.name} · vencido hace ${Math.abs(daysUntil(e.due))}d`} value={-e.amount} />)}
          {proximos.map((e) => <Row key={e.id} t={t} label={`🟡 ${e.name} · vence en ${daysUntil(e.due)}d`} value={-e.amount} />)}
          {vencidos.length === 0 && proximos.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin pagos próximos o vencidos.</div>}
        </Card>
      )}

      <Card t={t}>
        <CollapsibleSection t={t} title="Checklist de pagos recurrentes" count={list.length}>
          {list.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin pagos recurrentes registrados.</div>}
          {list.map((e) => {
            const d = daysUntil(e.due);
            const status = d < 0 ? "vencido" : d <= 3 ? "próximo" : "al día";
            const color = d < 0 ? t.red : d <= 3 ? t.gold : t.green;
            return (
              <div key={e.id} style={{ padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: t.textDim }}>{e.category} · día {e.dayOfMonth} de cada mes</div>
                    {e.notes && <div style={{ fontSize: 11, color: t.gold, marginTop: 2 }}>{e.notes}</div>}
                  </div>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, fontWeight: 700 }}>{fmt(e.amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color, fontWeight: 600 }}>
                    {status === "vencido" ? `vencido hace ${Math.abs(d)}d` : status === "próximo" ? `vence en ${d}d` : `próximo en ${d}d`}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => markPaid(e)} style={btnSmall(t, t.green)}>Marcar pagado</button>
                    <button onClick={() => edit(e)} style={iconBtn(t)}>✏️</button>
                    <button onClick={() => remove(e.id)} style={iconBtn(t)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </CollapsibleSection>
      </Card>

      <Card t={t} id="vault-form" style={{ animation: "vault-slideUp 0.4s ease both" }}>
        <SectionTitle t={t}>{editingId ? "Editar pago" : "Agregar pago recurrente"}</SectionTitle>
        <Input t={t} placeholder="Nombre (ej. Seguro, Renta, Auto)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input t={t} placeholder="Monto (USD)" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <Input t={t} placeholder="Día del mes (1-31)" type="number" value={form.dayOfMonth} onChange={(v) => setForm({ ...form, dayOfMonth: v })} />
        <Select t={t} value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={EXPENSE_CATEGORIES} />
        <Input t={t} placeholder="Nota (opcional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={submit} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Agregar"}</button>
          {editingId && <button onClick={resetForm} style={btnGhost(t)}>Cancelar</button>}
        </div>
      </Card>

      <Card t={t}>
        <CollapsibleSection t={t} title="Pagos realizados este mes" count={realizados.length}>
          {realizados.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Ningún pago marcado como realizado todavía este mes.</div>}
          {realizados.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
              <span style={{ fontSize: 13 }}>{p.name} · {p.dateISO}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: t.green }}>{fmt(p.amount)}</span>
                <button onClick={() => unmarkLog(p.id)} style={iconBtn(t)}>🗑️</button>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      </Card>
    </div>
  );
}
