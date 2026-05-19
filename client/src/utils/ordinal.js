/**
 * Returns the ordinal string for a positive integer.
 * e.g. ordinal(1) → '1st', ordinal(2) → '2nd', ordinal(13) → '13th'
 */
export function ordinal(n) {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  // 11th, 12th, 13th are exceptions
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = abs % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}
