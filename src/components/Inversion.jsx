import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, SectionTitle, MonoAmount, AnimatedMonoAmount, Row, Input, Select, CollapsibleSection, btnPrimary, btnGhost, btnSmall, iconBtn, pillBtn } from "./ui.jsx";
import { INVESTMENT_TYPES, RISK_RANGES } from "../utils/constants.js";
import { fmt, pctStr, uid } from "../utils/calculations.js";
import { fetchAlphaVantageQuote } from "../services/financeApi.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Inversion({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", type: "ETFs", capitalInvertido: "", valorActual: "", fechaCompra: new Date().toISOString().slice(0, 10), ticker: "", quantity: "", notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState({});
  const [watchInput, setWatchInput] = useState("");
  const [watchStatus, setWatchStatus] = useState({});
  const apiKey = data.apiKeys?.alphaVantage || "";

  const [risk, setRisk] = useState("Moderado");
  const [initial, setInitial] = useState("0");
  const [monthly, setMonthly] = useState("50");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState(String(RISK_RANGES["Moderado"].min + 1));
  useEffect(() => { setRate(String(RISK_RANGES[risk].min + 1)); }, [risk]);

  function resetForm() { setForm({ name: "", type: "ETFs", capitalInvertido: "", valorActual: "", fechaCompra: new Date().toISOString().slice(0, 10), ticker: "", quantity: "", notes: "" }); setEditingId(null); }
  function submit() {
    if (!form.name.trim() || !form.capitalInvertido) return;
    const payload = {
      name: form.name, type: form.type,
      capitalInvertido: Number(form.capitalInvertido) || 0,
      valorActual: Number(form.valorActual) || Number(form.capitalInvertido) || 0,
      fechaCompra: form.fechaCompra, ticker: form.ticker.trim().toUpperCase(),
      quantity: Number(form.quantity) || 0, notes: form.notes,
    };
    const next = editingId ? data.investments.map((i) => (i.id === editingId ? { ...i, ...payload } : i)) : [...data.investments, { id: uid(), ...payload }];
    update({ investments: next });
    toast(editingId ? "Inversión actualizada" : "Inversión registrada");
    resetForm();
  }
  function edit(i) { setForm({ name: i.name, type: i.type, capitalInvertido: String(i.capitalInvertido), valorActual: String(i.valorActual), fechaCompra: i.fechaCompra, ticker: i.ticker || "", quantity: String(i.quantity || ""), notes: i.notes || "" }); setEditingId(i.id); }
  async function remove(id) {
    if (!await confirm("¿Eliminar esta inversión?")) return;
    update({ investments: data.investments.filter((i) => i.id !== id) });
    if (editingId === id) resetForm();
    toast("Inversión eliminada");
  }

  async function refreshPrice(inv) {
    if (!inv.ticker || !inv.quantity || !apiKey) return;
    setQuoteStatus((s) => ({ ...s, [inv.id]: "loading" }));
    try {
      const q = await fetchAlphaVantageQuote(inv.ticker, apiKey);
      const valorActual = q.price * Number(inv.quantity);
      update({ investments: data.investments.map((x) => (x.id === inv.id ? { ...x, valorActual, lastQuoteChangePct: q.changePct, lastFetchedISO: new Date().toISOString() } : x)) });
      setQuoteStatus((s) => ({ ...s, [inv.id]: "ok" }));
      toast("Precio actualizado");
    } catch (err) {
      setQuoteStatus((s) => ({ ...s, [inv.id]: "error" }));
      toast("Error al obtener precio", "error");
    }
  }

  function addToWatchlist() {
    const sym = watchInput.trim().toUpperCase();
    if (!sym || data.watchlist.some((w) => w.symbol === sym)) return;
    update({ watchlist: [...data.watchlist, { id: uid(), symbol: sym }] });
    setWatchInput("");
    toast("Símbolo agregado");
  }
  async function removeFromWatchlist(id) {
    if (!await confirm("¿Eliminar de tu watchlist?")) return;
    update({ watchlist: data.watchlist.filter((w) => w.id !== id) });
    toast("Símbolo eliminado");
  }
  async function refreshWatch(w) {
    if (!apiKey) return;
    setWatchStatus((s) => ({ ...s, [w.id]: "loading" }));
    try {
      const q = await fetchAlphaVantageQuote(w.symbol, apiKey);
      setWatchStatus((s) => ({ ...s, [w.id]: { price: q.price, changePct: q.changePct } }));
    } catch {
      setWatchStatus((s) => ({ ...s, [w.id]: "error" }));
    }
  }

  const totalCapital = data.investments.reduce((s, i) => s + Number(i.capitalInvertido || 0), 0);
  const totalValor = data.investments.reduce((s, i) => s + Number(i.valorActual || 0), 0);
  const totalGain = totalValor - totalCapital;

  const r = Number(rate) / 100 / 12;
  const n = Number(years) * 12;
  const P = Number(initial) || 0;
  const PMT = Number(monthly) || 0;
  const projection = useMemo(() => {
    const pts = []; let balance = P;
    for (let m = 0; m <= n; m++) { if (m > 0) balance = balance * (1 + r) + PMT; if (m % 12 === 0) pts.push({ year: m / 12, value: Math.round(balance) }); }
    return pts;
  }, [P, PMT, r, n]);
  const finalValue = projection.length ? projection[projection.length - 1].value : P;
  const totalContributed = P + PMT * n;
  const gain = finalValue - totalContributed;
  const inflation = data.inflationRate || 3;
  const realRate = (((1 + Number(rate) / 100) / (1 + inflation / 100)) - 1) * 100;

  return (
    <div>
      <Card t={t}>
        <SectionTitle t={t}>Portafolio personal</SectionTitle>
        <Row t={t} label="Capital invertido" value={totalCapital} />
        <Row t={t} label="Valor actual" value={totalValor} />
        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: t.textDim }}>Ganancia / Pérdida</span>
          <AnimatedMonoAmount t={t} value={totalGain} color={totalGain >= 0 ? t.green : t.red} />
        </div>
      </Card>

      {data.investments.length > 0 && (
        <Card t={t}>
          <CollapsibleSection t={t} title="Inversiones" count={data.investments.length}>
            {data.investments.map((i) => {
              const gainI = Number(i.valorActual || 0) - Number(i.capitalInvertido || 0);
              const rendI = i.capitalInvertido ? (gainI / i.capitalInvertido) * 100 : 0;
              return (
                <div key={i.id} style={{ padding: "12px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                      <div style={{ fontSize: 11, color: t.textDim }}>{i.type}{i.ticker ? ` · ${i.ticker}` : ""} · {i.fechaCompra}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => edit(i)} style={iconBtn(t)}>✏️</button>
                      <button onClick={() => remove(i.id)} style={iconBtn(t)}>🗑️</button>
                    </div>
                  </div>
                  <Row t={t} label="Capital invertido" value={i.capitalInvertido} />
                  <Row t={t} label="Valor actual" value={i.valorActual} />
                  <Row t={t} label="Rendimiento" valueNode={<span style={{ fontFamily: "ui-monospace, monospace", color: rendI >= 0 ? t.green : t.red }}>{pctStr(rendI)}</span>} />
                  <Row t={t} label="Ganancia/Pérdida" value={gainI} />
                  {i.notes && <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>{i.notes}</div>}
                  {i.ticker && i.quantity > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => refreshPrice(i)} disabled={!apiKey} style={{ ...btnGhost(t), width: "100%", opacity: apiKey ? 1 : 0.5 }}>
                        {quoteStatus[i.id] === "loading" ? "Consultando..." : "Actualizar precio en vivo"}
                      </button>
                      {!apiKey && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4 }}>Agrega tu Alpha Vantage API key en ⚙️ Configuración para activar esto.</div>}
                      {quoteStatus[i.id] === "error" && <div style={{ fontSize: 10.5, color: t.red, marginTop: 4 }}>No se pudo obtener el precio (límite de la API o símbolo inválido).</div>}
                      {i.lastFetchedISO && quoteStatus[i.id] !== "error" && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4 }}>Última actualización: {new Date(i.lastFetchedISO).toLocaleString("es-MX")}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        </Card>
      )}

      <Card t={t} id="vault-form" style={{ animation: "vault-slideUp 0.4s ease both" }}>
        <SectionTitle t={t}>{editingId ? "Editar inversión" : "Registrar inversión"}</SectionTitle>
        <Input t={t} placeholder="Nombre (ej. VOO, CETES 28d)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Select t={t} value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={INVESTMENT_TYPES} />
        <Input t={t} placeholder="Capital invertido (USD)" type="number" value={form.capitalInvertido} onChange={(v) => setForm({ ...form, capitalInvertido: v })} />
        <Input t={t} placeholder="Valor actual (USD) — déjalo vacío si es igual al capital" type="number" value={form.valorActual} onChange={(v) => setForm({ ...form, valorActual: v })} />
        <Input t={t} type="date" value={form.fechaCompra} onChange={(v) => setForm({ ...form, fechaCompra: v })} />
        <div style={{ fontSize: 11, color: t.textDim, margin: "4px 0" }}>Opcional, para precios en vivo:</div>
        <Input t={t} placeholder="Ticker (ej. VOO, BTC)" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v })} />
        <Input t={t} placeholder="Cantidad de unidades/acciones" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
        <Input t={t} placeholder="Nota (opcional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={submit} style={btnPrimary(t)}>{editingId ? "Guardar cambios" : "Agregar"}</button>
          {editingId && <button onClick={resetForm} style={btnGhost(t)}>Cancelar</button>}
        </div>
      </Card>

      <Card t={t}>
        <CollapsibleSection t={t} title="Watchlist" count={data.watchlist.length}>
          <div style={{ fontSize: 11, color: t.textDim, marginBottom: 8 }}>Agrega los símbolos que quieras seguir. Solo muestra información del mercado, no son recomendaciones personalizadas.</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={watchInput} onChange={(e) => setWatchInput(e.target.value)} placeholder="Ej. SPY, AAPL, BTC"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14 }} />
            <button onClick={addToWatchlist} style={btnGhost(t)}>Agregar</button>
          </div>
          {data.watchlist.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>Sin símbolos en tu watchlist.</div>}
          {data.watchlist.map((w) => {
            const ws = watchStatus[w.id];
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.symbol}</div>
                  {ws && ws !== "loading" && ws !== "error" && (
                    <div style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>{fmt(ws.price)} <span style={{ color: t.textDim }}>{ws.changePct}</span></div>
                  )}
                  {ws === "error" && <div style={{ fontSize: 11, color: t.red }}>Error al consultar</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => refreshWatch(w)} disabled={!apiKey} style={{ ...btnSmall(t, t.blue), opacity: apiKey ? 1 : 0.5 }}>{ws === "loading" ? "..." : "Actualizar"}</button>
                  <button onClick={() => removeFromWatchlist(w.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
            );
          })}
          {!apiKey && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 6 }}>Agrega tu Alpha Vantage API key en ⚙️ Configuración para ver cotizaciones en vivo.</div>}
        </CollapsibleSection>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Perfil de riesgo</SectionTitle>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.keys(RISK_RANGES).map((rk) => <button key={rk} onClick={() => setRisk(rk)} style={pillBtn(t, risk === rk)}>{rk}</button>)}
        </div>
        <div style={{ fontSize: 12, color: t.textDim, marginTop: 8 }}>{RISK_RANGES[risk].desc}</div>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Simulador de interés compuesto</SectionTitle>
        <Input t={t} placeholder="Monto inicial (USD)" type="number" value={initial} onChange={setInitial} />
        <Input t={t} placeholder="Aportación mensual (USD)" type="number" value={monthly} onChange={setMonthly} />
        <Input t={t} placeholder="Años" type="number" value={years} onChange={setYears} />
        <Input t={t} placeholder={`Rendimiento anual % (rango ${RISK_RANGES[risk].min}-${RISK_RANGES[risk].max}%)`} type="number" value={rate} onChange={setRate} />
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={projection}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: t.textDim }} label={{ value: "años", position: "insideBottom", fontSize: 10, fill: t.textDim, dy: 8 }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={45} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={t.gold} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <Row t={t} label="Valor proyectado" value={finalValue} />
        <Row t={t} label="Total aportado" value={totalContributed} />
        <Row t={t} label="Ganancia estimada (nominal)" value={gain} />
        <div style={{ fontSize: 12, color: t.textDim, marginTop: 6 }}>
          Rendimiento real estimado (descontando {inflation}% de inflación anual): <span style={{ color: t.text, fontWeight: 600 }}>{realRate.toFixed(2)}%</span>
        </div>
      </Card>

      <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5, padding: "0 4px" }}>
        Este simulador y la watchlist son educativos/informativos. No garantizan rendimientos y no son asesoría financiera certificada.
      </div>
    </div>
  );
}
