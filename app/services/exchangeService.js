import { nanoid } from "nanoid";
import * as accountRepository from "../repositories/accountRepository.js";
import * as rateRepository from "../repositories/rateRepository.js";
import * as logRepository from "../repositories/logRepository.js";
import * as transferService from "./transferService.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { hasFields, isPositiveNumber } from "../utils/validators.js";

export async function performExchange(exchangeRequest) {
  const { baseCurrency, counterCurrency, baseAccountId, counterAccountId, baseAmount } =
    exchangeRequest;

  if (!hasFields(exchangeRequest, ["baseCurrency", "counterCurrency", "baseAccountId", "counterAccountId", "baseAmount"])) {
    throw new ValidationError("Missing required fields");
  }
  if (!isPositiveNumber(baseAmount)) {
    throw new ValidationError("baseAmount must be a positive number");
  }

  const exchangeRate = rateRepository.getRate(baseCurrency, counterCurrency);
  if (exchangeRate === null) {
    throw new NotFoundError(`No rate found for ${baseCurrency}/${counterCurrency}`);
  }

  const internalBaseAccount = accountRepository.findByCurrency(baseCurrency);
  const internalCounterAccount = accountRepository.findByCurrency(counterCurrency);
  if (!internalBaseAccount || !internalCounterAccount) {
    throw new NotFoundError("Internal account for currency not found");
  }

  const counterAmount = baseAmount * exchangeRate;

  const result = {
    id: nanoid(),
    ts: new Date(),
    ok: false,
    request: exchangeRequest,
    exchangeRate,
    counterAmount: 0,
    obs: null,
  };

  if (internalCounterAccount.balance < counterAmount) {
    result.obs = "Not enough funds on counter currency account";
    return logRepository.add(result);
  }

  const transfer1 = await transferService.transfer(baseAccountId, internalBaseAccount.id, baseAmount);
  if (!transfer1) {
    result.obs = "Could not withdraw from clients' account";
    return logRepository.add(result);
  }

  const transfer2 = await transferService.transfer(internalCounterAccount.id, counterAccountId, counterAmount);
  if (!transfer2) {
    await transferService.transfer(internalBaseAccount.id, baseAccountId, baseAmount);
    result.obs = "Could not transfer to clients' account";
    return logRepository.add(result);
  }

  await accountRepository.updateBalance(internalBaseAccount.id, internalBaseAccount.balance + baseAmount);
  await accountRepository.updateBalance(internalCounterAccount.id, internalCounterAccount.balance - counterAmount);

  result.ok = true;
  result.counterAmount = counterAmount;

  return logRepository.add(result);
}
