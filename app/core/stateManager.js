import Redis from "ioredis";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCOUNTS_KEY = "accounts";
const RATES_KEY = "rates";
const LOG_KEY = "log";

let redis;

export async function init() {
  redis = new Redis({ host: process.env.REDIS_HOST || "localhost", port: 6379 });

  if (!(await redis.exists(ACCOUNTS_KEY))) {
    const data = await loadFromFile("../state/accounts.json");
    await redis.set(ACCOUNTS_KEY, JSON.stringify(data ?? []));
  }
  if (!(await redis.exists(RATES_KEY))) {
    const data = await loadFromFile("../state/rates.json");
    await redis.set(RATES_KEY, JSON.stringify(data ?? {}));
  }
  if (!(await redis.exists(LOG_KEY))) {
    const data = await loadFromFile("../state/log.json");
    await redis.set(LOG_KEY, JSON.stringify(data ?? []));
  }
}

export async function getAccounts() {
  return JSON.parse(await redis.get(ACCOUNTS_KEY));
}

export async function getRates() {
  return JSON.parse(await redis.get(RATES_KEY));
}

export async function getLog() {
  return JSON.parse(await redis.get(LOG_KEY));
}

export async function saveAccounts(accounts) {
  await redis.set(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function saveRates(rates) {
  await redis.set(RATES_KEY, JSON.stringify(rates));
}

export async function saveLog(log) {
  await redis.set(LOG_KEY, JSON.stringify(log));
}

async function loadFromFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
