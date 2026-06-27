import React, { useState, useRef } from "react";
import { Card, SectionTitle, Field, Input, btnPrimary, btnGhost, iconBtn } from "./ui.jsx";
import { DEFAULT_DATA } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function ConfigPanel({ t, data, update, close }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [inflation, setInflation] = useState(String(data.inflationRate ?? 3));
  const [avKey, setAvKey] = useState(data.apiKeys?.alphaVantage || "");
  const fileRef = useRef(null);

  function saveConfig() {
    update({ inflationRate: Number(inflation) || 0, apiKeys: { ...data.apiKeys, alphaVantage: avKey.trim() } });
    toast("Settings saved");
    close();
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Backup exported", "info");
  }

  async function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (await confirm("This will replace all your current data with the file contents. Continue?", "Import")) {
          update({ ...DEFAULT_DATA, ...parsed });
          toast("Data imported successfully");
          close();
        }
      } catch {
        toast("The file is not a valid VAULT backup.", "error");
      }
    };
    reader.readAsText(file);
  }

  return (
    <Card t={t}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionTitle t={t}>Settings</SectionTitle>
        <button onClick={close} style={iconBtn(t)}>✕</button>
      </div>
      <Field t={t} label="Estimated annual inflation rate (%)">
        <Input t={t} type="number" value={inflation} onChange={setInflation} />
      </Field>
      <Field t={t} label="Alpha Vantage API key (optional, for live prices)">
        <Input t={t} value={avKey} onChange={setAvKey} placeholder="Paste your free API key" />
      </Field>
      <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5, marginBottom: 10 }}>
        Your API key is stored only on this device (localStorage), never sent to Anthropic. Get one free at alphavantage.co. The free plan allows ~5 queries per minute.
      </div>
      <button onClick={saveConfig} style={{ ...btnPrimary(t), width: "100%", marginBottom: 12 }}>Save settings</button>

      <SectionTitle t={t}>Data Backup</SectionTitle>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportBackup} style={{ ...btnGhost(t), flex: 1 }}>Export (.json)</button>
        <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost(t), flex: 1 }}>Import (.json)</button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={importBackup} style={{ display: "none" }} />

      <div style={{ marginTop: 20 }}>
        <SectionTitle t={t}>Danger Zone</SectionTitle>
        <button onClick={async () => {
          if (!await confirm("This will permanently delete ALL your data (transactions, bills, goals, investments, statements, etc.). This cannot be undone. Are you sure?", "Reset everything")) return;
          update({ ...DEFAULT_DATA });
          toast("All data has been reset");
          close();
        }} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: `1px solid ${t.red}`, background: "transparent", color: t.red, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Reset all data
        </button>
        <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 6, lineHeight: 1.5 }}>
          This will erase everything and restore the app to its initial state. Export a backup first if you want to keep your data.
        </div>
      </div>
    </Card>
  );
}
