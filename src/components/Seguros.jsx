import React, { useState, useEffect } from "react";
import { Card, SectionTitle, Row, Field, Input, Badge, FormSheet, btnPrimary, iconBtn, pillBtn } from "./ui.jsx";
import { uid, daysUntil } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Seguros({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [sub, setSub] = useState("life");
  const [lifeForm, setLifeForm] = useState({ company: "", premium: "", coverage: "", beneficiaries: "", renewalDateISO: "" });
  const [healthForm, setHealthForm] = useState({ company: "", plan: "", coverage: "", deductible: "", renewalDateISO: "" });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formSub, setFormSub] = useState("life");

  useEffect(() => {
    const handler = () => { resetLife(); resetHealth(); setFormSub(sub); setShowForm(true); };
    window.addEventListener("vault-open-form", handler);
    return () => window.removeEventListener("vault-open-form", handler);
  }, [sub]);

  function resetLife() { setLifeForm({ company: "", premium: "", coverage: "", beneficiaries: "", renewalDateISO: "" }); setEditingId(null); }
  function resetHealth() { setHealthForm({ company: "", plan: "", coverage: "", deductible: "", renewalDateISO: "" }); setEditingId(null); }
  function closeForm() { resetLife(); resetHealth(); setShowForm(false); }

  function submitLife() {
    if (!lifeForm.company.trim()) return;
    const payload = { ...lifeForm, premium: Number(lifeForm.premium) || 0 };
    const next = editingId ? data.insuranceLife.map((x) => (x.id === editingId ? { ...x, ...payload } : x)) : [...data.insuranceLife, { id: uid(), ...payload }];
    update({ insuranceLife: next });
    toast(editingId ? "Insurance updated" : "Insurance added");
    closeForm();
  }
  function submitHealth() {
    if (!healthForm.company.trim()) return;
    const payload = { ...healthForm, deductible: Number(healthForm.deductible) || 0 };
    const next = editingId ? data.insuranceHealth.map((x) => (x.id === editingId ? { ...x, ...payload } : x)) : [...data.insuranceHealth, { id: uid(), ...payload }];
    update({ insuranceHealth: next });
    toast(editingId ? "Insurance updated" : "Insurance added");
    closeForm();
  }
  function editLife(x) { setLifeForm({ company: x.company, premium: String(x.premium), coverage: x.coverage, beneficiaries: x.beneficiaries, renewalDateISO: x.renewalDateISO || "" }); setEditingId(x.id); setFormSub("life"); setShowForm(true); }
  function editHealth(x) { setHealthForm({ company: x.company, plan: x.plan, coverage: x.coverage, deductible: String(x.deductible), renewalDateISO: x.renewalDateISO || "" }); setEditingId(x.id); setFormSub("health"); setShowForm(true); }
  async function removeLife(id) {
    if (!await confirm("Delete this insurance?")) return;
    update({ insuranceLife: data.insuranceLife.filter((x) => x.id !== id) });
    if (editingId === id) resetLife();
    toast("Insurance deleted");
  }
  async function removeHealth(id) {
    if (!await confirm("Delete this insurance?")) return;
    update({ insuranceHealth: data.insuranceHealth.filter((x) => x.id !== id) });
    if (editingId === id) resetHealth();
    toast("Insurance deleted");
  }

  function renewalBadge(dateISO) {
    if (!dateISO) return null;
    const d = daysUntil(new Date(dateISO));
    const color = d < 0 ? t.red : d <= 30 ? t.gold : t.green;
    const label = d < 0 ? `expired ${Math.abs(d)}d ago` : d === 0 ? "renews today" : `renews in ${d}d`;
    return <Badge t={t} color={color} pulse={d <= 30}>{label}</Badge>;
  }

  return (
    <div>
      <Card t={t}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setSub("life"); setEditingId(null); }} style={pillBtn(t, sub === "life")}>🛡️ Life</button>
          <button onClick={() => { setSub("health"); setEditingId(null); }} style={pillBtn(t, sub === "health")}>⚕️ Health</button>
        </div>
      </Card>

      {sub === "life" ? (
        <>
          {data.insuranceLife.length === 0 && (
            <Card t={t}>
              <div style={{ fontSize: 13, color: t.textDim, textAlign: "center", padding: "12px 0" }}>No life insurance policies registered. Tap + to add one.</div>
            </Card>
          )}
          {data.insuranceLife.map((x) => (
            <Card t={t} key={x.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{x.company}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => editLife(x)} style={iconBtn(t)}>✏️</button>
                  <button onClick={() => removeLife(x.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
              <Row t={t} label="Premium" value={x.premium} />
              <Row t={t} label="Coverage" valueNode={<span>{x.coverage}</span>} />
              <Row t={t} label="Beneficiaries" valueNode={<span>{x.beneficiaries}</span>} />
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: t.textDim }}>Renewal: {x.renewalDateISO || "—"}</span>
                {renewalBadge(x.renewalDateISO)}
              </div>
            </Card>
          ))}
        </>
      ) : (
        <>
          {data.insuranceHealth.length === 0 && (
            <Card t={t}>
              <div style={{ fontSize: 13, color: t.textDim, textAlign: "center", padding: "12px 0" }}>No health insurance policies registered. Tap + to add one.</div>
            </Card>
          )}
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
              <Row t={t} label="Coverage" valueNode={<span>{x.coverage}</span>} />
              <Row t={t} label="Deductible" value={x.deductible} />
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: t.textDim }}>Renewal: {x.renewalDateISO || "—"}</span>
                {renewalBadge(x.renewalDateISO)}
              </div>
            </Card>
          ))}
        </>
      )}

      <FormSheet t={t} open={showForm} onClose={closeForm} title={editingId ? "Edit Insurance" : "Add Insurance"}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button onClick={() => setFormSub("life")} style={pillBtn(t, formSub === "life")}>🛡️ Life</button>
          <button onClick={() => setFormSub("health")} style={pillBtn(t, formSub === "health")}>⚕️ Health</button>
        </div>
        {formSub === "life" ? (
          <>
            <Input t={t} placeholder="Company" value={lifeForm.company} onChange={(v) => setLifeForm({ ...lifeForm, company: v })} />
            <Input t={t} placeholder="Premium (USD)" type="number" value={lifeForm.premium} onChange={(v) => setLifeForm({ ...lifeForm, premium: v })} />
            <Input t={t} placeholder="Coverage (e.g. $500,000)" value={lifeForm.coverage} onChange={(v) => setLifeForm({ ...lifeForm, coverage: v })} />
            <Input t={t} placeholder="Beneficiaries" value={lifeForm.beneficiaries} onChange={(v) => setLifeForm({ ...lifeForm, beneficiaries: v })} />
            <Field t={t} label="Renewal date"><Input t={t} type="date" value={lifeForm.renewalDateISO} onChange={(v) => setLifeForm({ ...lifeForm, renewalDateISO: v })} /></Field>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={submitLife} style={btnPrimary(t)}>{editingId ? "Save changes" : "Add"}</button>
            </div>
          </>
        ) : (
          <>
            <Input t={t} placeholder="Company" value={healthForm.company} onChange={(v) => setHealthForm({ ...healthForm, company: v })} />
            <Input t={t} placeholder="Plan" value={healthForm.plan} onChange={(v) => setHealthForm({ ...healthForm, plan: v })} />
            <Input t={t} placeholder="Coverage" value={healthForm.coverage} onChange={(v) => setHealthForm({ ...healthForm, coverage: v })} />
            <Input t={t} placeholder="Deductible (USD)" type="number" value={healthForm.deductible} onChange={(v) => setHealthForm({ ...healthForm, deductible: v })} />
            <Field t={t} label="Renewal date"><Input t={t} type="date" value={healthForm.renewalDateISO} onChange={(v) => setHealthForm({ ...healthForm, renewalDateISO: v })} /></Field>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={submitHealth} style={btnPrimary(t)}>{editingId ? "Save changes" : "Add"}</button>
            </div>
          </>
        )}
      </FormSheet>
    </div>
  );
}
