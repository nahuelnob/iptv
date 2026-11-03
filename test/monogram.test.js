import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monogram } from '../src/domain/monogram.js';

// Examples from design/PLAN.md section 4.
test('builds channel monograms with the PLAN section 4 rule', () => {
  assert.equal(monogram('C5N'), 'C5N', 'names up to 4 characters stay whole');
  assert.equal(monogram('LN+'), 'LN+', 'names up to 4 characters keep their symbols');
  assert.equal(monogram('DeporTV'), 'DTV', 'one word with 2+ capitals uses those capitals');
  assert.equal(monogram('Pakapaka'), 'PA', 'one plain word uses its first two letters');
  assert.equal(monogram('TN Todo Noticias'), 'TN', 'a leading 2-3 letter acronym is kept');
  assert.equal(monogram('Canal 26'), 'C26', 'two words give initials, numbers stay whole');
  assert.equal(monogram('Televisión Pública'), 'TP', 'accented initials are kept');
  assert.equal(monogram(''), '?', 'an empty name still renders something');
});
