import * as stateManager from "../core/stateManager.js";

export async function getAll() {
  return stateManager.getRates();
}

export async function getRate(baseCurrency, counterCurrency) {
  const rates = await stateManager.getRates();
  return rates?.[baseCurrency]?.[counterCurrency] ?? null;
}

export async function setRate(baseCurrency, counterCurrency, rate) {
  const rates = await stateManager.getRates();
  if (!rates[baseCurrency]) rates[baseCurrency] = {};
  rates[baseCurrency][counterCurrency] = rate;
  await stateManager.saveRates(rates);
}
