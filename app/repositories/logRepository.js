import * as stateManager from "../core/stateManager.js";

export async function findAll() {
  return stateManager.getLog();
}

export async function add(transaction) {
  const log = await stateManager.getLog();
  log.push(transaction);
  await stateManager.saveLog(log);
  return transaction;
}
