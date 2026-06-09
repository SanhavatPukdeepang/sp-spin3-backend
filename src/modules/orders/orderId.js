import { Counter } from './Counter.js';

const ORDER_ID_SEQUENCE_LIMIT = 36 * 36 * 36 * 36 * 100;

const toBase36Pair = (value) => value.toString(36).toUpperCase().padStart(2, '0');

export const formatOrderId = (sequence) => {
  const zeroBasedSequence = Number(sequence) - 1;
  if (!Number.isSafeInteger(zeroBasedSequence) || zeroBasedSequence < 0) {
    throw new Error('Invalid order sequence');
  }
  if (zeroBasedSequence >= ORDER_ID_SEQUENCE_LIMIT) {
    throw new Error('Order ID limit reached. Maximum is SFC-ZZ-ZZ99.');
  }

  const decimalTail = zeroBasedSequence % 100;
  const base36Value = Math.floor(zeroBasedSequence / 100);
  const secondGroup = base36Value % (36 * 36);
  const firstGroup = Math.floor(base36Value / (36 * 36));

  return `SFC-${toBase36Pair(firstGroup)}-${toBase36Pair(secondGroup)}${String(decimalTail).padStart(2, '0')}`;
};

export const getNextOrderId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { id: 'orderId' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  );

  return formatOrderId(counter.seq);
};
