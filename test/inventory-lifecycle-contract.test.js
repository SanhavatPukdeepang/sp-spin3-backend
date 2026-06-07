import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeFromLots, processExpiredIngredientLots, withInventoryTransaction } from '../src/modules/ingredients/inventoryLifecycle.js';

test('inventory lifecycle exposes a shared transaction helper for stock mutations', () => {
  assert.equal(typeof withInventoryTransaction, 'function');
});

test('consumeFromLots validates stock before creating movement records', () => {
  const source = consumeFromLots.toString();

  assert.match(source, /availableQuantity\s*</);
  assert.match(source, /Insufficient stock/);
  assert.match(source, /throw createInventoryError/);
});

test('expired lot processing runs writes inside a session-aware transaction path', () => {
  const source = processExpiredIngredientLots.toString();

  assert.match(source, /withInventoryTransaction/);
  assert.match(source, /Waste\.create\(\[\{/);
  assert.match(source, /IngredientLot\.create\(\[\{/);
  assert.match(source, /session: activeSession/);
});
