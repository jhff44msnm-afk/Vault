import React, { useState, useEffect, useRef } from "react";
import { fmt } from "../utils/calculations.js";

/* === Animated value hook === */
function useAnimatedValue(target, duration = 500) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (Math.abs(from - target) < 0.01) { setDisplay(target); return; }
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      else setDisplay(target);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return display;
}

/* === Átomos de UI === */

export function Card({ t, children, style, id }) {
  return (
    <div id={id} className="vault-card" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ t, children }) {
  return <div style={{ fontSize: 11, letterSpacing: 1.5, color: t.textDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;
}

export function MonoAmount({ t, value, size = 22, color }) {
  return <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: size, fontWeight: 700, color: color || t.text }}>{fmt(value)}</span>;
}

export function AnimatedMonoAmount({ t, value, size = 22, color }) {
  const animatedValue = useAnimatedValue(value);
  return <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: size, fontWeight: 700, color: color || t.text, transition: "color 0.3s ease" }}>{fmt(animatedValue)}</span>;
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
  const pct = Math.min(100, Math.max(0, pctValue));
  return (
    <div style={{ background: t.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`,
        background: color || t.gold,
        height: "100%",
        borderRadius: 6,
        color: color || t.gold,
        animation: "vault-progressFill 0.8s ease both",
        boxShadow: pct > 0 ? `0 0 8px ${color || t.gold}44` : "none",
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

export function Badge({ t, children, color, pulse }) {
  return (
    <span className={pulse ? "vault-badge-pulse" : undefined} style={{ fontSize: 10.5, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 20, padding: "2px 8px", display: "inline-block" }}>
      {children}
    </span>
  );
}

export function CollapsibleSection({ t, title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        width: "100%", padding: "0 0 10px 0", background: "none", border: "none",
        cursor: "pointer", color: t.textDim, fontSize: 11, letterSpacing: 1.5,
        fontWeight: 700, textTransform: "uppercase",
      }}>
        <span>{title}{count !== undefined ? ` (${count})` : ""}</span>
        <span style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", fontSize: 8, opacity: 0.7 }}>▼</span>
      </button>
      <div className={`vault-collapse${open ? " vault-collapse-open" : ""}`}>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ t, lines = 4 }) {
  return (
    <div className="vault-card" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="vault-skeleton" style={{
          height: i === 0 ? 20 : 14,
          backgroundColor: t.border,
          borderRadius: 6,
          marginBottom: i < lines - 1 ? 12 : 0,
          width: i === 0 ? "50%" : i === lines - 1 ? "35%" : `${85 - i * 8}%`,
        }} />
      ))}
    </div>
  );
}

export function FormSheet({ t, open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9997 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", animation: "vault-overlayIn 0.2s ease" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        maxWidth: 480, margin: "0 auto",
        background: t.card, borderRadius: "20px 20px 0 0",
        padding: `20px 16px calc(20px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: "85vh", overflowY: "auto",
        animation: "vault-sheetUp 0.3s ease",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: t.textDim, cursor: "pointer", padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const btnPrimary = (t) => ({ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: t.gold, color: "#1B2230", fontWeight: 700, fontSize: 13, cursor: "pointer" });
export const btnGhost = (t) => ({ padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, fontSize: 13, cursor: "pointer" });
export const btnSmall = (t, color) => ({ padding: "5px 10px", borderRadius: 6, border: `1px solid ${color}`, background: "transparent", color, fontSize: 11, fontWeight: 600, cursor: "pointer" });
export const iconBtn = (t) => ({ background: "none", border: "none", fontSize: 14, cursor: "pointer", padding: 2 });
export const pillBtn = (t, active) => ({ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${t.border}`, background: active ? t.gold : "transparent", color: active ? "#1B2230" : t.text, fontSize: 12, fontWeight: 600, cursor: "pointer" });
