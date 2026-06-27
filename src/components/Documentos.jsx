import React, { useState, useEffect, useRef } from "react";
import { Card, SectionTitle, Input, Select, TextArea, CollapsibleSection, FormSheet, btnPrimary, btnGhost, btnSmall, iconBtn, Badge, Row, ProgressBar } from "./ui.jsx";
import { STATEMENT_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, CAT_COLORS } from "../utils/constants.js";
import { uid, fmt } from "../utils/calculations.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";
import * as pdfjsLib from "pdfjs-dist";
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

  const [showCategorize, setShowCategorize] = useState(false);
  const [txnCategories, setTxnCategories] = useState({});
  const [recurringCandidates, setRecurringCandidates] = useState([]);
  const [selectedRecurring, setSelectedRecurring] = useState({});

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

  function applySavedMappings(txns) {
    const mappings = data.categoryMappings || {};
    return txns.map((txn) => {
      const key = txn.name.toLowerCase().replace(/\s+/g, " ").trim();
      if (mappings[key]) return { ...txn, category: mappings[key] };
      for (const [saved, cat] of Object.entries(mappings)) {
        if (key.includes(saved) || saved.includes(key)) return { ...txn, category: cat };
      }
      return txn;
    });
  }

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
    setShowCategorize(false);
    setRecurringCandidates([]);
    setSelectedRecurring({});
    try {
      let rows;
      try {
        rows = await extractTextFromPDF(file);
      } catch (workerErr) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false, disableAutoFetch: true }).promise;
        rows = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const items = content.items.filter((it) => it.str && it.str.trim()).map((it) => ({ text: it.str.trim(), x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));
          const rowMap = {};
          for (const item of items) { const yKey = Math.round(item.y / 4) * 4; if (!rowMap[yKey]) rowMap[yKey] = []; rowMap[yKey].push(item); }
          const sortedYs = Object.keys(rowMap).map(Number).sort((a, b) => b - a);
          for (const y of sortedYs) rows.push(rowMap[y].sort((a, b) => a.x - b.x));
        }
      }
      const raw = parseTransactions(rows);
      const withMappings = applySavedMappings(raw);
      const withDups = findDuplicates(withMappings, data.variableExpenses, data.incomes);
      const initial = {};
      withDups.forEach((txn, i) => { initial[i] = !txn.isDuplicate; });
      setParsedTxns(withDups);
      setSelectedTxns(initial);

      const cats = {};
      withDups.forEach((txn, i) => { cats[i] = txn.category; });
      setTxnCategories(cats);

      const allExpenses = [...data.variableExpenses, ...withDups.filter((tx) => tx.type === "expense")];
      setTips(analyzeSpending(allExpenses));

      // Auto-save to Statement History
      const statementEntry = {
        id: uid(),
        name: file.name.replace(/\.pdf$/i, ""),
        category: "Bank Account",
        dateISO: new Date().toISOString().slice(0, 10),
        notes: `${withDups.length} transactions extracted`,
        fileName: file.name,
      };
      update({ statements: [...data.statements, statementEntry] });

      if (withDups.length === 0) toast("No transactions found in this PDF. Try a different statement.");
      else toast(`Found ${withDups.length} transactions. Review categories below.`);
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

  function updateTxnCategory(idx, category) {
    setTxnCategories((prev) => ({ ...prev, [idx]: category }));
  }

  function importSelected() {
    if (!parsedTxns) return;
    const toImport = parsedTxns.filter((_, i) => selectedTxns[i]);
    if (toImport.length === 0) { toast("No transactions selected"); return; }

    const newMappings = { ...(data.categoryMappings || {}) };
    parsedTxns.forEach((txn, i) => {
      if (!selectedTxns[i]) return;
      const cat = txnCategories[i] || txn.category;
      const key = txn.name.toLowerCase().replace(/\s+/g, " ").trim();
      newMappings[key] = cat;
    });

    const newExpenses = toImport.filter((tx) => tx.type === "expense").map((tx) => {
      const realIdx = parsedTxns.indexOf(tx);
      return {
        id: uid(), name: tx.name, amount: tx.amount, category: txnCategories[realIdx] || tx.category,
        dateISO: tx.dateISO, paymentMethod: "Credit", notes: "Imported from statement",
      };
    });
    const newIncomes = toImport.filter((tx) => tx.type === "income").map((tx) => {
      const realIdx = parsedTxns.indexOf(tx);
      return {
        id: uid(), name: tx.name, amount: tx.amount, category: txnCategories[realIdx] || tx.category,
        dateISO: tx.dateISO, notes: "Imported from statement",
      };
    });

    // Auto-add bills: subscriptions and housing/bills categories go straight to Bills
    const existingBillNames = data.fixedExpenses.map((e) => e.name.toLowerCase());
    const autoBills = newExpenses
      .filter((e) => (e.category === "Housing/Bills" || e.category === "Subscriptions") && !existingBillNames.includes(e.name.toLowerCase()))
      .reduce((acc, e) => {
        if (!acc.find((b) => b.name.toLowerCase() === e.name.toLowerCase())) acc.push(e);
        return acc;
      }, [])
      .map((e) => ({
        id: uid(), name: e.name, amount: e.amount,
        dayOfMonth: new Date(e.dateISO).getDate(),
        category: e.category, notes: "Auto-detected from statement", lastPaidISO: null,
      }));

    // Detect other recurring transactions (same merchant 2+ times, not already auto-added)
    const merchantCounts = {};
    const autoBillNames = autoBills.map((b) => b.name.toLowerCase());
    toImport.forEach((tx) => {
      if (tx.type !== "expense") return;
      const key = tx.name.toLowerCase().replace(/\s+/g, " ").trim();
      if (autoBillNames.includes(key)) return;
      if (!merchantCounts[key]) merchantCounts[key] = { name: tx.name, amounts: [], category: txnCategories[parsedTxns.indexOf(tx)] || tx.category };
      merchantCounts[key].amounts.push(tx.amount);
    });
    const recurring = Object.values(merchantCounts)
      .filter((m) => m.amounts.length >= 2)
      .map((m) => ({
        name: m.name,
        category: m.category,
        count: m.amounts.length,
        avgAmount: m.amounts.reduce((s, a) => s + a, 0) / m.amounts.length,
      }));

    update({
      variableExpenses: [...data.variableExpenses, ...newExpenses],
      incomes: [...data.incomes, ...newIncomes],
      fixedExpenses: [...data.fixedExpenses, ...autoBills],
      categoryMappings: newMappings,
    });

    let msg = `Imported ${toImport.length} transactions`;
    if (autoBills.length > 0) msg += `, added ${autoBills.length} bill${autoBills.length !== 1 ? "s" : ""}`;

    setImportStats({ expenses: newExpenses.length, income: newIncomes.length, total: fmt(toImport.reduce((s, tx) => s + tx.amount, 0)), bills: autoBills.length });
    toast(msg);

    if (recurring.length > 0) {
      setRecurringCandidates(recurring);
      const sel = {};
      recurring.forEach((_, i) => { sel[i] = false; });
      setSelectedRecurring(sel);
    }

    setParsedTxns(null);
    setSelectedTxns({});
    setShowCategorize(false);
  }

  function addRecurringBills() {
    const toAdd = recurringCandidates.filter((_, i) => selectedRecurring[i]);
    if (toAdd.length === 0) { toast("No bills selected"); return; }
    const existingNames = data.fixedExpenses.map((e) => e.name.toLowerCase());
    const newBills = toAdd
      .filter((r) => !existingNames.includes(r.name.toLowerCase()))
      .map((r) => ({
        id: uid(),
        name: r.name,
        amount: Math.round(r.avgAmount * 100) / 100,
        dayOfMonth: 1,
        category: r.category,
        notes: `Auto-detected (${r.count}x in statement)`,
        lastPaidISO: null,
      }));
    if (newBills.length === 0) { toast("These bills already exist"); return; }
    update({ fixedExpenses: [...data.fixedExpenses, ...newBills] });
    toast(`Added ${newBills.length} recurring bill${newBills.length !== 1 ? "s" : ""}`);
    setRecurringCandidates([]);
    setSelectedRecurring({});
  }

  const sorted = data.statements.slice().sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const selectedCount = parsedTxns ? Object.values(selectedTxns).filter(Boolean).length : 0;
  const dupCount = parsedTxns ? parsedTxns.filter((tx) => tx.isDuplicate).length : 0;

  const catOptions = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.includes(c))];

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
            <button onClick={() => setShowCategorize(true)} style={btnSmall(t, t.gold)}>Edit categories</button>
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
                      {txn.dateISO} · {txnCategories[i] || txn.category}
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

      {/* Categorization sheet */}
      <FormSheet t={t} open={showCategorize} onClose={() => setShowCategorize(false)} title="Edit Categories">
        <div style={{ fontSize: 12, color: t.textDim, marginBottom: 12, lineHeight: 1.5 }}>
          Assign a category to each transaction. Your choices are saved — future imports will auto-categorize matching merchants.
        </div>
        <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
          {parsedTxns && parsedTxns.map((txn, i) => (
            selectedTxns[i] && (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{txn.name}</div>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                    ${txn.amount.toFixed(2)}
                  </span>
                </div>
                <select
                  value={txnCategories[i] || txn.category}
                  onChange={(e) => { e.stopPropagation(); updateTxnCategory(i, e.target.value); }}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 12 }}
                >
                  {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )
          ))}
        </div>
        <button onClick={() => setShowCategorize(false)} style={{ ...btnPrimary(t), width: "100%", marginTop: 12 }}>Done</button>
      </FormSheet>

      {importStats && (
        <Card t={t} style={{ borderColor: t.green }}>
          <SectionTitle t={t}>Import Complete</SectionTitle>
          <Row t={t} label="Expenses imported" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.expenses}</span>} />
          <Row t={t} label="Income imported" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.income}</span>} />
          <Row t={t} label="Total value" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.total}</span>} />
          {importStats.bills > 0 && <Row t={t} label="Bills auto-added" valueNode={<span style={{ fontFamily: "ui-monospace, monospace" }}>{importStats.bills}</span>} />}
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>Transactions added to Transactions tab. Bills added to Bills tab. Review them there.</div>
        </Card>
      )}

      {/* Recurring bills detection */}
      {recurringCandidates.length > 0 && (
        <Card t={t} style={{ borderColor: t.blue }}>
          <SectionTitle t={t}>Recurring Bills Detected</SectionTitle>
          <div style={{ fontSize: 11.5, color: t.textDim, lineHeight: 1.5, marginBottom: 10 }}>
            These merchants appeared multiple times. Add them as recurring bills?
          </div>
          {recurringCandidates.map((r, i) => (
            <div key={i}
              onClick={() => setSelectedRecurring((prev) => ({ ...prev, [i]: !prev[i] }))}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 6px", borderBottom: `1px solid ${t.border}`, cursor: "pointer",
                background: selectedRecurring[i] ? `${t.blue}11` : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${selectedRecurring[i] ? t.blue : t.border}`,
                  background: selectedRecurring[i] ? t.blue : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#fff", fontWeight: 700,
                }}>{selectedRecurring[i] ? "✓" : ""}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: t.textDim }}>{r.category} · {r.count}x this statement · avg {fmt(r.avgAmount)}</div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={addRecurringBills} style={{ ...btnPrimary(t), flex: 1 }}>Add selected as bills</button>
            <button onClick={() => { setRecurringCandidates([]); setSelectedRecurring({}); }} style={{ ...btnGhost(t), flex: 1 }}>Skip</button>
          </div>
        </Card>
      )}

      {tips.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t}>Spending Insights</SectionTitle>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: t.text, lineHeight: 1.5, padding: "6px 0", borderBottom: i < tips.length - 1 ? `1px solid ${t.border}` : "none" }}>
              {tip}
            </div>
          ))}
        </Card>
      )}

      <Card t={t}>
        <CollapsibleSection t={t} title="Statement History" count={sorted.length}>
          {sorted.length === 0 && <div style={{ fontSize: 13, color: t.textDim }}>No statements recorded. Upload a PDF or tap + to add one manually.</div>}
          {sorted.map((s) => (
            <div key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => edit(s)} style={iconBtn(t)}>✏️</button>
                  <button onClick={() => remove(s.id)} style={iconBtn(t)}>🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.textDim }}>{s.category} · {s.dateISO}{s.fileName ? ` · ${s.fileName}` : ""}</div>
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
