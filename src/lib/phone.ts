export function normalizeTurkishMobilePhone(input: string) {
  const compact = input.trim().replace(/[\s()-]/g, "");

  if (!compact) {
    return null;
  }

  if (!/^\+?\d+$/.test(compact)) {
    return null;
  }

  if (compact.startsWith("+") && !compact.startsWith("+90")) {
    return null;
  }

  let digits = compact.startsWith("+") ? compact.slice(1) : compact;

  if (digits.startsWith("90")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10 || !digits.startsWith("5")) {
    return null;
  }

  return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(
    6,
    8,
  )} ${digits.slice(8, 10)}`;
}

export function isValidTurkishMobilePhone(input: string) {
  return normalizeTurkishMobilePhone(input) !== null;
}
