import React, { useState } from "react";
import { useVaultData } from "./hooks/useVaultData.js";
import { Header } from "./components/Header.jsx";
import { ConfigPanel } from "./components/ConfigPanel.jsx";
import { NavBar } from "./components/NavBar.jsx";
import { Card, btnGhost, LoadingSkeleton } from "./components/ui.jsx";
import { THEME } from "./utils/constants.js";
import { Dashboard } from "./components/Dashboard.jsx";
import { Movimientos } from "./components/Movimientos.jsx";
import { Pagos } from "./components/Pagos.jsx";
import { Metas } from "./components/Metas.jsx";
import { Inversion } from "./components/Inversion.jsx";
import { Pension } from "./components/Pension.jsx";
import { Seguros } from "./components/Seguros.jsx";
import { Documentos } from "./components/Documentos.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { ConfirmProvider } from "./components/ConfirmDialog.jsx";

function FAB({ tab, t }) {
  if (tab === "dashboard") return null;
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("vault-open-form"))}
      style={{
        position: "fixed", bottom: 100, right: "max(16px, calc(50vw - 224px))",
        width: 52, height: 52, borderRadius: "50%",
        background: t.gold, color: "#1B2230", border: "none",
        fontSize: 24, fontWeight: 700, cursor: "pointer",
        boxShadow: `0 4px 16px ${t.gold}66`,
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        animation: "vault-fabIn 0.4s ease",
      }}
    >
      +
    </button>
  );
}

export default function App() {
  const { data, save, loaded, justMigrated } = useVaultData();
  const [tab, setTab] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const t = dark ? THEME.dark : THEME.light;

  if (!loaded || !data) {
    return (
      <div style={{ background: THEME.dark.bg, minHeight: "100vh", fontFamily: "system-ui" }}>
        <div style={{ borderBottom: `1px solid ${THEME.dark.border}`, padding: "16px 18px", background: THEME.dark.bgElev }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: THEME.dark.gold, fontWeight: 700 }}>VAULT</div>
          <div style={{ fontSize: 13, color: THEME.dark.textDim, marginTop: 2 }}>Your financial vault</div>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 14px" }}>
          <LoadingSkeleton t={THEME.dark} />
          <LoadingSkeleton t={THEME.dark} lines={3} />
          <LoadingSkeleton t={THEME.dark} lines={5} />
          <LoadingSkeleton t={THEME.dark} lines={2} />
        </div>
      </div>
    );
  }

  const update = (patch) => save({ ...data, ...patch });

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "🏛️" },
    { id: "movimientos", label: "Transactions", icon: "💱" },
    { id: "pagos", label: "Bills", icon: "✅" },
    { id: "metas", label: "Goals", icon: "🎯" },
    { id: "inversion", label: "Investments", icon: "📈" },
    { id: "pension", label: "Retirement", icon: "🏦" },
    { id: "seguros", label: "Insurance", icon: "🛡️" },
    { id: "documentos", label: "Statements", icon: "📎" },
  ];

  return (
    <div className="vault-app" style={{ background: t.bg, color: t.text, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 84 }}>
      <ToastProvider t={t}>
        <ConfirmProvider t={t}>
          <Header t={t} dark={dark} setDark={setDark} configOpen={configOpen} setConfigOpen={setConfigOpen} />
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 14px" }}>
            {justMigrated && !bannerDismissed && (
              <Card t={t} style={{ borderColor: t.gold }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.gold, marginBottom: 4 }}>Data migrated ✓</div>
                <div style={{ fontSize: 12, color: t.textDim, lineHeight: 1.5 }}>
                  Your fixed expenses, variable expenses, and goals were imported from your previous VAULT. Review the payment day for each recurring bill — they now use a fixed day of the month.
                </div>
                <button onClick={() => setBannerDismissed(true)} style={{ ...btnGhost(t), marginTop: 8, fontSize: 11, padding: "6px 10px" }}>Got it</button>
              </Card>
            )}
            {configOpen && <ConfigPanel t={t} data={data} update={update} close={() => setConfigOpen(false)} />}
            <div key={tab} style={{ animation: "vault-crossfade 0.3s ease" }}>
              {tab === "dashboard" && <Dashboard t={t} data={data} />}
              {tab === "movimientos" && <Movimientos t={t} data={data} update={update} />}
              {tab === "pagos" && <Pagos t={t} data={data} update={update} />}
              {tab === "metas" && <Metas t={t} data={data} update={update} />}
              {tab === "inversion" && <Inversion t={t} data={data} update={update} />}
              {tab === "pension" && <Pension t={t} data={data} update={update} />}
              {tab === "seguros" && <Seguros t={t} data={data} update={update} />}
              {tab === "documentos" && <Documentos t={t} data={data} update={update} />}
            </div>
          </div>
          <NavBar t={t} tabs={tabs} tab={tab} setTab={setTab} />
          <FAB key={`fab-${tab}`} tab={tab} t={t} />
        </ConfirmProvider>
      </ToastProvider>
    </div>
  );
}
