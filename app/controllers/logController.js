import * as logRepository from "../repositories/logRepository.js";

export async function getAll(req, res) {
  res.json(await logRepository.findAll());
}
