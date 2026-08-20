import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_GUESTS, capitalizeSlug } from './demoGuests.js';

describe('demoGuests', () => {
  it('capitalizes slug for conversation name', () => {
    assert.equal(capitalizeSlug('ivonne'), 'Ivonne');
    assert.equal(capitalizeSlug('IVONNE'), 'Ivonne');
    assert.equal(capitalizeSlug(''), '');
  });

  it('seeds Ivonne guest with isolated conversation', () => {
    const ivonne = DEMO_GUESTS.find((g) => g.demoSlug === 'ivonne');
    assert.ok(ivonne);
    assert.equal(ivonne.conversation, 'Ivonne');
    assert.equal(ivonne.role, 'operator');
    assert.match(ivonne.briefing, /Ivonne/i);
    assert.match(ivonne.briefing, /KovZu/i);
    assert.match(ivonne.briefing, /Zephir/i);
  });
});
