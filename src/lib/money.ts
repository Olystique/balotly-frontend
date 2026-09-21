/**
 * The one place kobo becomes naira.
 *
 * The API sends money as integer kobo and never as a float. Every screen
 * that shows a price goes through here, so ₦1,000 is formatted the same way
 * everywhere and nobody divides by 100 in a component.
 *
 * Whole naira shows no decimals (₦500). Any kobo shows exactly two (₦125.50).
 */
const wholeNaira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const nairaAndKobo = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNaira(amountKobo: number): string {
  if (!Number.isInteger(amountKobo)) {
    throw new TypeError(`amountKobo must be an integer, got ${amountKobo}`);
  }
  const sign = amountKobo < 0 ? "-" : "";
  const abs = Math.abs(amountKobo);
  const value = abs % 100 === 0 ? wholeNaira.format(abs / 100) : nairaAndKobo.format(abs / 100);
  return `${sign}₦${value}`;
}
