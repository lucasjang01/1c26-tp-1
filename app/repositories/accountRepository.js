import * as stateManager from "../core/stateManager.js";
import { NotFoundError } from "../utils/errors.js";

export function findAll() {
  return stateManager.getAccounts();
}

export function findById(id) {
  return stateManager.getAccounts().find((a) => a.id == id) ?? null;
}

export function findByCurrency(currency) {
  return stateManager.getAccounts().find((a) => a.currency === currency) ?? null;
}

export async function updateBalance(id, newBalance) {
  const account = findById(id);
  if (!account) throw new NotFoundError(`Account ${id} not found`);
  account.balance = newBalance;
  await stateManager.saveAccounts();
  return account;
}
