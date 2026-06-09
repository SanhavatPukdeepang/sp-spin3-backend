import mongoose from 'mongoose';
import { Ingredient } from './Ingredient.js';
import { IngredientLot } from './IngredientLot.js';
import { Waste } from '../wastes/Waste.js';
import { broadcastIngredientSnapshot } from '../../realtime/ingredientSocket.js';

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const roundQuantity = (value) => Math.round(toNumber(value) * 100) / 100;

const createInventoryError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export async function withInventoryTransaction(work, { session } = {}) {
  if (session) return work(session);

  const ownedSession = await mongoose.startSession();
  try {
    let result;
    await ownedSession.withTransaction(async () => {
      result = await work(ownedSession);
    });
    return result;
  } finally {
    await ownedSession.endSession();
  }
}

const isExpired = (ingredient, now = new Date()) => {
  if (!ingredient?.expiryDate) return false;
  const expiry = new Date(ingredient.expiryDate);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry <= now;
};

/**
 * Syncs the total quantity and earliest expiry date of an ingredient from its active batches (IN entries)
 */
export async function syncIngredientState(ingredientId, { session } = {}) {
  const activeLots = await IngredientLot.find({
    ingredient: ingredientId,
    type: 'IN',
    remainingQuantity: { $ne: 0 },
  }).sort({ expiryDate: 1 }).session(session || null);

  const totalQuantity = roundQuantity(activeLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0));
  const positiveLots = activeLots.filter((lot) => lot.remainingQuantity > 0);
  const earliestExpiry = positiveLots.length > 0 ? positiveLots[0].expiryDate : null;
  const latestExpiredLot = totalQuantity > 0
    ? null
    : await IngredientLot.findOne({
      ingredient: ingredientId,
      type: 'EXPIRED',
    }).sort({ createdAt: -1 }).session(session || null);

  const ingredient = await Ingredient.findById(ingredientId).session(session || null);
  if (ingredient) {
    ingredient.quantity = totalQuantity;
    ingredient.expiryDate = earliestExpiry;
    
    // Logic for expiredAt: 
    // If we have stock, it's not "completely expired" as an ingredient 
    // (though individual lots might be, they are handled by their own expiryDate)
    if (totalQuantity > 0) {
      ingredient.expiredAt = null;
    } else if (latestExpiredLot) {
      ingredient.expiredAt = latestExpiredLot.createdAt;
    } else {
      ingredient.expiredAt = null;
    }
    
    await ingredient.save({ session });
  }
}

/**
 * Consumes quantity from active batches (IN entries) in FIFO order (by expiry date)
 * and creates an appropriate transaction record (OUT, ADJUSTMENT, WASTE, etc.)
 */
export async function consumeFromLots(ingredientId, amount, type = 'OUT', reason = '', { session, order } = {}) {
  const normalizedAmount = roundQuantity(amount);
  if (normalizedAmount <= 0) {
    throw createInventoryError('Amount must be positive');
  }
  let remainingToConsume = normalizedAmount;
  
  // Find active batches (IN entries) sorted by expiry date (FIFO)
  const activeLots = await IngredientLot.find({
    ingredient: ingredientId,
    type: 'IN',
    remainingQuantity: { $gt: 0 },
  }).sort({ expiryDate: 1, createdAt: 1 }).session(session || null);

  const availableQuantity = roundQuantity(
    activeLots.reduce((sum, lot) => sum + toNumber(lot.remainingQuantity), 0),
  );
  const sourceLots = [];

  for (const lot of activeLots) {
    if (remainingToConsume <= 0) break;

    const toConsumeFromThisLot = Math.min(lot.remainingQuantity, remainingToConsume);
    lot.remainingQuantity = roundQuantity(lot.remainingQuantity - toConsumeFromThisLot);
    remainingToConsume = roundQuantity(remainingToConsume - toConsumeFromThisLot);
    sourceLots.push({
      lot: lot._id,
      quantity: roundQuantity(toConsumeFromThisLot),
    });
    await lot.save({ session });
  }

  if (remainingToConsume > 0) {
    const deficitQuantity = roundQuantity(remainingToConsume);
    const deficitLot = await IngredientLot.create([{
      ingredient: ingredientId,
      quantity: -deficitQuantity,
      remainingQuantity: -deficitQuantity,
      type: 'IN',
      reason: reason ? `${reason} deficit` : 'Stock deficit',
      order: order || null,
    }], { session });
    sourceLots.push({
      lot: deficitLot[0]._id,
      quantity: deficitQuantity,
    });
    remainingToConsume = 0;
  }

  // Create a record for this consumption
  const movement = new IngredientLot({
    ingredient: ingredientId,
    quantity: -normalizedAmount,
    type,
    reason: reason || (type === 'OUT' ? 'Stock consumption' : ''),
    sourceLots,
    order: order || null,
  });
  await movement.save({ session });

  return { remainingToConsume, movement, sourceLots }; // remaining is 0 if enough stock was available
}

export async function processExpiredIngredientLots({ broadcast = true, session } = {}) {
  const now = new Date();

  const result = await withInventoryTransaction(async (activeSession) => {
    // Find all IN entries that have remaining quantity and are expired
    const expiredLots = await IngredientLot.find({
      type: 'IN',
      remainingQuantity: { $gt: 0 },
      expiryDate: { $ne: null, $lte: now },
    }).populate('ingredient').session(activeSession);

    if (expiredLots.length === 0) {
      return { expiredCount: 0, wastedQuantity: 0 };
    }

    let wastedQuantity = 0;
    const affectedIngredientIds = new Set();

    for (const lot of expiredLots) {
      const ingredient = lot.ingredient;
      if (!ingredient) continue;

      const quantity = toNumber(lot.remainingQuantity);
      if (quantity <= 0) continue;

      // Create a Waste record
      await Waste.create([{
        ingredient: ingredient._id,
        ingredientLot: lot._id,
        itemName: ingredient.name,
        quantity,
        unit: ingredient.unit,
        estimatedCost: quantity * toNumber(ingredient.price_per_unit),
        recordedBy: 'System',
        date: now,
        reason: 'Expired',
        quantity_wasted: quantity,
        total_cost: quantity * toNumber(ingredient.price_per_unit),
      }], { session: activeSession });

      // Create an EXPIRED entry
      await IngredientLot.create([{
        ingredient: ingredient._id,
        quantity: -quantity,
        type: 'EXPIRED',
        reason: `Expired lot from ${lot.createdAt.toLocaleDateString()}`,
      }], { session: activeSession });

      // Mark the original batch as consumed
      lot.remainingQuantity = 0;
      await lot.save({ session: activeSession });

      wastedQuantity += quantity;
      affectedIngredientIds.add(String(ingredient._id));
    }

    // Sync state for all affected ingredients
    for (const ingredientId of affectedIngredientIds) {
      await syncIngredientState(ingredientId, { session: activeSession });
    }

    return {
      expiredCount: expiredLots.length,
      wastedQuantity,
    };
  }, { session });

  if (broadcast) {
    await broadcastIngredientSnapshot();
  }

  return result;
}

export const hasIngredientExpired = isExpired;
