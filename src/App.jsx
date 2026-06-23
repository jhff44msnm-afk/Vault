import React, { useState } from "react";
import { useVaultData } from "./hooks/useVaultData.js";
import { Header } from "./components/Header.jsx";
import { ConfigPanel } from "./components/ConfigPanel.jsx";
import { NavBar } from "./components/NavBar.jsx";
import { Card, btnGhost } from "./components/ui.jsx";
import { THEME } from "./utils/constants.js";
import { Dashboard } from "./components/Dashboard.jsx";
import { Movimientos } from "./components/Movimientos.jsx";
import { Pagos } from "./components/Pagos.jsx";
import { Metas } from "./components/Metas.jsx";
import { Inversion } from "./components/Inversion.jsx";
import { Pension } from "./components/Pension.jsx";
import { Seguros } from "./components/Seguros.jsx";
import { Documentos } from "./components/Documentos.jsx";

/* ============================================================
   VAULT — Bóveda Financiera Personal
   Panel · Movimientos · Pagos · Metas · Inversión · Pensión · Seguros · Documentos
   ============================================================ */
export default function App() {
  const { data, save, loaded, justMigrated } = useVaultData();
  const [tab, setTab] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const t = dark ? THEME.dark : THEME.light;

  if (!loaded || !data) {
    return (
      <div style={{ background: THEME.dark.bg, color: THEME.dark.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
        Cargando VAULT...
      </div>
    );
  }

  const update = (patch) => save({ ...data, ...patch });

  const tabs = [
    { id: "dashboard", label: "Panel", icon: "🏛️" },
    { id: "movimientos", label: "Movimientos", icon: "💱" },
    { id: "pagos", label: "Pagos", icon: "✅" },
    { id: "metas", label: "Metas", icon: "🎯" },
    { id: "inversion", label: "Inversión", icon: "📈" },
    { id: "pension", label: "Pensión", icon: "🏦" },
    { id: "seguros", label: "Seguros", icon: "🛡️" },
    { id: "documentos", label: "Documentos", icon: "📎" },
  ];

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 84 }}>
      <Header t={t} dark={dark} setDark={setDark} configOpen={configOpen} setConfigOpen={setConfigOpen} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 14px" }}>
        {justMigrated && !bannerDismissed && (
          <Card t={t} style={{ borderColor: t.gold }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.gold, marginBottom: 4 }}>Datos migrados ✓</div>
            <div style={{ fontSize: 12, color: t.textDim, lineHeight: 1.5 }}>
              Tus gastos fijos, variables y metas se trajeron de tu VAULT anterior. Revisa el día de pago de cada Pago recurrente — antes funcionaban por intervalo de días, ahora son por fecha fija del mes.
            </div>
            <button onClick={() => setBannerDismissed(true)} style={{ ...btnGhost(t), marginTop: 8, fontSize: 11, padding: "6px 10px" }}>Entendido</button>
          </Card>
        )}
        {configOpen && <ConfigPanel t={t} data={data} update={update} close={() => setConfigOpen(false)} />}
        {tab === "dashboard" && <Dashboard t={t} data={data} />}
        {tab === "movimientos" && <Movimientos t={t} data={data} update={update} />}
        {tab === "pagos" && <Pagos t={t} data={data} update={update} />}
        {tab === "metas" && <Metas t={t} data={data} update={update} />}
        {tab === "inversion" && <Inversion t={t} data={data} update={update} />}
        {tab === "pension" && <Pension t={t} data={data} update={update} />}
        {tab === "seguros" && <Seguros t={t} data={data} update={update} />}
        {tab === "documentos" && <Documentos t={t} data={data} update={update} />}
      </div>
      <NavBar t={t} tabs={tabs} tab={tab} setTab={setTab} />
    </div>
  );
}
