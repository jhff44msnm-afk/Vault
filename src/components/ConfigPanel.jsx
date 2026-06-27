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
    toast("Configuración guardada");
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
    toast("Respaldo exportado", "info");
  }

  async function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (await confirm("Esto reemplazará todos tus datos actuales con los del archivo. ¿Continuar?", "Importar")) {
          update({ ...DEFAULT_DATA, ...parsed });
          toast("Datos importados correctamente");
          close();
        }
      } catch {
        toast("El archivo no es un respaldo válido de VAULT.", "error");
      }
    };
    reader.readAsText(file);
  }

  return (
    <Card t={t}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionTitle t={t}>Configuración</SectionTitle>
        <button onClick={close} style={iconBtn(t)}>✕</button>
      </div>
      <Field t={t} label="Tasa de inflación anual estimada (%)">
        <Input t={t} type="number" value={inflation} onChange={setInflation} />
      </Field>
      <Field t={t} label="Alpha Vantage API key (opcional, para precios en vivo)">
        <Input t={t} value={avKey} onChange={setAvKey} placeholder="Pega tu API key gratuita" />
      </Field>
      <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5, marginBottom: 10 }}>
        Tu API key se guarda solo en este dispositivo (localStorage), nunca se envía a Anthropic. Consíguela gratis en alphavantage.co. El plan gratuito limita ~5 consultas por minuto.
      </div>
      <button onClick={saveConfig} style={{ ...btnPrimary(t), width: "100%", marginBottom: 12 }}>Guardar configuración</button>

      <SectionTitle t={t}>Respaldo de datos</SectionTitle>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportBackup} style={{ ...btnGhost(t), flex: 1 }}>Exportar (.json)</button>
        <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost(t), flex: 1 }}>Importar (.json)</button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={importBackup} style={{ display: "none" }} />
    </Card>
  );
}
