import * as rateService from "../services/rateService.js";
import { ValidationError } from "../utils/errors.js";

export async function getAll(req, res) {
  res.json(await rateService.getAll());
}

export async function setRate(req, res) {
  const { baseCurrency, counterCurrency, rate } = req.body;

  if (!baseCurrency || !counterCurrency || !rate) {
    return res.status(400).json({ error: "Malformed request" });
  }

  try {
    await rateService.setRate({ baseCurrency, counterCurrency, rate });
    res.json(await rateService.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
