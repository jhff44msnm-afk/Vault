import React, { useState, useRef } from "react";
import { Card, SectionTitle, Input, Select, TextArea, btnPrimary, btnGhost, iconBtn } from "./ui.jsx";
import { STATEMENT_CATEGORIES } from "../utils/constants.js";
import { uid } from "../utils/calculations.js";

export function Documentos({ t, data, update }) {
  const [form, setForm] = useState({ name: "", category: "Tarjeta de crédito", dateISO: new Date().toISOString().slice(0, 10), notes: "", fileName: "" });
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef(null);

  function resetForm() { setForm({ name: "", category: "Tarjeta de crédito", dateISO: new Date().toISOString().slice(0, 10), notes: "", fileName: "" }); setEditingId(null); }
  function submit() {
    if (!form.name.trim()) return;
    const next = editingId ? data.statements.map((s) => (s.id === editingId ? { ...s, ...form } : s)) : [...data.statements, { id: uid(), ...form }];
    update({ statements: next });
    resetForm();
  }
  function edit(s) { setForm({ name: s.name, category: s.category, dateISO: s.dateISO, notes: s.notes || "", fileName: s.fileName || "" }); setEditingId(s.id); }
  function remove(id) { update({ statements: data.statements.filter((s) => s.id !== id) }); if (editingId === id) resetForm(); }
  function onFilePicked(e) { const f = e.target.files?.[0]; if (f) setForm({ ...form, fileName: f.name }); }

  const sorted = data.statements.slice().sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

  return (
    <div>
      <div style={{ fontSize: 11.5, color: t.textDim, lineHeight: 1.5, padding: "0 4px", marginBottom: 8 }}>
        Guarda una referencia de cada estado de cuenta y anota manualmente lo importante (saldo, vencimiento, cargos a revisar). La extracción automática (OCR) queda lista para una versión futura.
      </div>

      <Card t={t}>
        <SectionTitle t={t}>{editingId ? "Editar registro" : "Adjuntar estado de cuenta"}</SectionTitle>
        <Input t={t} placeholder="Nombre (ej. BBVA Crédito Oro - Junio)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Select t={t} value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={STATEMENT_CATEGORIES} />
        <Input t={t} type="date" value={form.dateISO} onChange={(v) => setForm({ ...form, dateISO: v })} />
        <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost(t), width: "100%", marginBottom: 8 }}>
          {form.fileName ? `Archivo: ${form.fileName}` : "Seleccionar archivo (PDF o imagen)"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={onFilePicked} style={{ display: "none" }} />
        <div style={{ fontSize: 10.5, color: t.textDim, marginBottom: 8 }}>Por ahora solo se guarda el nombre del archivo como referencia; consérvalo en tu teléfono o Drive.</div>
        <TextArea t={t} placeholder="Notas (saldo, fecha límite de pago, cargos a revisar...)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={submit} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Guardar"}</button>
          {editingId && <button onClick={resetForm} style={btnGhost(t)}>Cancelar</button>}
        </div>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Historial</SectionTitle>
        {sorted.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin estados de cuenta registrados.</div>}
        {sorted.map((s) => (
          <div key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => edit(s)} style={iconBtn(t)}>✏️</button>
                <button onClick={() => remove(s.id)} style={iconBtn(t)}>🗑️</button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: t.textDim }}>{s.category} · {s.dateISO}{s.fileName ? ` · 📎 ${s.fileName}` : ""}</div>
            {s.notes && <div style={{ fontSize: 12, color: t.text, marginTop: 4 }}>{s.notes}</div>}
          </div>
        ))}
      </Card>
    </div>
  );
}
