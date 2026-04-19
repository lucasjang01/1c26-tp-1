export function isPositiveNumber(v) {
  return typeof v === "number" && v > 0;
}

export function isNonNegativeNumber(v) {
  return typeof v === "number" && v >= 0;
}

export function hasFields(obj, fields) {
  return fields.every((f) => obj[f] !== undefined && obj[f] !== null);
}
