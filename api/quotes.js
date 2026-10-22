// Vercel serverless function: GET /api/quotes
// Fetches delayed quotes from Yahoo Finance's public chart endpoint (server-side, so no CORS problem)
// and returns { updated, quotes: { SYMBOL: { p, prev, c } } }. Cached at the edge for 60 seconds.
const SYMBOLS = ["000001.SS", "000300.SS", "AAPL", "ADBE", "AI", "AMAT", "AMD", "AMZN", "ANET", "ARM", "ASML", "AUDUSD=X", "AVGO", "BRK-B", "BTC-USD", "BZ=F", "CEG", "CL=F", "CRM", "CRWV", "DDOG", "DELL", "DX-Y.NYB", "EQIX", "ETH-USD", "EURUSD=X", "GBPUSD=X", "GC=F", "GOOGL", "HG=F", "IBM", "INR=X", "INTC", "JPM", "JPY=X", "KLAC", "LLY", "LRCX", "MDB", "META", "MRVL", "MSFT", "MU", "NBIS", "NG=F", "NOW", "NVDA", "ORCL", "PLTR", "QCOM", "SI=F", "SMCI", "SNDK", "SNOW", "SPCX", "TSLA", "TSM", "TXN", "UNH", "V", "VRT", "VST", "WMT", "XOM", "^AXJO", "^BSESN", "^DJI", "^FCHI", "^FTSE", "^FVX", "^GDAXI", "^GSPC", "^HSI", "^IXIC", "^KS11", "^N225", "^NDX", "^NSEI", "^RUT", "^STOXX50E", "^TNX", "^TYX", "^VIX"];

async function one(sym) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?range=1d&interval=1d";
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; DailyMarkets/1.0)", "Accept": "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const m = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
    if (!m || typeof m.regularMarketPrice !== "number") return null;
    const prev = typeof m.chartPreviousClose === "number" ? m.chartPreviousClose : (m.previousClose || null);
    const c = prev ? ((m.regularMarketPrice - prev) / prev) * 100 : null;
    return { p: m.regularMarketPrice, prev, c, t: m.regularMarketTime || null };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  const results = await Promise.all(SYMBOLS.map(one));
  const quotes = {};
  SYMBOLS.forEach((s, i) => { if (results[i]) quotes[s] = results[i]; });
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.setHeader("Content-Type", "application/json");
  res.status(Object.keys(quotes).length ? 200 : 502).send(JSON.stringify({ updated: new Date().toISOString(), quotes }));
};
