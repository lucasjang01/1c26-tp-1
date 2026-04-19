import * as logRepository from "../repositories/logRepository.js";

export function getAll(req, res) {
  res.json(logRepository.findAll());
}
