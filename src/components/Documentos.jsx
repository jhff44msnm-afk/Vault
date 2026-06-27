import React, { useState, useEffect, useRef } from "react";
import { Card, SectionTitle, Input, Select, TextArea, CollapsibleSection, FormSheet, btnPrimary, btnGhost, btnSmall, iconBtn, Badge, Row, ProgressBar } from "./ui.jsx";
import { STATEMENT_CATEGORIES, EXPENSE_CATEGORIES, CAT_COLORS } from "../utils/constants.js";
import { uid, fmt } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";
import { extractTextFromPDF, parseTransactions, findDuplicates, analyzeSpending } from "../utils/pdfParser.js";

export function Documentos({ t, data, update }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", category: "Credit Card", dateISO: new Date().toISOString().slice(0, 10), notes: "", fileName: "" });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef(null);

  const [parsing, setParsing] = useState(false);
  const [parsedTxns, setParsedTxns] = useState(null);
  const [selectedTxns, setSelectedTxns] = useState({});
  const [importStats, setImportStats] = useState(null);
  const [tips, setTips] = useState([]);
  const pdfRef = useRef(null);

  useEffect(() => {
    const handler = () => { resetForm(); setShowForm(true); };
    window.addEventListener("vault-open-form", handler);
    return () => window.removeEventListener("vault-open-form", handler);
  }, []);

  function resetForm() { setForm({ name: "", category: "Credit Card", dateISO: new Date().toISOString().slice(0, 10), notes: "", fileName: "" }); setEditingId(null); }
  function closeForm() { resetForm(); setShowForm(false); }
  function submit() {
    if (!form.name.trim()) return;
    const next = editingId ? data.statements.map((s) => (s.id === editingId ? { ...s, ...form } : s)) : [...data.statements, { id: uid(), ...form }];
    update({ statements: next });
    toast(editingId ? "Statement updated" : "Statement saved");
    closeForm();
  }
  function edit(s) { setForm({ name: s.name, category: s.category, dateISO: s.dateISO, notes: s.notes || "", fileName: s.fileName || "" }); setEditingId(s.id); setShowForm(true); }
  async function remove(id) {
    if (!await confirm("Delete this statement?")) return;
    update({ statements: data.statements.filter((s) => s.id !== id) });
    if (editingId === id) resetForm();
    toast("Statement deleted");
  }
  function onFilePicked(e) { const f = e.target.files?.[0]; if (f) setForm({ ...form, fileName: f.name }); }

  async function onPDFUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast("Please select a PDF file", "error");
      return;
    }
    setParsing(true);
    setParsedTxns(null);
    setSelectedTxns({});
    setImportStats(null);
    setTips([]);
    try {
      const lines = await extractTextFromPDF(file);
      const raw = parseTransactions(lines);
      const withDups = findDuplicates(raw, data.variableExpenses, data.incomes);
      const initial = {};
      withDups.forEach((txn, i) => { initial[i] = !txn.isDuplicate; });
      setParsedTxns(withDups);
      setSelectedTxns(initial);

      const allExpenses = [...data.variableExpenses, ...withDups.filter((tx) => tx.type === "expense")];
      setTips(analyzeSpending(allExpenses));

      if (withDups.length === 0) toast("No transactions found in this PDF. Try a different statement.");
      else toast(`Found ${withDups.length} transactions`);
    } catch (err) {
      toast("Error reading PDF: " + (err.message || "Unknown error"), "error");
    }
    setParsing(false);
  }

  function toggleTxn(idx) {
    setSelectedTxns((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function selectAllNew() {
    if (!parsedTxns) return;
    const next = {};
    parsedTxns.forEach((txn, i) => { next[i] = !txn.isDuplicate; });
    setSelectedTxns(next);
  }

  function selectNone() {
    if (!parsedTxns) return;
    const next = {};
    parsedTxns.forEach((_, i) => { next[i] = false; });
    setSelectedTxns(next);
  }

  function importSelected() {
    if (!parsedTxns) return;
    const toImport = parsedTxns.filter((_, i) => selectedTxns[i]);
    if (toImport.length === 0) { toast("No transactions selected"); return; }

    const newExpenses = toImport.filter((tx) => tx.type === "expense").map((tx) => ({
      id: uid(), name: tx.name, amount: tx.amount, category: tx.category,
      dateISO: tx.dateISO, paymentMethod: "Credit", notes: "Imported from statement",
    }));
    const newIncomes = toImport.filter((tx) => tx.type === "income").map((tx) => ({
      id: uid(), name: tx.name, amount: tx.amount, category: tx.category,
      dateISO: tx.dateISO, notes: "Imported from statement",
    }));

    update({
      variableExpenses: [...data.variableExpenses, ...newExpenses],
      incomes: [...data.incomes, ...newIncomes],
    });

    setImportStats({ expenses: newExpenses.length, income: newIncomes.length, total: fmt(toImport.reduce((s, tx) => s + tx.amount, 0)) });
    toast(`Imported ${toImport.length} transactions`);
    setParsedTxns(null);
    setSelectedTxns({});
  }

  const sorted = data.statements.slice().sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const selectedCount = parsedTxns ? Object.values(selectedTxns).filter(Boolean).length : 0;
  const dupCount = parsedTxns ? parsedTxns.filter((tx) => tx.isDuplicate).length : 0;

  return (
    <div>
      <Card t={t}>
        <SectionTitle t={t}>Upload Bank Statement</SectionTitle>
        <div style={{ fontSize: 11.5, color: t.textDim, lineHeight: 1.5, marginBottom: 10 }}>
          Upload a PDF bank or credit card statement. Transactions are extracted locally on your device — nothing is sent over the internet.
        </div>
        <button onClick={() => pdfRef.current?.click()} disabled={parsing} style={{ ...btnPrimary(t), width: "100%", opacity: parsing ? 0.6 : 1 }}>
          {parsing ? "Processing..." : "Upload PDF Statement"}
        </button>
        <input ref={pdfRef} type="file" accept=".pdf" onChange={onPDFUpload} style={{ display: "none" }} />
      </Card>

      {parsedTxns && parsedTxns.length > 0 && (
        <Card t={t}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <SectionTitle t={t}>Extracted Transactions ({parsedTxns.length})</SectionTitle>
            {dupCount > 0 && <Badge t={t} color={t.gold}>{dupCount} duplicates</Badge>}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={selectAllNew} style={btnSmall(t, t.blue)}>Select new</button>
            <button onClick={selectNone} style={btnSmall(t, t.textDim)}>Select none</button>
          </div>

          <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 10 }}>
            {parsedTxns.map((txn, i) => (
              <div key={i}
                onClick={() => toggleTxn(i)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 6px", borderBottom: `1px solid ${t.border}`, cursor: "pointer",
                  opacity: txn.isDuplicate && !selectedTxns[i] ? 0.45 : 1,
                  background: selectedTxns[i] ? `${t.gold}11` : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${selectedTxns[i] ? t.gold : t.border}`,
                    background: selectedTxns[i] ? t.gold : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff", fontWeight: 700,
                  }}>{selectedTxns[i] ? "✓" : ""}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{txn.name}</div>
                    <div style={{ fontSize: 10, color: t.textDim }}>
                      {txn.dateISO} · {txn.category}
                      {txn.isDuplicate && <span style={{ color: t.gold, fontWeight: 600 }}> · DUPLICATE</span>}
                    </div>
                  </div>
                </div>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 600, flexShrink: 0, color: txn.type === "income" ? t.green : t.text }}>
                  {txn.type === "income" ? "+" : "-"}${txn.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <button onClick={importSelected} disabled={selectedCount === 0} style={{ ...btnPrimary(t), width: "100%", opacity: selectedCount === 0 ? 0.5 : 1 }}>
            Import {selectedCount} transaction{selectedCount !== 1 ? "s" : ""} to VAULT
          </button>
        </Card>
      )}

      {importStats && (
        <Card t={t} style={{ borderColor: t.green }}>
          <SectionTitle t={t}>Import Complete</SectionTitle>
          <Row t={t} label="Expenses imported" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.expenses}</span>} />
          <Row t={t} label="Income imported" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.income}</span>} />
          <Row t={t} label="Total value" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.total}</span>} />
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>Transactions were added to your Transactions tab. Review them there.</div>
        </Card>
      )}

      {tips.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Spending Insights</SectionTitle>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: t.text, lineHeight: 1.5, padding: "6px 0", borderBottom: i < tips.length - 1 ? `1px solid ${t.border}` : "none" }}>
              💡 {tip}
            </div>
          ))}
        </Card>
      )}

      <Card t={t}>
        <CollapsibleSection t={t} title="Statement History" count={sorted.length}>
          {sorted.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>No statements recorded. Tap + to add one manually.</div>}
          {sorted.map((s) => (
            <div key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => edit(s)} style={iconBtn(t)}>✏️</button>
                  <button onClick={() => remove(s.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.textDim }}>{s.category} · {s.dateISO}{s.fileName ? ` · 📎 ${s.fileName}` : ""}</div>
              {s.notes && <div style={{ fontSize: 12, color: t.text, marginTop: 4 }}>{s.notes}</div>}
            </div>
          ))}
        </CollapsibleSection>
      </Card>

      <FormSheet t={t} open={showForm} onClose={closeForm} title={editingId ? "Edit Statement" : "Add Statement"}>
        <Input t={t} placeholder="Name (e.g. Chase Sapphire - June)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Select t={t} value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={STATEMENT_CATEGORIES} />
        <Input t={t} type="date" value={form.dateISO} onChange={(v) => setForm({ ...form, dateISO: v })} />
        <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost(t), width: "100%", marginBottom: 8 }}>
          {form.fileName ? `File: ${form.fileName}` : "Attach file (PDF or image)"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={onFilePicked} style={{ display: "none" }} />
        <div style={{ fontSize: 10.5, color: t.textDim, marginBottom: 8 }}>Only the file name is saved as a reference; keep the file on your phone or Drive.</div>
        <TextArea t={t} placeholder="Notes (balance, due date, charges to review...)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={submit} style={btnPrimary(t)}>{editingId ? "Save changes" : "Save"}</button>
        </div>
      </FormSheet>
    </div>
  );
}
