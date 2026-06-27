// Pure statement-parsing logic (no PDF/DOM dependencies) so it can be unit-tested in Node.
// Reads the four columns of a bank statement: Date, Description, Amount, Balance.

const DATE_PATTERNS = [
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
  /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY
  /^(\d{1,2})\/(\d{1,2})$/,          // MM/DD (year inferred from statement period)
  /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // MM-DD-YYYY
  /^(\d{1,2})-(\d{1,2})-(\d{2})$/,   // MM-DD-YY
  /^(\d{4})-(\d{2})-(\d{2})$/,       // YYYY-MM-DD
];

function fourDigitYear(y) {
  if (y == null) return null;
  const s = String(y);
  if (s.length === 2) return 2000 + parseInt(s, 10);
  return parseInt(s, 10);
}

// Find the statement period (e.g. "Statement from 05/01/26 Thru 05/31/26") so MM/DD
// dates without a year can be resolved correctly, including December→January wraps.
export function detectStatementPeriod(rows) {
  const lines = rows.map((row) => row.map((c) => c.text).join(" "));
  const full = lines.join("\n");

  const fromThru = full.match(/from\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+thru\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (fromThru) {
    return {
      startMonth: parseInt(fromThru[1], 10),
      startYear: fourDigitYear(fromThru[3]),
      endMonth: parseInt(fromThru[4], 10),
      endYear: fourDigitYear(fromThru[6]),
    };
  }

  // Fallback: any full date anywhere (e.g. "Previous Statement Date: 04/30/26").
  const anyDate = full.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (anyDate) {
    const m = parseInt(anyDate[1], 10);
    const y = fourDigitYear(anyDate[3]);
    return { startMonth: m, startYear: y, endMonth: m, endYear: y };
  }

  return null;
}

// Resolve a bare MM/DD against the statement period.
function resolveYear(month, period) {
  if (!period) return new Date().getFullYear();
  const { startMonth, startYear, endMonth, endYear } = period;
  if (startYear === endYear) return endYear;
  // Period wraps a year boundary (e.g. Dec→Jan): months >= start belong to the start year.
  return month >= startMonth ? startYear : endYear;
}

export function tryParseDate(text, period) {
  const clean = (text || "").trim();
  for (let p = 0; p < DATE_PATTERNS.length; p++) {
    const m = clean.match(DATE_PATTERNS[p]);
    if (!m) continue;

    if (p === 5) return `${m[1]}-${m[2]}-${m[3]}`; // already ISO

    let month = parseInt(m[1], 10);
    let day = parseInt(m[2], 10);
    let year = m[3] ? fourDigitYear(m[3]) : null;

    if (month > 12 && day <= 12) { const tmp = month; month = day; day = tmp; }
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    if (year == null) year = resolveYear(month, period);

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

// Parses a money cell. Handles "$1,234.56", "(12.34)", trailing-minus "4.31-",
// leading-minus and sub-dollar amounts with no leading zero (".28-").
export function tryParseAmount(text) {
  let clean = (text || "").trim().replace(/\s/g, "");
  if (!clean) return null;
  const isNegative = clean.includes("(") || clean.startsWith("-") || clean.endsWith("-");
  clean = clean.replace(/[()$,]/g, "").replace(/^-/, "").replace(/-$/, "");
  const m = clean.match(/^(\d*\.\d{1,2})$/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  if (isNaN(val)) return null;
  return isNegative ? -val : val;
}

const SKIP_PATTERNS = [
  /payment\s*(thank|received)/i, /autopay/i, /balance\s*forward/i,
  /previous\s*balance/i, /new\s*balance/i, /minimum\s*payment/i,
  /credit\s*limit/i, /available\s*credit/i, /statement\s*clos/i,
  /opening\s*balance/i, /closing\s*balance/i, /beginning\s*balance/i,
  /ending\s*balance/i, /total\s*(purchases|payments|fees|interest|credits|debits|overdraft|returned)/i,
  /aggregate\s*overdraft/i, /account\s*(number|summary|activity)/i, /page\s*\d+\s*of\s*\d+/i,
  /customer\s*service/i, /billing\s*cycle/i, /annual\s*percentage/i,
  /^interest\s*charge/i, /finance\s*charge/i, /late\s*fee/i,
  /summary\s*of\s*deposit/i, /^statement\s*from/i,
  /^fees?\s*$/i, /^total\s*$/i, /^subtotal/i, /^date\s*$/i, /^description/i,
  /^amount\s*$/i, /^balance\s*$/i, /^transaction/i, /^posting/i,
];

const CATEGORY_KEYWORDS = {
  "Housing/Bills": [
    "rent", "mortgage", "electric", "water", "sewage", "trash", "internet",
    "cable", "phone", "at&t", "att", "verizon", "t-mobile", "tmobile",
    "comcast", "xfinity", "utility", "pg&e", "pge", "conedison", "duke energy",
    "spectrum", "cox", "centurylink", "windstream", "frontier comm",
    "hoa", "property", "homeowner", "renter", "lease",
    "progressive", "insurance", "insur", "geico", "state farm", "allstate",
    "cfe", "telmex", "izzi", "megacable", "totalplay",
  ],
  "Food": [
    "grocery", "groceries", "restaurant", "rest ", "food", "dining", "mcdonald",
    "starbucks", "chipotle", "pizza", "burger", "cafe", "coffee", "chicken",
    "doordash", "grubhub", "uber eat", "instacart", "whole foods",
    "trader joe", "kroger", "walmart", "wm supercenter", "wal-mart", "wal mart",
    "aldi", "costco", "safeway", "dairy queen", "senor sushi", "sushi",
    "publix", "target", "sam's club", "bj's", "wendy", "taco bell", "taco ",
    "chick-fil", "subway", "panera", "olive garden", "applebee",
    "denny", "ihop", "wingstop", "panda express", "five guys",
    "popeye", "sonic", "arby", "jack in the box", "whataburger",
    "chili's", "buffalo wild", "red lobster", "outback", "longhorn",
    "cracker barrel", "waffle house", "smoothie", "juice", "bakery",
    "deli", "grill", "ramen", "thai", "chinese",
    "mexican", "italian", "indian", "korean", "bbq", "barbecue",
    "wawa", "sheetz", "7-eleven", "circle k", "quicktrip",
    "soriana", "oxxo", "chedraui", "bodega aurrera", "heb ", "h-e-b",
    "tortas", "torta ", "panaderia", "carniceria", "antojitos", "macu caf",
    "chapa", "gorditas", "tamales", "birria", "pozole", "elote",
    "little caesars", "domino", "papa john", "el taco",
  ],
  "Transport": [
    "gas ", "fuel", "shell", "chevron", "exxon", "bp ", "sunoco",
    "valero", "marathon", "citgo", "uber", "lyft", "parking", "toll",
    "transit", "metro", "bus", "amtrak", "airline", "flight", "delta",
    "united", "southwest", "american air", "jetblue", "spirit", "frontier",
    "car wash", "auto parts", "autozone", "o'reilly", "jiffy lube",
    "tire", "mechanic", "alon ", "alon dk", "gasolinera", "pemex",
    "mobil ", "gasolina",
  ],
  "Subscriptions": [
    "netflix", "spotify", "hulu", "disney", "hbo", "apple.com", "apple music",
    "icloud", "google storage", "amazon prime", "youtube", "adobe",
    "microsoft", "subscription", "membership", "gym", "planet fitness",
    "anytime fitness", "la fitness", "ymca", "peloton", "audible",
    "kindle", "paramount", "peacock", "twitch", "dropbox", "notion",
    "chatgpt", "openai", "claude", "midjourney", "rmtly",
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
    "salon", "barber", "spa", "beauty", "belleza", "cosmetic", "dry clean", "laundry",
    "nail", "massage", "sephora", "ulta", "bath & body",
    "todomoda", "toska", "miniso", "perfum",
  ],
  "Family": [
    "school", "tuition", "daycare", "childcare", "pet", "veterinary",
    "toys", "petsmart", "petco", "baby", "kids", "papeleria",
  ],
  "Other": [
    "foreign transaction fee", "intl transaction fee", "international fee",
    "atm fee", "service charge", "monthly fee", "maintenance fee",
  ],
};

export function categorize(description) {
  const lower = (description || "").toLowerCase();
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
  if (lower.includes("trnsfer frm") || lower.includes("transfer from") || lower.includes("trnsfer from")) return "Transfer";
  return "Other";
}

const MONEY_CELL = /^\$?\s*-?\s*\(?\s*\.?[\d,]*\.?\d{0,2}\s*-?\s*\)?$/;

// Seed the running balance from a "Balance Forward" / "Beginning Balance" row so the
// first real transaction's sign can be verified against the balance delta.
function findOpeningBalance(rows, period) {
  for (const row of rows) {
    const line = row.map((c) => c.text).join(" ").toLowerCase();
    if (/balance\s*forward|beginning\s*balance|previous\s*balance/.test(line)) {
      let last = null;
      for (const cell of row) {
        const a = tryParseAmount(cell.text);
        if (a !== null && !tryParseDate(cell.text, period)) last = a;
      }
      if (last !== null) return last;
    }
  }
  return null;
}

export function parseTransactions(rows) {
  const period = detectStatementPeriod(rows);
  const transactions = [];
  let prevBalance = findOpeningBalance(rows, period);

  for (const row of rows) {
    const cells = row.map((item) => item.text);
    const fullLine = cells.join(" ");
    const lower = fullLine.toLowerCase();

    if (SKIP_PATTERNS.some((pat) => pat.test(lower))) continue;
    if (fullLine.length < 6) continue;

    // --- Date ---
    let dateISO = null;
    let dateIdx = -1;
    for (let i = 0; i < cells.length; i++) {
      const d = tryParseDate(cells[i], period);
      if (d) { dateISO = d; dateIdx = i; break; }
    }
    if (!dateISO) {
      const combined = (fullLine.match(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/) || [])[0];
      const d = tryParseDate(combined || "", period);
      if (d) dateISO = d;
    }
    if (!dateISO) continue;

    // --- Amounts (collect every money-looking cell with its x position) ---
    const amounts = [];
    for (let i = 0; i < row.length; i++) {
      if (i === dateIdx) continue;
      const amt = tryParseAmount(row[i].text);
      if (amt !== null) amounts.push({ value: amt, idx: i, x: row[i].x || 0 });
    }
    if (amounts.length === 0) continue;

    amounts.sort((a, b) => a.x - b.x);

    // --- Amount + Balance columns ---
    // With 2+ money cells: leftmost = Amount, rightmost = Balance.
    let amount = null;
    let balance = null;
    let amountIdx = -1;
    let balanceIdx = -1;

    if (amounts.length >= 2) {
      amountIdx = amounts[0].idx;
      balanceIdx = amounts[amounts.length - 1].idx;
      amount = amounts[0].value;
      balance = amounts[amounts.length - 1].value;
    } else {
      amount = amounts[0].value;
      amountIdx = amounts[0].idx;
    }

    // --- Sign via running balance (authoritative when available) ---
    // The signed delta balance[i] - balance[i-1] equals the true signed amount.
    let signedAmount = amount;
    let usedBalanceSign = false;
    if (balance !== null && prevBalance !== null) {
      const delta = balance - prevBalance;
      if (Math.abs(Math.abs(delta) - Math.abs(amount)) < 0.01) {
        signedAmount = delta; // trust the ledger
        usedBalanceSign = true;
      }
    }
    if (balance !== null) prevBalance = balance;

    // --- Description (everything that isn't date/amount/balance) ---
    const used = new Set([dateIdx, amountIdx, balanceIdx].filter((i) => i >= 0));
    const descParts = [];
    for (let i = 0; i < cells.length; i++) {
      if (used.has(i)) continue;
      const cell = cells[i].trim();
      if (!cell) continue;
      if (tryParseDate(cell, period)) continue;
      if (MONEY_CELL.test(cell) && /\d/.test(cell)) continue;
      descParts.push(cell);
    }
    let desc = descParts.join(" ").replace(/\s+/g, " ").trim();
    if (!desc || desc.length < 2) continue;
    if (desc.length > 80) desc = desc.slice(0, 80).trim();
    if (SKIP_PATTERNS.some((pat) => pat.test(desc.toLowerCase()))) continue;

    const absAmount = Math.abs(signedAmount);
    if (absAmount === 0) continue;
    const isExpense = signedAmount < 0;
    const lowerDesc = desc.toLowerCase();

    transactions.push({
      name: desc,
      amount: absAmount,
      balance: balance, // null if the row had no balance column
      dateISO,
      type: isExpense ? "expense" : "income",
      category: isExpense ? categorize(desc) : guessIncomeCategory(lowerDesc),
      _signFromBalance: usedBalanceSign,
    });
  }

  const seen = new Set();
  return transactions.filter((txn) => {
    const key = `${txn.dateISO}|${txn.amount}|${txn.balance}|${txn.name}`;
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
    tips.push(`You're spending $${byCategory["Subscriptions"].toFixed(2)} on subscriptions. Review and cancel any you rarely use.`);
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
