import * as stateManager from "../core/stateManager.js";
import { NotFoundError } from "../utils/errors.js";

export async function findAll() {
  return stateManager.getAccounts();
}

export async function findById(id) {
  const accounts = await stateManager.getAccounts();
  return accounts.find((a) => a.id == id) ?? null;
}

export async function findByCurrency(currency) {
  const accounts = await stateManager.getAccounts();
  return accounts.find((a) => a.currency === currency) ?? null;
}

export async function updateBalance(id, newBalance) {
  const accounts = await stateManager.getAccounts();
  const account = accounts.find((a) => a.id == id);
  if (!account) throw new NotFoundError(`Account ${id} not found`);
  account.balance = newBalance;
  await stateManager.saveAccounts(accounts);
  return account;
}
