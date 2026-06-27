import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, SectionTitle, MonoAmount, AnimatedMonoAmount, Row, Input, Select, FormSheet, CollapsibleSection, btnPrimary, btnGhost, btnSmall, iconBtn, pillBtn } from "./ui.jsx";
import { INVESTMENT_TYPES, RISK_RANGES } from "../utils/constants.js";
import { fmt, pctStr, uid } from "../utils/calculations.js";
import { fetchAlphaVantageQuote } from "../services/financeApi.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

export function Inversion({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", type: "ETFs", capitalInvested: "", currentValue: "", purchaseDate: new Date().toISOString().slice(0, 10), ticker: "", quantity: "", notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState({});
  const [watchInput, setWatchInput] = useState("");
  const [watchStatus, setWatchStatus] = useState({});
  const apiKey = data.apiKeys?.alphaVantage || "";

  const [risk, setRisk] = useState("Moderate");
  const [initial, setInitial] = useState("0");
  const [monthly, setMonthly] = useState("50");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState(String(RISK_RANGES["Moderate"].min + 1));
  useEffect(() => { setRate(String(RISK_RANGES[risk].min + 1)); }, [risk]);

  useEffect(() => {
    const handler = () => { resetForm(); setShowForm(true); };
    window.addEventListener("vault-open-form", handler);
    return () => window.removeEventListener("vault-open-form", handler);
  }, []);

  function resetForm() { setForm({ name: "", type: "ETFs", capitalInvested: "", currentValue: "", purchaseDate: new Date().toISOString().slice(0, 10), ticker: "", quantity: "", notes: "" }); setEditingId(null); }
  function closeForm() { resetForm(); setShowForm(false); }
  function submit() {
    if (!form.name.trim() || !form.capitalInvested) return;
    const payload = {
      name: form.name, type: form.type,
      capitalInvested: Number(form.capitalInvested) || 0,
      currentValue: Number(form.currentValue) || Number(form.capitalInvested) || 0,
      purchaseDate: form.purchaseDate, ticker: form.ticker.trim().toUpperCase(),
      quantity: Number(form.quantity) || 0, notes: form.notes,
    };
    const next = editingId ? data.investments.map((i) => (i.id === editingId ? { ...i, ...payload } : i)) : [...data.investments, { id: uid(), ...payload }];
    update({ investments: next });
    toast(editingId ? "Investment updated" : "Investment recorded");
    closeForm();
  }
  function edit(i) {
    setForm({
      name: i.name, type: i.type,
      capitalInvested: String(i.capitalInvested || i.capitalInvertido || ""),
      currentValue: String(i.currentValue || i.valorActual || ""),
      purchaseDate: i.purchaseDate || i.fechaCompra || new Date().toISOString().slice(0, 10),
      ticker: i.ticker || "", quantity: String(i.quantity || ""), notes: i.notes || ""
    });
    setEditingId(i.id);
    setShowForm(true);
  }
  async function remove(id) {
    if (!await confirm("Delete this investment?")) return;
    update({ investments: data.investments.filter((i) => i.id !== id) });
    if (editingId === id) resetForm();
    toast("Investment deleted");
  }

  async function refreshPrice(inv) {
    if (!inv.ticker || !inv.quantity || !apiKey) return;
    setQuoteStatus((s) => ({ ...s, [inv.id]: "loading" }));
    try {
      const q = await fetchAlphaVantageQuote(inv.ticker, apiKey);
      const currentValue = q.price * Number(inv.quantity);
      update({ investments: data.investments.map((x) => (x.id === inv.id ? { ...x, currentValue, lastQuoteChangePct: q.changePct, lastFetchedISO: new Date().toISOString() } : x)) });
      setQuoteStatus((s) => ({ ...s, [inv.id]: "ok" }));
      toast("Price updated");
    } catch (err) {
      setQuoteStatus((s) => ({ ...s, [inv.id]: "error" }));
      toast("Error fetching price", "error");
    }
  }

  function addToWatchlist() {
    const sym = watchInput.trim().toUpperCase();
    if (!sym || data.watchlist.some((w) => w.symbol === sym)) return;
    update({ watchlist: [...data.watchlist, { id: uid(), symbol: sym }] });
    setWatchInput("");
    toast("Symbol added");
  }
  async function removeFromWatchlist(id) {
    if (!await confirm("Remove from watchlist?")) return;
    update({ watchlist: data.watchlist.filter((w) => w.id !== id) });
    toast("Symbol removed");
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

  const getCapital = (i) => Number(i.capitalInvested || i.capitalInvertido || 0);
  const getValue = (i) => Number(i.currentValue || i.valorActual || 0);
  const totalCapital = data.investments.reduce((s, i) => s + getCapital(i), 0);
  const totalValue = data.investments.reduce((s, i) => s + getValue(i), 0);
  const totalGain = totalValue - totalCapital;

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
        <SectionTitle t={t}>Personal Portfolio</SectionTitle>
        <Row t={t} label="Capital invested" value={totalCapital} />
        <Row t={t} label="Current value" value={totalValue} />
        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: t.textDim }}>Gain / Loss</span>
          <AnimatedMonoAmount t={t} value={totalGain} color={totalGain >= 0 ? t.green : t.red} />
        </div>
      </Card>

      {data.investments.length > 0 && (
        <Card t={t}>
          <CollapsibleSection t={t} title="Investments" count={data.investments.length}>
            {data.investments.map((i) => {
              const cap = getCapital(i);
              const val = getValue(i);
              const gainI = val - cap;
              const rendI = cap ? (gainI / cap) * 100 : 0;
              return (
                <div key={i.id} style={{ padding: "12px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                      <div style={{ fontSize: 11, color: t.textDim }}>{i.type}{i.ticker ? ` · ${i.ticker}` : ""} · {i.purchaseDate || i.fechaCompra}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => edit(i)} style={iconBtn(t)}>✏️</button>
                      <button onClick={() => remove(i.id)} style={iconBtn(t)}>🗑️</button>
                    </div>
                  </div>
                  <Row t={t} label="Capital invested" value={cap} />
                  <Row t={t} label="Current value" value={val} />
                  <Row t={t} label="Return" valueNode={<span style={{ fontFamily: "ui-monospace, monospace", color: rendI >= 0 ? t.green : t.red }}>{pctStr(rendI)}</span>} />
                  <Row t={t} label="Gain/Loss" value={gainI} />
                  {i.notes && <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>{i.notes}</div>}
                  {i.ticker && i.quantity > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => refreshPrice(i)} disabled={!apiKey} style={{ ...btnGhost(t), width: "100%", opacity: apiKey ? 1 : 0.5 }}>
                        {quoteStatus[i.id] === "loading" ? "Fetching..." : "Update live price"}
                      </button>
                      {!apiKey && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4 }}>Add your Alpha Vantage API key in Settings to enable this.</div>}
                      {quoteStatus[i.id] === "error" && <div style={{ fontSize: 10.5, color: t.red, marginTop: 4 }}>Could not fetch price (API limit or invalid symbol).</div>}
                      {i.lastFetchedISO && quoteStatus[i.id] !== "error" && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4 }}>Last updated: {new Date(i.lastFetchedISO).toLocaleString("en-US")}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        </Card>
      )}

      <Card t={t}>
        <CollapsibleSection t={t} title="Watchlist" count={data.watchlist.length}>
          <div style={{ fontSize: 11, color: t.textDim, marginBottom: 8 }}>Add symbols to track. This only shows market data — not personalized recommendations.</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={watchInput} onChange={(e) => setWatchInput(e.target.value)} placeholder="e.g. SPY, AAPL, BTC"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14 }} />
            <button onClick={addToWatchlist} style={btnGhost(t)}>Add</button>
          </div>
          {data.watchlist.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>No symbols in your watchlist.</div>}
          {data.watchlist.map((w) => {
            const ws = watchStatus[w.id];
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.symbol}</div>
                  {ws && ws !== "loading" && ws !== "error" && (
                    <div style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>{fmt(ws.price)} <span style={{ color: t.textDim }}>{ws.changePct}</span></div>
                  )}
                  {ws === "error" && <div style={{ fontSize: 11, color: t.red }}>Error fetching data</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => refreshWatch(w)} disabled={!apiKey} style={{ ...btnSmall(t, t.blue), opacity: apiKey ? 1 : 0.5 }}>{ws === "loading" ? "..." : "Refresh"}</button>
                  <button onClick={() => removeFromWatchlist(w.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
            );
          })}
          {!apiKey && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 6 }}>Add your Alpha Vantage API key in Settings to see live quotes.</div>}
        </CollapsibleSection>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Risk Profile</SectionTitle>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.keys(RISK_RANGES).map((rk) => <button key={rk} onClick={() => setRisk(rk)} style={pillBtn(t, risk === rk)}>{rk}</button>)}
        </div>
        <div style={{ fontSize: 12, color: t.textDim, marginTop: 8 }}>{RISK_RANGES[risk].desc}</div>
      </Card>

      <Card t={t}>
        <SectionTitle t={t}>Compound Interest Simulator</SectionTitle>
        <Input t={t} placeholder="Initial amount (USD)" type="number" value={initial} onChange={setInitial} />
        <Input t={t} placeholder="Monthly contribution (USD)" type="number" value={monthly} onChange={setMonthly} />
        <Input t={t} placeholder="Years" type="number" value={years} onChange={setYears} />
        <Input t={t} placeholder={`Annual return % (range ${RISK_RANGES[risk].min}-${RISK_RANGES[risk].max}%)`} type="number" value={rate} onChange={setRate} />
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={projection}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: t.textDim }} label={{ value: "years", position: "insideBottom", fontSize: 10, fill: t.textDim, dy: 8 }} />
            <YAxis tick={{ fontSize: 10, fill: t.textDim }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} width={45} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={t.gold} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <Row t={t} label="Projected value" value={finalValue} />
        <Row t={t} label="Total contributed" value={totalContributed} />
        <Row t={t} label="Estimated gain (nominal)" value={gain} />
        <div style={{ fontSize: 12, color: t.textDim, marginTop: 6 }}>
          Estimated real return (after {inflation}% annual inflation): <span style={{ color: t.text, fontWeight: 600 }}>{realRate.toFixed(2)}%</span>
        </div>
      </Card>

      <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5, padding: "0 4px" }}>
        This simulator and watchlist are for educational/informational purposes. They do not guarantee returns and are not certified financial advice.
      </div>

      <FormSheet t={t} open={showForm} onClose={closeForm} title={editingId ? "Edit Investment" : "Add Investment"}>
        <Input t={t} placeholder="Name (e.g. VOO, T-Bills 4wk)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Select t={t} value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={INVESTMENT_TYPES} />
        <Input t={t} placeholder="Capital invested (USD)" type="number" value={form.capitalInvested} onChange={(v) => setForm({ ...form, capitalInvested: v })} />
        <Input t={t} placeholder="Current value (USD) — leave empty if same as capital" type="number" value={form.currentValue} onChange={(v) => setForm({ ...form, currentValue: v })} />
        <Input t={t} type="date" value={form.purchaseDate} onChange={(v) => setForm({ ...form, purchaseDate: v })} />
        <div style={{ fontSize: 11, color: t.textDim, margin: "4px 0" }}>Optional, for live prices:</div>
        <Input t={t} placeholder="Ticker (e.g. VOO, BTC)" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v })} />
        <Input t={t} placeholder="Number of shares/units" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
        <Input t={t} placeholder="Note (optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={submit} style={btnPrimary(t)}>{editingId ? "Save changes" : "Add"}</button>
        </div>
      </FormSheet>
    </div>
  );
}
