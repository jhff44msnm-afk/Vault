import React from "react";

export function Header({ t, dark, setDark, configOpen, setConfigOpen }) {
  return (
    <div style={{ borderBottom: `1px solid ${t.border}`, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: t.bgElev }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 3, color: t.gold, fontWeight: 700 }}>VAULT</div>
        <div style={{ fontSize: 13, color: t.textDim, marginTop: 2 }}>Tu bóveda financiera</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setConfigOpen(!configOpen)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 20, width: 40, height: 40, fontSize: 16, color: t.text, cursor: "pointer" }}>⚙️</button>
        <button onClick={() => setDark(!dark)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 20, width: 40, height: 40, fontSize: 16, color: t.text, cursor: "pointer" }}>{dark ? "☀️" : "🌙"}</button>
      </div>
    </div>
  );
}

