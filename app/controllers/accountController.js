import * as accountService from "../services/accountService.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

export function getAll(req, res) {
  res.json(accountService.getAll());
}

export async function setBalance(req, res) {
  const accountId = req.params.id;
  const { balance } = req.body;

  if (!accountId || balance === undefined || balance === null) {
    return res.status(400).json({ error: "Malformed request" });
  }

  try {
    await accountService.setBalance(accountId, balance);
    res.json(accountService.getAll());
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: "Malformed request" });
    if (err instanceof NotFoundError) return res.json(accountService.getAll());
    res.status(500).json({ error: err.message });
  }
}
