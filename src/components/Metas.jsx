import React, { useState } from "react";
import { Card, SectionTitle, Row, ProgressBar, Input, btnPrimary, btnGhost, btnSmall, iconBtn } from "./ui.jsx";
import { fmt, pctStr, uid } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Metas({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", targetAmount: "", savedAmount: "0", deadlineISO: "" });
  const [editingId, setEditingId] = useState(null);

  function resetForm() { setForm({ name: "", targetAmount: "", savedAmount: "0", deadlineISO: "" }); setEditingId(null); }
  function submit() {
    if (!form.name.trim() || !form.targetAmount) return;
    const payload = { name: form.name, targetAmount: Number(form.targetAmount), savedAmount: Number(form.savedAmount || 0), deadlineISO: form.deadlineISO };
    const next = editingId ? data.goals.map((g) => (g.id === editingId ? { ...g, ...payload } : g)) : [...data.goals, { id: uid(), ...payload }];
    update({ goals: next });
    toast(editingId ? "Meta actualizada" : "Meta creada");
    resetForm();
  }
  function edit(g) { setForm({ name: g.name, targetAmount: String(g.targetAmount), savedAmount: String(g.savedAmount), deadlineISO: g.deadlineISO || "" }); setEditingId(g.id); }
  async function remove(id) {
    if (!await confirm("¿Eliminar esta meta?")) return;
    update({ goals: data.goals.filter((g) => g.id !== id) });
    if (editingId === id) resetForm();
    toast("Meta eliminada");
  }
  function addToGoal(id, amount) {
    update({ goals: data.goals.map((g) => (g.id === id ? { ...g, savedAmount: g.savedAmount + amount } : g)) });
    toast(`+$${amount} abonado`);
  }

  return (
    <div>
      {data.goals.map((g) => {
        const p = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
        let monthsLeft = null, monthlyRequired = null;
        if (g.deadlineISO) {
          monthsLeft = Math.max(1, Math.ceil((new Date(g.deadlineISO) - new Date()) / (30 * 86400000)));
          monthlyRequired = (g.targetAmount - g.savedAmount) / monthsLeft;
        }
        return (
          <Card t={t} key={g.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => edit(g)} style={iconBtn(t)}>✏️</button>
                <button onClick={() => remove(g.id)} style={iconBtn(t)}>🗑️</button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: t.textDim, margin: "4px 0" }}>{g.deadlineISO ? `Fecha objetivo: ${g.deadlineISO}` : "Sin fecha objetivo"}</div>
            <div style={{ margin: "8px 0" }}><ProgressBar t={t} pctValue={p} color={p >= 100 ? t.green : t.gold} /></div>
            <Row t={t} label="Ahorrado" value={g.savedAmount} />
            <Row t={t} label="Meta" value={g.targetAmount} />
            <Row t={t} label="Completado" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{pctStr(p)}</span>} />
            {monthlyRequired !== null && monthlyRequired > 0 && (
              <div style={{ fontSize: 12, color: t.blue, marginTop: 4 }}>Ahorro requerido: {fmt(monthlyRequired)}/mes para llegar a tiempo ({monthsLeft} {monthsLeft === 1 ? "mes" : "meses"} restantes).</div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => addToGoal(g.id, 20)} style={btnSmall(t, t.gold)}>+ $20</button>
              <button onClick={() => addToGoal(g.id, 50)} style={btnSmall(t, t.gold)}>+ $50</button>
              <button onClick={() => addToGoal(g.id, 100)} style={btnSmall(t, t.gold)}>+ $100</button>
            </div>
          </Card>
        );
      })}

      <Card t={t} id="vault-form" style={{ animation: "vault-slideUp 0.4s ease both" }}>
        <SectionTitle t={t}>{editingId ? "Editar meta" : "Nueva meta"}</SectionTitle>
        <Input t={t} placeholder="Nombre (ej. Fondo de emergencia)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input t={t} placeholder="Monto objetivo (USD)" type="number" value={form.targetAmount} onChange={(v) => setForm({ ...form, targetAmount: v })} />
        <Input t={t} placeholder="Ya ahorrado (USD)" type="number" value={form.savedAmount} onChange={(v) => setForm({ ...form, savedAmount: v })} />
        <Input t={t} type="date" value={form.deadlineISO} onChange={(v) => setForm({ ...form, deadlineISO: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={submit} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Crear meta"}</button>
          {editingId && <button onClick={resetForm} style={btnGhost(t)}>Cancelar</button>}
        </div>
      </Card>
    </div>
  );
}
