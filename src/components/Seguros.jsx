import React, { useState } from "react";
import { Card, SectionTitle, Row, Field, Input, Badge, btnPrimary, btnGhost, iconBtn, pillBtn } from "./ui.jsx";
import { uid, daysUntil } from "../utils/calculations.js";

export function Seguros({ t, data, update }) {
  const [sub, setSub] = useState("vida");
  const [lifeForm, setLifeForm] = useState({ company: "", premium: "", coverage: "", beneficiaries: "", renewalDateISO: "" });
  const [healthForm, setHealthForm] = useState({ company: "", plan: "", coverage: "", deductible: "", renewalDateISO: "" });
  const [editingId, setEditingId] = useState(null);

  function resetLife() { setLifeForm({ company: "", premium: "", coverage: "", beneficiaries: "", renewalDateISO: "" }); setEditingId(null); }
  function resetHealth() { setHealthForm({ company: "", plan: "", coverage: "", deductible: "", renewalDateISO: "" }); setEditingId(null); }

  function submitLife() {
    if (!lifeForm.company.trim()) return;
    const payload = { ...lifeForm, premium: Number(lifeForm.premium) || 0 };
    const next = editingId ? data.insuranceLife.map((x) => (x.id === editingId ? { ...x, ...payload } : x)) : [...data.insuranceLife, { id: uid(), ...payload }];
    update({ insuranceLife: next }); resetLife();
  }
  function submitHealth() {
    if (!healthForm.company.trim()) return;
    const payload = { ...healthForm, deductible: Number(healthForm.deductible) || 0 };
    const next = editingId ? data.insuranceHealth.map((x) => (x.id === editingId ? { ...x, ...payload } : x)) : [...data.insuranceHealth, { id: uid(), ...payload }];
    update({ insuranceHealth: next }); resetHealth();
  }
  function editLife(x) { setLifeForm({ company: x.company, premium: String(x.premium), coverage: x.coverage, beneficiaries: x.beneficiaries, renewalDateISO: x.renewalDateISO || "" }); setEditingId(x.id); }
  function editHealth(x) { setHealthForm({ company: x.company, plan: x.plan, coverage: x.coverage, deductible: String(x.deductible), renewalDateISO: x.renewalDateISO || "" }); setEditingId(x.id); }
  function removeLife(id) { update({ insuranceLife: data.insuranceLife.filter((x) => x.id !== id) }); if (editingId === id) resetLife(); }
  function removeHealth(id) { update({ insuranceHealth: data.insuranceHealth.filter((x) => x.id !== id) }); if (editingId === id) resetHealth(); }

  function renewalBadge(dateISO) {
    if (!dateISO) return null;
    const d = daysUntil(new Date(dateISO));
    const color = d < 0 ? t.red : d <= 30 ? t.gold : t.green;
    const label = d < 0 ? `venció hace ${Math.abs(d)}d` : d === 0 ? "renueva hoy" : `renueva en ${d}d`;
    return <Badge t={t} color={color}>{label}</Badge>;
  }

  return (
    <div>
      <Card t={t}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setSub("vida"); setEditingId(null); }} style={pillBtn(t, sub === "vida")}>🛡️ Vida</button>
          <button onClick={() => { setSub("medico"); setEditingId(null); }} style={pillBtn(t, sub === "medico")}>⚕️ Médico</button>
        </div>
      </Card>

      {sub === "vida" ? (
        <>
          {data.insuranceLife.map((x) => (
            <Card t={t} key={x.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{x.company}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => editLife(x)} style={iconBtn(t)}>✏️</button>
                  <button onClick={() => removeLife(x.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
              <Row t={t} label="Prima" value={x.premium} />
              <Row t={t} label="Cobertura" valueNode={<span>{x.coverage}</span>} />
              <Row t={t} label="Beneficiarios" valueNode={<span>{x.beneficiaries}</span>} />
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: t.textDim }}>Renovación: {x.renewalDateISO || "—"}</span>
                {renewalBadge(x.renewalDateISO)}
              </div>
            </Card>
          ))}
          <Card t={t}>
            <SectionTitle t={t}>{editingId ? "Editar seguro de vida" : "Agregar seguro de vida"}</SectionTitle>
            <Input t={t} placeholder="Compañía" value={lifeForm.company} onChange={(v) => setLifeForm({ ...lifeForm, company: v })} />
            <Input t={t} placeholder="Prima (USD)" type="number" value={lifeForm.premium} onChange={(v) => setLifeForm({ ...lifeForm, premium: v })} />
            <Input t={t} placeholder="Cobertura (ej. $500,000)" value={lifeForm.coverage} onChange={(v) => setLifeForm({ ...lifeForm, coverage: v })} />
            <Input t={t} placeholder="Beneficiarios" value={lifeForm.beneficiaries} onChange={(v) => setLifeForm({ ...lifeForm, beneficiaries: v })} />
            <Field t={t} label="Fecha de renovación"><Input t={t} type="date" value={lifeForm.renewalDateISO} onChange={(v) => setLifeForm({ ...lifeForm, renewalDateISO: v })} /></Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submitLife} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Agregar"}</button>
              {editingId && <button onClick={resetLife} style={btnGhost(t)}>Cancelar</button>}
            </div>
          </Card>
        </>
      ) : (
        <>
          {data.insuranceHealth.map((x) => (
            <Card t={t} key={x.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{x.company}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => editHealth(x)} style={iconBtn(t)}>✏️</button>
                  <button onClick={() => removeHealth(x.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
              <Row t={t} label="Plan" valueNode={<span>{x.plan}</span>} />
              <Row t={t} label="Cobertura" valueNode={<span>{x.coverage}</span>} />
              <Row t={t} label="Deducible" value={x.deductible} />
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: t.textDim }}>Renovación: {x.renewalDateISO || "—"}</span>
                {renewalBadge(x.renewalDateISO)}
              </div>
            </Card>
          ))}
          <Card t={t}>
            <SectionTitle t={t}>{editingId ? "Editar seguro médico" : "Agregar seguro médico"}</SectionTitle>
            <Input t={t} placeholder="Compañía" value={healthForm.company} onChange={(v) => setHealthForm({ ...healthForm, company: v })} />
            <Input t={t} placeholder="Plan" value={healthForm.plan} onChange={(v) => setHealthForm({ ...healthForm, plan: v })} />
            <Input t={t} placeholder="Cobertura" value={healthForm.coverage} onChange={(v) => setHealthForm({ ...healthForm, coverage: v })} />
            <Input t={t} placeholder="Deducible (USD)" type="number" value={healthForm.deductible} onChange={(v) => setHealthForm({ ...healthForm, deductible: v })} />
            <Field t={t} label="Fecha de renovación"><Input t={t} type="date" value={healthForm.renewalDateISO} onChange={(v) => setHealthForm({ ...healthForm, renewalDateISO: v })} /></Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submitHealth} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Agregar"}</button>
              {editingId && <button onClick={resetHealth} style={btnGhost(t)}>Cancelar</button>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

