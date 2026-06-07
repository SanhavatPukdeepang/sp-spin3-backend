import assert from 'node:assert/strict';
import test from 'node:test';
import { Order } from '../src/modules/orders/Order.js';
import { calculateOrderTotal } from '../src/modules/orders/orderController.js';

test('order schema keeps compatibility fields and customer reference fields', () => {
  const paths = Order.schema.paths;

  assert.ok(paths.user_id);
  assert.equal(paths.customerId.options.ref, 'User');
  assert.ok(paths['customerSnapshot.name']);
  assert.ok(paths['customer.name']);
});

test('order schema defines query indexes used by customer and operations views', () => {
  const indexedFields = Order.schema.indexes().map(([fields]) => fields);

  assert.ok(indexedFields.some((fields) => fields.createdAt === -1));
  assert.ok(indexedFields.some((fields) => fields.status === 1 && fields.createdAt === -1));
  assert.ok(indexedFields.some((fields) => fields.customerId === 1 && fields.createdAt === -1));
  assert.ok(indexedFields.some((fields) => fields.user_id === 1 && fields.createdAt === -1));
});

test('calculateOrderTotal ignores cancelled items and applies tax', () => {
  const total = calculateOrderTotal({
    orderList: [
      { quantity: 2, price: 100, status: 'finished' },
      { quantity: 1, price: 80, status: 'cancelled' },
      { quantity: 3, price_at_purchase: 10, status: 'InKitchen' },
    ],
  });

  assert.equal(total, 246.1);
});
