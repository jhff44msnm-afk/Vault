import React from "react";

export function NavBar({ t, tabs, tab, setTab }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.bgElev, borderTop: `1px solid ${t.border}`, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", overflowX: "auto", padding: "8px 4px", gap: 2 }}>
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tab === tb.id ? t.gold : t.textDim, fontSize: 10.5, cursor: "pointer", padding: "4px 9px", fontWeight: tab === tb.id ? 700 : 400, flex: "0 0 auto", minWidth: 58 }}>
            <span style={{ fontSize: 17 }}>{tb.icon}</span>
            <span style={{ whiteSpace: "nowrap" }}>{tb.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

