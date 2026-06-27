import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, SectionTitle, AnimatedMonoAmount, Row, Input, Select, CollapsibleSection, btnPrimary, btnGhost, iconBtn, pillBtn } from "./ui.jsx";
import { EXPENSE_CATEGORIES, CAT_COLORS, INCOME_CATEGORIES, PAYMENT_METHODS } from "../utils/constants.js";
import { fmt, uid, startOfWeek, startOfMonth } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Movimientos({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [kind, setKind] = useState("gasto");
  const [view, setView] = useState("semana");
  const [expForm, setExpForm] = useState({ name: "", amount: "", category: "Comida", dateISO: new Date().toISOString().slice(0, 10), paymentMethod: "Efectivo", notes: "" });
  const [incForm, setIncForm] = useState({ name: "", amount: "", category: "Salario", dateISO: new Date().toISOString().slice(0, 10), notes: "" });
  const [editingId, setEditingId] = useState(null);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const rangeStart = view === "semana" ? weekStart : monthStart;

  const filteredExpenses = data.variableExpenses.filter((e) => new Date(e.dateISO) >= rangeStart).sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const filteredIncomes = data.incomes.filter((e) => new Date(e.dateISO) >= rangeStart).sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

  const totalExp = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalInc = filteredIncomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  const days = view === "semana" ? 7 : now.getDate();
  const avgDaily = totalExp / days;

  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ name: c, value: filteredExpenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter((c) => c.value > 0);

  function resetExpForm() { setExpForm({ name: "", amount: "", category: "Comida", dateISO: new Date().toISOString().slice(0, 10), paymentMethod: "Efectivo", notes: "" }); setEditingId(null); }
  function resetIncForm() { setIncForm({ name: "", amount: "", category: "Salario", dateISO: new Date().toISOString().slice(0, 10), notes: "" }); setEditingId(null); }

  function submitExpense() {
    if (!expForm.name.trim() || !expForm.amount) return;
    const payload = { ...expForm, amount: Number(expForm.amount) };
    const next = editingId ? data.variableExpenses.map((e) => (e.id === editingId ? { ...e, ...payload } : e)) : [...data.variableExpenses, { id: uid(), ...payload }];
    update({ variableExpenses: next });
    toast(editingId ? "Gasto actualizado" : "Gasto registrado");
    resetExpForm();
  }
  function submitIncome() {
    if (!incForm.name.trim() || !incForm.amount) return;
    const payload = { ...incForm, amount: Number(incForm.amount) };
    const next = editingId ? data.incomes.map((e) => (e.id === editingId ? { ...e, ...payload } : e)) : [...data.incomes, { id: uid(), ...payload }];
    update({ incomes: next });
    toast(editingId ? "Ingreso actualizado" : "Ingreso registrado");
    resetIncForm();
  }
  function editExpense(e) { setExpForm({ name: e.name, amount: String(e.amount), category: e.category, dateISO: e.dateISO, paymentMethod: e.paymentMethod || "Efectivo", notes: e.notes || "" }); setEditingId(e.id); }
  function editIncome(e) { setIncForm({ name: e.name, amount: String(e.amount), category: e.category, dateISO: e.dateISO, notes: e.notes || "" }); setEditingId(e.id); }
  async function removeExpense(id) {
    if (!await confirm("¿Eliminar este gasto?")) return;
    update({ variableExpenses: data.variableExpenses.filter((e) => e.id !== id) });
    if (editingId === id) resetExpForm();
    toast("Gasto eliminado");
  }
  async function removeIncome(id) {
    if (!await confirm("¿Eliminar este ingreso?")) return;
    update({ incomes: data.incomes.filter((e) => e.id !== id) });
    if (editingId === id) resetIncForm();
    toast("Ingreso eliminado");
  }

  return (
    <div>
      <Card t={t}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button onClick={() => { setKind("gasto"); setEditingId(null); }} style={pillBtn(t, kind === "gasto")}>🧾 Gastos</button>
          <button onClick={() => { setKind("ingreso"); setEditingId(null); }} style={pillBtn(t, kind === "ingreso")}>💰 Ingresos</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setView("semana")} style={pillBtn(t, view === "semana")}>Semana</button>
          <button onClick={() => setView("mes")} style={pillBtn(t, view === "mes")}>Mes</button>
        </div>
      </Card>

      {kind === "gasto" ? (
        <>
          <Card t={t}>
            <SectionTitle t={t}>Resumen de gastos ({view === "semana" ? "esta semana" : "este mes"})</SectionTitle>
            <AnimatedMonoAmount t={t} value={totalExp} size={24} color={t.red} />
            <Row t={t} label="Promedio diario" value={-avgDaily} />
          </Card>

          {byCategory.length > 0 && (
            <Card t={t}>
              <SectionTitle t={t}>Por categoría</SectionTitle>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name }) => name}>
                    {byCategory.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card t={t} id="vault-form" style={{ animation: "vault-slideUp 0.4s ease both" }}>
            <SectionTitle t={t}>{editingId ? "Editar gasto" : "Registrar gasto"}</SectionTitle>
            <Input t={t} placeholder="Nombre (ej. Comida, Ropa nueva)" value={expForm.name} onChange={(v) => setExpForm({ ...expForm, name: v })} />
            <Input t={t} placeholder="Monto (USD)" type="number" value={expForm.amount} onChange={(v) => setExpForm({ ...expForm, amount: v })} />
            <Select t={t} value={expForm.category} onChange={(v) => setExpForm({ ...expForm, category: v })} options={EXPENSE_CATEGORIES} />
            <Select t={t} value={expForm.paymentMethod} onChange={(v) => setExpForm({ ...expForm, paymentMethod: v })} options={PAYMENT_METHODS} />
            <Input t={t} type="date" value={expForm.dateISO} onChange={(v) => setExpForm({ ...expForm, dateISO: v })} />
            <Input t={t} placeholder="Nota (opcional)" value={expForm.notes} onChange={(v) => setExpForm({ ...expForm, notes: v })} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={submitExpense} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Agregar"}</button>
              {editingId && <button onClick={resetExpForm} style={btnGhost(t)}>Cancelar</button>}
            </div>
          </Card>

          <Card t={t}>
            <CollapsibleSection t={t} title="Movimientos" count={filteredExpenses.length}>
              {filteredExpenses.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin gastos registrados en este periodo.</div>}
              {filteredExpenses.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: t.textDim }}>{e.category} · {e.paymentMethod || "Otro"} · {e.dateISO}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14 }}>{fmt(e.amount)}</span>
                    <button onClick={() => editExpense(e)} style={iconBtn(t)}>✏️</button>
                    <button onClick={() => removeExpense(e.id)} style={iconBtn(t)}>🗑️</button>
                  </div>
                </div>
              ))}
            </CollapsibleSection>
          </Card>
        </>
      ) : (
        <>
          <Card t={t}>
            <SectionTitle t={t}>Resumen de ingresos ({view === "semana" ? "esta semana" : "este mes"})</SectionTitle>
            <AnimatedMonoAmount t={t} value={totalInc} size={24} color={t.green} />
          </Card>

          <Card t={t} id="vault-form" style={{ animation: "vault-slideUp 0.4s ease both" }}>
            <SectionTitle t={t}>{editingId ? "Editar ingreso" : "Registrar ingreso"}</SectionTitle>
            <Input t={t} placeholder="Nombre (ej. Quincena, Pago de cliente)" value={incForm.name} onChange={(v) => setIncForm({ ...incForm, name: v })} />
            <Input t={t} placeholder="Monto (USD)" type="number" value={incForm.amount} onChange={(v) => setIncForm({ ...incForm, amount: v })} />
            <Select t={t} value={incForm.category} onChange={(v) => setIncForm({ ...incForm, category: v })} options={INCOME_CATEGORIES} />
            <Input t={t} type="date" value={incForm.dateISO} onChange={(v) => setIncForm({ ...incForm, dateISO: v })} />
            <Input t={t} placeholder="Nota (opcional)" value={incForm.notes} onChange={(v) => setIncForm({ ...incForm, notes: v })} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={submitIncome} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Agregar"}</button>
              {editingId && <button onClick={resetIncForm} style={btnGhost(t)}>Cancelar</button>}
            </div>
          </Card>

          <Card t={t}>
            <CollapsibleSection t={t} title="Movimientos" count={filteredIncomes.length}>
              {filteredIncomes.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin ingresos registrados en este periodo.</div>}
              {filteredIncomes.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: t.textDim }}>{e.category} · {e.dateISO}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, color: t.green }}>{fmt(e.amount)}</span>
                    <button onClick={() => editIncome(e)} style={iconBtn(t)}>✏️</button>
                    <button onClick={() => removeIncome(e.id)} style={iconBtn(t)}>🗑️</button>
                  </div>
                </div>
              ))}
            </CollapsibleSection>
          </Card>
        </>
      )}
    </div>
  );
}
