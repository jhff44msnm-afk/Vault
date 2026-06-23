/* Integración con Alpha Vantage para precios en vivo (opcional) */
export async function fetchAlphaVantageQuote(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const json = await res.json();
  const q = json["Global Quote"];
  if (!q || !q["05. price"]) throw new Error(json["Note"] || json["Information"] || "Sin datos para ese símbolo.");
  return { price: Number(q["05. price"]), changePct: q["10. change percent"] || "" };
}
