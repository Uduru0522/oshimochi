import assert from 'node:assert/strict';
import test from 'node:test';
import { createNumberFormatter } from '../../src/views/dashboard/number-format.js';

test('count-up precision follows the final displayed value in every interface language', () => {
  for (const locale of ['en', 'ja', 'zh-Hant']) {
    for (const [value, digits] of [[23, 0], [1592.2, 1], [1592.25, 2], [-12.3, 1], [1.999, 0]]) {
      const format = createNumberFormatter(value, { type: 'number' }, locale, { fixedPrecision: true });
      for (const progress of [0, .001, .1, .5, .9, 1]) {
        const fraction = format.formatToParts(value * progress).find(part => part.type === 'fraction')?.value ?? '';
        assert.equal(fraction.length, digits, `${locale}: ${value} at ${progress}`);
      }
      assert.equal(format.format(value), createNumberFormatter(value, { type: 'number' }, locale).format(value));
    }
  }
});

test('reveals retain the final notation and currency precision near zero', () => {
  for (const currency of ['JPY', 'USD', 'TWD']) {
    const style = { type: 'currency', currency }, value = 1234.5;
    const format = createNumberFormatter(value, style, 'en', { fixedPrecision: true });
    assert.equal(format.format(value), createNumberFormatter(value, style, 'en').format(value));
    const digits = format.formatToParts(value).find(part => part.type === 'fraction')?.value.length ?? 0;
    assert.equal(format.formatToParts(0).find(part => part.type === 'fraction')?.value.length ?? 0, digits);
  }
  const ordinary = createNumberFormatter(23, { type: 'number' }, 'en', { fixedPrecision: true });
  assert.equal(ordinary.format(.0001), '0', 'intermediate fractions cannot switch an ordinary counter to scientific notation');
  for (const value of [.001234, 1.2345e13]) {
    const format = createNumberFormatter(value, { type: 'number' }, 'en', { fixedPrecision: true });
    assert.equal(format.format(value), createNumberFormatter(value, { type: 'number' }, 'en').format(value));
    assert.ok(format.format(0).includes('E'));
  }
});
