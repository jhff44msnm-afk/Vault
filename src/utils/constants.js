/* Tokens y listas compartidas por toda la app */
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

export const EXPENSE_CATEGORIES = ["Comida", "Transporte", "Vivienda/Bills", "Suscripciones", "Salud", "Familia", "Ropa", "Personal", "Otros"];
export const CAT_COLORS = { "Comida": "#C9A227", "Transporte": "#5B8DBF", "Vivienda/Bills": "#C1573B", "Suscripciones": "#8D7AC9", "Salud": "#3E9C6F", "Familia": "#D98E3F", "Ropa": "#B568A8", "Personal": "#6B9FB0", "Otros": "#7A8699" };
export const INCOME_CATEGORIES = ["Salario", "Freelance", "Reembolso", "Regalo", "Inversión", "Otro"];
export const PAYMENT_METHODS = ["Efectivo", "Débito", "Crédito", "Transferencia", "Otro"];
export const INVESTMENT_TYPES = ["Acciones", "ETFs", "Fondos", "CETES", "AFORE", "Criptomonedas", "Bienes raíces"];
export const STATEMENT_CATEGORIES = ["Tarjeta de crédito", "Cuenta bancaria", "Inversión", "Servicio", "Otro"];

export const RISK_RANGES = {
  Conservador: { min: 3, max: 5, desc: "CETES, pagarés, fondos de deuda de corto plazo." },
  Moderado: { min: 6, max: 8, desc: "Mezcla de renta fija y ETFs amplios (ej. VT, bonos)." },
  Agresivo: { min: 9, max: 12, desc: "ETFs de renta variable, acciones individuales — mayor volatilidad." },
};

