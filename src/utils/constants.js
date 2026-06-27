export const THEME = {
  dark: {
    bg: "#0F1B2D", bgElev: "#152436", card: "#1B2C42", border: "#2A3D54",
    text: "#F2EFE6", textDim: "#9CACBE", gold: "#C9A227", goldSoft: "#E4C661",
    green: "#3E9C6F", red: "#C1573B", blue: "#5B8DBF", purple: "#8D7AC9",
  },
  light: {
    bg: "#F5F2EA", bgElev: "#FFFFFF", card: "#FFFFFF", border: "#E2DCC8",
    text: "#1B2230", textDim: "#6B6253", gold: "#A9791E", goldSoft: "#C9A227",
    green: "#2F7A55", red: "#A8442C", blue: "#3D6F99", purple: "#6E5DA8",
  },
};

export const EXPENSE_CATEGORIES = ["Food", "Transport", "Housing/Bills", "Subscriptions", "Health", "Family", "Clothing", "Personal", "Other"];
export const CAT_COLORS = { "Food": "#C9A227", "Transport": "#5B8DBF", "Housing/Bills": "#C1573B", "Subscriptions": "#8D7AC9", "Health": "#3E9C6F", "Family": "#D98E3F", "Clothing": "#B568A8", "Personal": "#6B9FB0", "Other": "#7A8699" };
export const INCOME_CATEGORIES = ["Salary", "Freelance", "Refund", "Gift", "Investment", "Other"];
export const PAYMENT_METHODS = ["Cash", "Debit", "Credit", "Transfer", "Other"];
export const INVESTMENT_TYPES = ["Stocks", "ETFs", "Mutual Funds", "Treasury Bonds", "401(k)/IRA", "Crypto", "Real Estate"];
export const STATEMENT_CATEGORIES = ["Credit Card", "Bank Account", "Investment", "Service", "Other"];

export const RISK_RANGES = {
  Conservative: { min: 3, max: 5, desc: "T-Bills, CDs, money market funds, short-term bond funds." },
  Moderate: { min: 6, max: 8, desc: "Mix of bonds, broad ETFs (e.g. VTI, BND), balanced funds." },
  Aggressive: { min: 9, max: 12, desc: "Equity ETFs, individual stocks — higher volatility." },
};
