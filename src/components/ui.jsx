import React from "react";
import { fmt } from "../utils/calculations.js";

/* Átomos de UI compartidos por todos los componentes */
export function Card({ t, children, style }) {
  return <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 12, ...style }}>{children}</div>;
}
export function SectionTitle({ t, children }) {
  return <div style={{ fontSize: 11, letterSpacing: 1.5, color: t.textDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;
}
export function MonoAmount({ t, value, size = 22, color }) {
  return <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: size, fontWeight: 700, color: color || t.text }}>{fmt(value)}</span>;
}
export function Row({ t, label, value, valueNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: t.textDim }}>{label}</span>
      {valueNode ? valueNode : <span style={{ fontFamily: "ui-monospace, monospace", color: value < 0 ? t.red : t.text }}>{value < 0 ? "-" : ""}{fmt(Math.abs(value))}</span>}
    </div>
  );
}
export function Field({ t, label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: t.textDim, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
export function Input({ t, value, onChange, placeholder, type = "text" }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 12px", marginBottom: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14, boxSizing: "border-box" }} />
  );
}
export function TextArea({ t, value, onChange, placeholder }) {
  return (
    <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={2}
      style={{ width: "100%", padding: "10px 12px", marginBottom: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
  );
}
export function Select({ t, value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 12px", marginBottom: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14 }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
export function ProgressBar({ t, pctValue, color }) {
  return (
    <div style={{ background: t.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pctValue))}%`, background: color || t.gold, height: "100%" }} />
    </div>
  );
}
export function Badge({ t, children, color }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 20, padding: "2px 8px" }}>{children}</span>;
}
export const btnPrimary = (t) => ({ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: t.gold, color: "#1B2230", fontWeight: 700, fontSize: 13, cursor: "pointer" });
export const btnGhost = (t) => ({ padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, fontSize: 13, cursor: "pointer" });
export const btnSmall = (t, color) => ({ padding: "5px 10px", borderRadius: 6, border: `1px solid ${color}`, background: "transparent", color, fontSize: 11, fontWeight: 600, cursor: "pointer" });
export const iconBtn = (t) => ({ background: "none", border: "none", fontSize: 14, cursor: "pointer", padding: 2 });
export const pillBtn = (t, active) => ({ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${t.border}`, background: active ? t.gold : "transparent", color: active ? "#1B2230" : t.text, fontSize: 12, fontWeight: 600, cursor: "pointer" });
