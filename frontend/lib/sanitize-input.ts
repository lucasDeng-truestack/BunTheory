export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integerPart, ...decimalParts] = cleaned.split(".");
  return decimalParts.length > 0
    ? `${integerPart}.${decimalParts.join("")}`
    : integerPart;
}

/** Money-style input: digits + one dot, at most `maxDecimals` digits after the dot. */
export function sanitizeMoneyInput(value: string, maxDecimals = 2): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) {
    return cleaned;
  }

  const intPart = cleaned.slice(0, firstDot).replace(/\D/g, "");
  const afterDot = cleaned.slice(firstDot + 1).replace(/\D/g, "");
  const decPart = afterDot.slice(0, maxDecimals);

  if (afterDot === "" && cleaned.endsWith(".")) {
    return intPart === "" ? "0." : `${intPart}.`;
  }

  return decPart.length > 0 ? `${intPart}.${decPart}` : intPart;
}
