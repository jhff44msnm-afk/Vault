import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
} catch (e) {
  // Worker setup can fail on some mobile browsers — falls back to main thread
}

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    disableAutoFetch: true,
    isEvalSupported: false,
  }).promise;

  const allRows = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        text: it.str.trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        w: it.width || 0,
      }));

    const rowMap = {};
    for (const item of items) {
      const yKey = Math.round(item.y / 4) * 4;
      if (!rowMap[yKey]) rowMap[yKey] = [];
      rowMap[yKey].push(item);
    }

    const sortedYs = Object.keys(rowMap).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const row = rowMap[y].sort((a, b) => a.x - b.x);
      allRows.push(row);
    }
  }
  return allRows;
}

const DATE_PATTERNS = [
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
  /^(\d{1,2})\/(\d{1,2})$/,
  /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
  /^(\d{4})-(\d{2})-(\d{2})$/,
];

function tryParseDate(text) {
  const clean = text.trim();
  for (const pat of DATE_PATTERNS) {
    const m = clean.match(pat);
    if (!m) continue;

    if (pat === DATE_PATTERNS[5]) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }

    let month, day, year;
    if (pat === DATE_PATTERNS[4] || pat === DATE_PATTERNS[3]) {
      month = parseInt(m[1]); day = parseInt(m[2]); year = m[3];
    } else {
      month = parseInt(m[1]); day = parseInt(m[2]); year = m[3];
    }

    if (month > 12 && day <= 12) { [month, day] = [day, month]; }
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    if (!year) {
      year = String(new Date().getFullYear());
    } else if (year.length === 2) {
      year = "20" + year;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

function tryParseAmount(text) {
  let clean = text.trim().replace(/\s/g, "");
  const isNegative = clean.includes("(") || clean.startsWith("-");
  clean = clean.replace(/[()$,]/g, "").replace(/^-/, "");
  const m = clean.match(/^(\d+\.\d{2})$/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  if (val === 0 || isNaN(val)) return null;
  return isNegative ? -val : val;
}

const SKIP_PATTERNS = [
  /payment\s*(thank|received)/i, /autopay/i, /balance\s*forward/i,
  /previous\s*balance/i, /new\s*balance/i, /minimum\s*payment/i,
  /credit\s*limit/i, /available\s*credit/i, /statement\s*clos/i,
  /opening\s*balance/i, /closing\s*balance/i, /total\s*(purchases|payments|fees|interest|credits|debits)/i,
  /account\s*(number|summary|activity)/i, /page\s*\d+/i,
  /customer\s*service/i, /billing\s*cycle/i, /annual\s*percentage/i,
  /^interest\s*charge/i, /finance\s*charge/i, /late\s*fee/i,
  /^fees?\s*$/i, /^total\s*$/i, /^subtotal/i, /^date\s*$/i, /^description/i,
  /^amount\s*$/i, /^balance\s*$/i, /^transaction/i, /^posting/i,
];

const INCOME_KEYWORDS = [
  "deposit", "direct dep", "payroll", "salary", "refund", "credit memo",
  "interest earned", "interest payment", "dividend", "cashback", "cash back",
  "rebate", "reimbursement", "venmo from", "zelle from", "transfer from",
  "ach credit", "wire in", "mobile deposit",
];

const CATEGORY_KEYWORDS = {
  "Food": [
    "grocery", "groceries", "restaurant", "food", "dining", "mcdonald",
    "starbucks", "chipotle", "pizza", "burger", "cafe", "coffee",
    "doordash", "grubhub", "uber eat", "instacart", "whole foods",
    "trader joe", "kroger", "walmart", "aldi", "costco", "safeway",
    "publix", "target", "sam's club", "bj's", "wendy", "taco bell",
    "chick-fil", "subway", "panera", "olive garden", "applebee",
    "denny", "ihop", "wingstop", "panda express", "five guys",
    "popeye", "sonic", "arby", "jack in the box", "whataburger",
    "chili's", "buffalo wild", "red lobster", "outback", "longhorn",
    "cracker barrel", "waffle house", "smoothie", "juice", "bakery",
    "deli", "chicken", "grill", "sushi", "ramen", "thai", "chinese",
    "mexican", "italian", "indian", "korean", "bbq", "barbecue",
    "wawa", "sheetz", "7-eleven", "circle k", "quicktrip",
  ],
  "Transport": [
    "gas", "fuel", "shell", "chevron", "exxon", "mobil", "bp ", "sunoco",
    "valero", "marathon", "citgo", "uber", "lyft", "parking", "toll",
    "transit", "metro", "bus", "amtrak", "airline", "flight", "delta",
    "united", "southwest", "american air", "jetblue", "spirit", "frontier",
    "car wash", "auto parts", "autozone", "o'reilly", "jiffy lube",
    "tire", "mechanic",
  ],
  "Housing/Bills": [
    "rent", "mortgage", "electric", "water", "sewage", "trash", "internet",
    "cable", "phone", "at&t", "att", "verizon", "t-mobile", "comcast",
    "xfinity", "utility", "pg&e", "pge", "conedison", "duke energy",
    "spectrum", "cox", "centurylink", "windstream", "frontier comm",
    "hoa", "property", "homeowner", "renter", "lease",
  ],
  "Subscriptions": [
    "netflix", "spotify", "hulu", "disney", "hbo", "apple.com", "apple music",
    "icloud", "google storage", "amazon prime", "youtube", "adobe",
    "microsoft", "subscription", "membership", "gym", "planet fitness",
    "anytime fitness", "la fitness", "ymca", "peloton", "audible",
    "kindle", "paramount", "peacock", "twitch", "dropbox", "notion",
    "chatgpt", "openai", "claude", "midjourney",
  ],
  "Health": [
    "pharmacy", "cvs", "walgreens", "rite aid", "doctor", "hospital",
    "medical", "dental", "vision", "health", "copay", "lab", "urgent care",
    "therapy", "clinic", "optometrist", "dermatolog", "chiropract",
    "physical therapy", "mental health", "prescription",
  ],
  "Clothing": [
    "clothing", "apparel", "nike", "adidas", "gap", "old navy", "h&m",
    "zara", "nordstrom", "macy", "tj maxx", "ross", "marshall",
    "burlington", "kohl", "jcpenney", "banana republic", "express",
    "forever 21", "uniqlo", "lululemon", "foot locker", "finish line",
    "shoe", "footwear",
  ],
  "Personal": [
    "salon", "barber", "spa", "beauty", "cosmetic", "dry clean", "laundry",
    "nail", "massage", "sephora", "ulta", "bath & body",
  ],
  "Family": [
    "school", "tuition", "daycare", "childcare", "pet", "veterinary",
    "toys", "petsmart", "petco", "baby", "kids",
  ],
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

function guessIncomeCategory(lower) {
  if (lower.includes("payroll") || lower.includes("salary") || lower.includes("direct dep")) return "Salary";
  if (lower.includes("refund") || lower.includes("reimbursement") || lower.includes("rebate")) return "Refund";
  if (lower.includes("interest") || lower.includes("dividend")) return "Investment";
  return "Other";
}

export function parseTransactions(rows) {
  const transactions = [];

  for (const row of rows) {
    const cells = row.map((item) => item.text);
    const fullLine = cells.join(" ");
    const lower = fullLine.toLowerCase();

    if (SKIP_PATTERNS.some((pat) => pat.test(lower))) continue;
    if (fullLine.length < 6) continue;

    let dateISO = null;
    let dateIdx = -1;
    for (let i = 0; i < cells.length; i++) {
      const d = tryParseDate(cells[i]);
      if (d) { dateISO = d; dateIdx = i; break; }
    }

    const combinedDate = tryParseDate(fullLine.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/)?.[0] || "");
    if (!dateISO && combinedDate) { dateISO = combinedDate; }

    if (!dateISO) continue;

    const amounts = [];
    for (let i = 0; i < cells.length; i++) {
      if (i === dateIdx) continue;
      const amt = tryParseAmount(cells[i]);
      if (amt !== null) amounts.push({ value: amt, idx: i });
    }

    const combinedAmounts = [];
    const amountRe = /\$?\s*-?\s*\(?\s*[\d,]+\.\d{2}\s*\)?/g;
    let match;
    while ((match = amountRe.exec(fullLine)) !== null) {
      const val = tryParseAmount(match[0]);
      if (val !== null) combinedAmounts.push(val);
    }

    let amount = null;
    if (amounts.length > 0) {
      amount = amounts[amounts.length - 1].value;
    } else if (combinedAmounts.length > 0) {
      amount = combinedAmounts[combinedAmounts.length - 1];
    }

    if (amount === null) continue;

    const descParts = [];
    const usedIndices = new Set();
    if (dateIdx >= 0) usedIndices.add(dateIdx);
    for (const a of amounts) usedIndices.add(a.idx);

    for (let i = 0; i < cells.length; i++) {
      if (usedIndices.has(i)) continue;
      const cell = cells[i].trim();
      if (!cell) continue;
      if (tryParseDate(cell)) continue;
      if (/^\$?\s*-?\s*\(?\s*[\d,]+\.\d{2}\s*\)?$/.test(cell)) continue;
      descParts.push(cell);
    }

    let desc = descParts.join(" ").replace(/\s+/g, " ").trim();

    if (!desc && amounts.length >= 2) {
      const middleParts = [];
      for (let i = 0; i < cells.length; i++) {
        if (i === dateIdx || i === amounts[amounts.length - 1].idx) continue;
        middleParts.push(cells[i].trim());
      }
      desc = middleParts.join(" ").replace(/\s+/g, " ").trim();
    }

    if (!desc || desc.length < 2) continue;
    if (desc.length > 80) desc = desc.slice(0, 80).trim();

    if (SKIP_PATTERNS.some((pat) => pat.test(desc.toLowerCase()))) continue;

    const absAmount = Math.abs(amount);
    const isNegativeAmount = amount < 0;

    const lowerDesc = desc.toLowerCase();
    const isIncome = INCOME_KEYWORDS.some((kw) => lowerDesc.includes(kw)) || isNegativeAmount;

    transactions.push({
      name: desc,
      amount: absAmount,
      dateISO,
      type: isIncome ? "income" : "expense",
      category: isIncome ? guessIncomeCategory(lowerDesc) : categorize(desc),
    });
  }

  const seen = new Set();
  return transactions.filter((txn) => {
    const key = `${txn.dateISO}|${txn.amount}|${txn.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  if (sorted.length > 1) {
    const top3 = sorted.slice(0, 3);
    const breakdown = top3.map(([cat, val]) => `${cat}: $${val.toFixed(0)} (${((val / total) * 100).toFixed(0)}%)`).join(", ");
    tips.push(`Top spending: ${breakdown}.`);
  } else if (sorted.length === 1) {
    tips.push(`All spending is in ${sorted[0][0]}: $${sorted[0][1].toFixed(2)}.`);
  }

  if (byCategory["Food"] && total > 0) {
    const foodPct = (byCategory["Food"] / total) * 100;
    if (foodPct > 30) tips.push(`Food is ${foodPct.toFixed(0)}% of expenses. The recommended guideline is 10-15% of income. Consider meal prepping or reducing dining out.`);
  }

  if (byCategory["Subscriptions"] && byCategory["Subscriptions"] > 100) {
    tips.push(`You're spending $${byCategory["Subscriptions"].toFixed(2)}/mo on subscriptions. Review and cancel any you rarely use.`);
  }

  const smallTxns = expenses.filter((e) => Number(e.amount) < 10);
  if (smallTxns.length > 10) {
    const smallTotal = smallTxns.reduce((s, e) => s + Number(e.amount), 0);
    tips.push(`${smallTxns.length} small purchases (under $10) totaling $${smallTotal.toFixed(2)}. Watch for impulse buys.`);
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
      if (change > 20) tips.push(`Spending up ${change.toFixed(0)}% vs last month ($${lastTotal.toFixed(0)} → $${thisTotal.toFixed(0)}).`);
      else if (change < -10) tips.push(`Spending down ${Math.abs(change).toFixed(0)}% vs last month — nice!`);
    }
  }

  if (tips.length === 0) tips.push("Spending looks balanced. Keep tracking to spot trends over time.");

  return tips;
}
