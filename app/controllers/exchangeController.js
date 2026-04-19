import * as exchangeService from "../services/exchangeService.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

export async function postExchange(req, res) {
  const { baseCurrency, counterCurrency, baseAccountId, counterAccountId, baseAmount } = req.body;

  if (!baseCurrency || !counterCurrency || !baseAccountId || !counterAccountId || !baseAmount) {
    return res.status(400).json({ error: "Malformed request" });
  }

  try {
    const result = await exchangeService.performExchange(req.body);
    res.status(result.ok ? 200 : 500).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
