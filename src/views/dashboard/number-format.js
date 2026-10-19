export function createNumberFormatter(value, format, locale, { fixedPrecision = false } = {}) {
  const scientific = Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < .01);
  const options = format.type === 'currency' ? { style: 'currency', currency: format.currency }
    : scientific ? { notation: 'scientific', maximumSignificantDigits: 5 } : { maximumFractionDigits: 2 };
  const formatter = new Intl.NumberFormat(locale, options);
  if (!fixedPrecision || value === null) return formatter;
  const digits = formatter.formatToParts(value).find(part => part.type === 'fraction')?.value.length ?? 0;
  // Use the final number's notation and precision throughout the reveal, so
  // intermediate values cannot introduce extra digits or move the unit.
  return new Intl.NumberFormat(locale, { ...options, maximumSignificantDigits: undefined,
    minimumFractionDigits: digits, maximumFractionDigits: digits });
}
