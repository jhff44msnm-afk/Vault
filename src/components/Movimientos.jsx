import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, SectionTitle, AnimatedMonoAmount, Row, Input, Select, FormSheet, CollapsibleSection, btnPrimary, btnGhost, iconBtn, pillBtn } from "./ui.jsx";
import { EXPENSE_CATEGORIES, CAT_COLORS, INCOME_CATEGORIES, PAYMENT_METHODS } from "../utils/constants.js";
import { fmt, uid, startOfWeek, startOfMonth } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Movimientos({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [kind, setKind] = useState("expense");
  const [view, setView] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState("expense");
  const [expForm, setExpForm] = useState({ name: "", amount: "", category: "Food", dateISO: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", notes: "" });
  const [incForm, setIncForm] = useState({ name: "", amount: "", category: "Salary", dateISO: new Date().toISOString().slice(0, 10), notes: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const handler = () => { resetExpForm(); resetIncForm(); setFormKind(kind); setShowForm(true); };
    window.addEventListener("vault-open-form", handler);
    return () => window.removeEventListener("vault-open-form", handler);
  }, [kind]);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const rangeStart = view === "week" ? weekStart : view === "month" ? monthStart : null;

  const filteredExpenses = data.variableExpenses.filter((e) => !rangeStart || new Date(e.dateISO) >= rangeStart).sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const filteredIncomes = data.incomes.filter((e) => !rangeStart || new Date(e.dateISO) >= rangeStart).sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

  const totalExp = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalInc = filteredIncomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  const days = view === "week" ? 7 : view === "month" ? now.getDate() : Math.max(1, Math.ceil((now - new Date(Math.min(...data.variableExpenses.map((e) => new Date(e.dateISO).getTime()).concat(now.getTime())))) / 86400000));
  const avgDaily = totalExp / days;

  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ name: c, value: filteredExpenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter((c) => c.value > 0);

  function resetExpForm() { setExpForm({ name: "", amount: "", category: "Food", dateISO: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", notes: "" }); setEditingId(null); }
  function resetIncForm() { setIncForm({ name: "", amount: "", category: "Salary", dateISO: new Date().toISOString().slice(0, 10), notes: "" }); setEditingId(null); }
  function closeForm() { resetExpForm(); resetIncForm(); setShowForm(false); }

  function submitExpense() {
    if (!expForm.name.trim() || !expForm.amount) return;
    const payload = { ...expForm, amount: Number(expForm.amount) };
    const next = editingId ? data.variableExpenses.map((e) => (e.id === editingId ? { ...e, ...payload } : e)) : [...data.variableExpenses, { id: uid(), ...payload }];
    update({ variableExpenses: next });
    toast(editingId ? "Expense updated" : "Expense recorded");
    closeForm();
  }
  function submitIncome() {
    if (!incForm.name.trim() || !incForm.amount) return;
    const payload = { ...incForm, amount: Number(incForm.amount) };
    const next = editingId ? data.incomes.map((e) => (e.id === editingId ? { ...e, ...payload } : e)) : [...data.incomes, { id: uid(), ...payload }];
    update({ incomes: next });
    toast(editingId ? "Income updated" : "Income recorded");
    closeForm();
  }
  function editExpense(e) { setExpForm({ name: e.name, amount: String(e.amount), category: e.category, dateISO: e.dateISO, paymentMethod: e.paymentMethod || "Cash", notes: e.notes || "" }); setEditingId(e.id); setFormKind("expense"); setShowForm(true); }
  function editIncome(e) { setIncForm({ name: e.name, amount: String(e.amount), category: e.category, dateISO: e.dateISO, notes: e.notes || "" }); setEditingId(e.id); setFormKind("income"); setShowForm(true); }
  async function removeExpense(id) {
    if (!await confirm("Delete this expense?")) return;
    update({ variableExpenses: data.variableExpenses.filter((e) => e.id !== id) });
    if (editingId === id) resetExpForm();
    toast("Expense deleted");
  }
  async function removeIncome(id) {
    if (!await confirm("Delete this income?")) return;
    update({ incomes: data.incomes.filter((e) => e.id !== id) });
    if (editingId === id) resetIncForm();
    toast("Income deleted");
  }

  return (
    <div>
      <Card t={t}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button onClick={() => { setKind("expense"); setEditingId(null); }} style={pillBtn(t, kind === "expense")}>🧾 Expenses</button>
          <button onClick={() => { setKind("income"); setEditingId(null); }} style={pillBtn(t, kind === "income")}>💰 Income</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setView("week")} style={pillBtn(t, view === "week")}>Week</button>
          <button onClick={() => setView("month")} style={pillBtn(t, view === "month")}>Month</button>
          <button onClick={() => setView("all")} style={pillBtn(t, view === "all")}>All</button>
        </div>
      </Card>

      {kind === "expense" ? (
        <>
          <Card t={t}>
            <SectionTitle t={t}>Expense Summary ({view === "week" ? "this week" : view === "month" ? "this month" : "all time"})</SectionTitle>
            <AnimatedMonoAmount t={t} value={totalExp} size={24} color={t.red} />
            <Row t={t} label="Daily average" value={-avgDaily} />
          </Card>

          {byCategory.length > 0 && (
            <Card t={t}>
              <SectionTitle t={t}>By Category</SectionTitle>
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

          <Card t={t}>
            <CollapsibleSection t={t} title="Transactions" count={filteredExpenses.length}>
              {filteredExpenses.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>No expenses recorded in this period.</div>}
              {filteredExpenses.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: t.textDim }}>{e.category} · {e.paymentMethod || "Other"} · {e.dateISO}</div>
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
            <SectionTitle t={t}>Income Summary ({view === "week" ? "this week" : view === "month" ? "this month" : "all time"})</SectionTitle>
            <AnimatedMonoAmount t={t} value={totalInc} size={24} color={t.green} />
          </Card>

          <Card t={t}>
            <CollapsibleSection t={t} title="Transactions" count={filteredIncomes.length}>
              {filteredIncomes.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>No income recorded in this period.</div>}
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

      <FormSheet t={t} open={showForm} onClose={closeForm} title={editingId ? "Edit Transaction" : "New Transaction"}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button onClick={() => setFormKind("expense")} style={pillBtn(t, formKind === "expense")}>🧾 Expense</button>
          <button onClick={() => setFormKind("income")} style={pillBtn(t, formKind === "income")}>💰 Income</button>
        </div>
        {formKind === "expense" ? (
          <>
            <Input t={t} placeholder="Name (e.g. Groceries, Gas)" value={expForm.name} onChange={(v) => setExpForm({ ...expForm, name: v })} />
            <Input t={t} placeholder="Amount (USD)" type="number" value={expForm.amount} onChange={(v) => setExpForm({ ...expForm, amount: v })} />
            <Select t={t} value={expForm.category} onChange={(v) => setExpForm({ ...expForm, category: v })} options={EXPENSE_CATEGORIES} />
            <Select t={t} value={expForm.paymentMethod} onChange={(v) => setExpForm({ ...expForm, paymentMethod: v })} options={PAYMENT_METHODS} />
            <Input t={t} type="date" value={expForm.dateISO} onChange={(v) => setExpForm({ ...expForm, dateISO: v })} />
            <Input t={t} placeholder="Note (optional)" value={expForm.notes} onChange={(v) => setExpForm({ ...expForm, notes: v })} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={submitExpense} style={btnPrimary(t)}>{editingId ? "Save changes" : "Add expense"}</button>
            </div>
          </>
        ) : (
          <>
            <Input t={t} placeholder="Name (e.g. Paycheck, Client payment)" value={incForm.name} onChange={(v) => setIncForm({ ...incForm, name: v })} />
            <Input t={t} placeholder="Amount (USD)" type="number" value={incForm.amount} onChange={(v) => setIncForm({ ...incForm, amount: v })} />
            <Select t={t} value={incForm.category} onChange={(v) => setIncForm({ ...incForm, category: v })} options={INCOME_CATEGORIES} />
            <Input t={t} type="date" value={incForm.dateISO} onChange={(v) => setIncForm({ ...incForm, dateISO: v })} />
            <Input t={t} placeholder="Note (optional)" value={incForm.notes} onChange={(v) => setIncForm({ ...incForm, notes: v })} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={submitIncome} style={btnPrimary(t)}>{editingId ? "Save changes" : "Add income"}</button>
            </div>
          </>
        )}
      </FormSheet>
    </div>
  );
}
