import * as rateRepository from "../repositories/rateRepository.js";
import { ValidationError } from "../utils/errors.js";
import { isPositiveNumber } from "../utils/validators.js";

export function getAll() {
  return rateRepository.getAll();
}

export async function setRate({ baseCurrency, counterCurrency, rate }) {
  if (!isPositiveNumber(rate)) {
    throw new ValidationError("Rate must be a positive number");
  }
  await rateRepository.setRate(baseCurrency, counterCurrency, rate);
  await rateRepository.setRate(counterCurrency, baseCurrency, Number((1 / rate).toFixed(5)));
}
