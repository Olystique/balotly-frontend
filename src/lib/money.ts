/**
 * The one place kobo becomes naira.
 *
 * The API sends money as integer kobo and never as a float. Every screen
 * that shows a price goes through here, so ₦1,000 is formatted the same way
 * everywhere and nobody divides by 100 in a component.
 */
const naira = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNaira(amountKobo: number): string {
  if (!Number.isInteger(amountKobo)) {
    throw new TypeError(`amountKobo must be an integer, got ${amountKobo}`);
  }
  const whole = Math.trunc(amountKobo / 100);
  const kobo = Math.abs(amountKobo % 100);
  const sign = amountKobo < 0 ? "-" : "";
  const value = kobo === 0 ? naira.format(Math.abs(whole)) : naira.format(Math.abs(whole) + kobo / 100);
  return `${sign}₦${value}`;
}
