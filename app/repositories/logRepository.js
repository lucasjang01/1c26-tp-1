import * as stateManager from "../core/stateManager.js";

export function findAll() {
  return stateManager.getLog();
}

export async function add(transaction) {
  stateManager.getLog().push(transaction);
  await stateManager.saveLog();
  return transaction;
}
