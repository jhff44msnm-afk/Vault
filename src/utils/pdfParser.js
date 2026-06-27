import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = [];
    let currentLine = [];
    let lastY = null;
    for (const item of content.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 3) {
        if (currentLine.length > 0) lines.push(currentLine.join(" "));
        currentLine = [];
      }
      currentLine.push(item.str);
      lastY = item.transform[5];
    }
    if (currentLine.length > 0) lines.push(currentLine.join(" "));
    pages.push(lines);
  }
  return pages.flat();
}

const AMOUNT_RE = /\$?\s*-?\s*([\d,]+\.\d{2})\b/;
const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

function parseAmount(str) {
  const m = str.match(AMOUNT_RE);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

function parseDate(str) {
  const m = str.match(DATE_RE);
  if (!m) return null;
  let [, a, b, y] = m;
  if (y.length === 2) y = "20" + y;
  const month = parseInt(a);
  const day = parseInt(b);
  if (month > 12 && day <= 12) return `${y}-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const CATEGORY_KEYWORDS = {
  "Food": ["grocery", "groceries", "restaurant", "food", "dining", "mcdonald", "starbucks", "chipotle", "pizza", "burger", "cafe", "coffee", "doordash", "grubhub", "uber eats", "instacart", "whole foods", "trader joe", "kroger", "walmart supercenter", "aldi", "costco", "safeway", "publix"],
  "Transport": ["gas", "fuel", "shell", "chevron", "exxon", "uber", "lyft", "parking", "toll", "transit", "metro", "bus", "amtrak", "airline", "flight", "delta", "united", "southwest", "american air"],
  "Housing/Bills": ["rent", "mortgage", "electric", "water", "sewage", "trash", "internet", "cable", "phone", "att", "verizon", "t-mobile", "comcast", "xfinity", "utility", "pge", "conedison", "duke energy"],
  "Subscriptions": ["netflix", "spotify", "hulu", "disney", "hbo", "apple", "google", "amazon prime", "youtube", "adobe", "microsoft", "subscription", "membership", "gym"],
  "Health": ["pharmacy", "cvs", "walgreens", "doctor", "hospital", "medical", "dental", "vision", "health", "copay", "lab", "urgent care", "therapy"],
  "Clothing": ["clothing", "apparel", "nike", "adidas", "gap", "old navy", "h&m", "zara", "nordstrom", "macy", "target", "tj maxx", "ross"],
  "Personal": ["salon", "barber", "spa", "beauty", "cosmetic", "dry clean", "laundry"],
  "Family": ["school", "tuition", "daycare", "childcare", "pet", "veterinary", "toys"],
};

function categorize(description) {
  const lower = description.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return "Other";
}

const INCOME_KEYWORDS = ["deposit", "direct dep", "payroll", "salary", "refund", "credit", "interest earned", "dividend", "cashback", "cash back", "rebate", "reimbursement", "venmo from", "zelle from", "transfer from"];
const SKIP_KEYWORDS = ["payment thank you", "online payment", "autopay", "balance forward", "previous balance", "new balance", "minimum payment", "credit limit", "available credit", "statement closing", "opening balance"];

export function parseTransactions(lines) {
  const transactions = [];
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    if (!lower || lower.length < 8) continue;
    if (SKIP_KEYWORDS.some((kw) => lower.includes(kw))) continue;

    const amount = parseAmount(line);
    if (amount === null || amount === 0) continue;

    const dateISO = parseDate(line);
    if (!dateISO) continue;

    let desc = line
      .replace(DATE_RE, "")
      .replace(AMOUNT_RE, "")
      .replace(/\$\s*-?\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (desc.length < 3) continue;
    if (desc.length > 60) desc = desc.slice(0, 60).trim();

    const isIncome = INCOME_KEYWORDS.some((kw) => lower.includes(kw));

    transactions.push({
      name: desc,
      amount,
      dateISO,
      type: isIncome ? "income" : "expense",
      category: isIncome ? guessIncomeCategory(lower) : categorize(desc),
    });
  }

  return transactions;
}

function guessIncomeCategory(lower) {
  if (lower.includes("payroll") || lower.includes("salary") || lower.includes("direct dep")) return "Salary";
  if (lower.includes("refund") || lower.includes("reimbursement") || lower.includes("rebate")) return "Refund";
  if (lower.includes("interest") || lower.includes("dividend")) return "Investment";
  return "Other";
}

export function findDuplicates(newTxns, existingExpenses, existingIncomes) {
  const all = [
    ...existingExpenses.map((e) => ({ ...e, _type: "expense" })),
    ...existingIncomes.map((e) => ({ ...e, _type: "income" })),
  ];

  return newTxns.map((txn) => {
    const dup = all.find((existing) => {
      if (existing.dateISO !== txn.dateISO) return false;
      const amtDiff = Math.abs(Number(existing.amount) - txn.amount);
      if (amtDiff > 0.01) return false;
      const nameA = (existing.name || "").toLowerCase();
      const nameB = txn.name.toLowerCase();
      if (nameA === nameB) return true;
      const wordsB = nameB.split(/\s+/);
      return wordsB.some((w) => w.length > 3 && nameA.includes(w));
    });
    return { ...txn, isDuplicate: !!dup };
  });
}

export function analyzeSpending(expenses) {
  if (expenses.length === 0) return [];
  const tips = [];

  const byCategory = {};
  for (const e of expenses) {
    const cat = e.category || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0);
  }

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCat = sorted[0];
  if (topCat) {
    const pct = ((topCat[1] / total) * 100).toFixed(0);
    tips.push(`Your biggest spending category is ${topCat[0]} at ${pct}% of total expenses ($${topCat[1].toFixed(2)}).`);
  }

  if (byCategory["Food"] && total > 0) {
    const foodPct = (byCategory["Food"] / total) * 100;
    if (foodPct > 30) tips.push(`Food spending is ${foodPct.toFixed(0)}% of your expenses. The recommended guideline is 10-15% of income. Consider meal prepping or reducing dining out.`);
  }

  if (byCategory["Subscriptions"] && byCategory["Subscriptions"] > 100) {
    tips.push(`You're spending $${byCategory["Subscriptions"].toFixed(2)} on subscriptions. Review them to cancel any you rarely use.`);
  }

  const smallTxns = expenses.filter((e) => Number(e.amount) < 10);
  if (smallTxns.length > 15) {
    const smallTotal = smallTxns.reduce((s, e) => s + Number(e.amount), 0);
    tips.push(`You have ${smallTxns.length} small transactions (under $10) totaling $${smallTotal.toFixed(2)}. These "micro-expenses" add up — track which ones are impulse buys.`);
  }

  const now = new Date();
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.dateISO);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = expenses.filter((e) => {
    const d = new Date(e.dateISO);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1);
    return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
  });
  if (thisMonth.length > 0 && lastMonth.length > 0) {
    const thisTotal = thisMonth.reduce((s, e) => s + Number(e.amount), 0);
    const lastTotal = lastMonth.reduce((s, e) => s + Number(e.amount), 0);
    if (lastTotal > 0) {
      const change = ((thisTotal - lastTotal) / lastTotal) * 100;
      if (change > 20) tips.push(`Spending is up ${change.toFixed(0)}% compared to last month ($${lastTotal.toFixed(0)} → $${thisTotal.toFixed(0)}). Check if there were one-time expenses or if a category is trending up.`);
      else if (change < -10) tips.push(`Spending is down ${Math.abs(change).toFixed(0)}% compared to last month. Keep it up!`);
    }
  }

  if (tips.length === 0) tips.push("Your spending looks balanced across categories. Keep tracking to spot trends over time.");

  return tips;
}
