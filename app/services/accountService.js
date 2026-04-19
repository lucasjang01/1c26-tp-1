import * as accountRepository from "../repositories/accountRepository.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { isNonNegativeNumber } from "../utils/validators.js";

export function getAll() {
  return accountRepository.findAll();
}

export async function setBalance(id, balance) {
  if (!isNonNegativeNumber(balance)) {
    throw new ValidationError("Balance must be a non-negative number");
  }
  const account = accountRepository.findById(id);
  if (!account) throw new NotFoundError(`Account ${id} not found`);
  return accountRepository.updateBalance(id, balance);
}
