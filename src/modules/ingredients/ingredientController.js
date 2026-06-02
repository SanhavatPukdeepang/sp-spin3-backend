import { Ingredient } from './Ingredient.js';
import { IngredientLot } from './IngredientLot.js';
import { broadcastIngredientSnapshot } from '../../realtime/ingredientSocket.js';
import { processExpiredIngredientLots, syncIngredientState, consumeFromLots } from './inventoryLifecycle.js';

const parseRequiredExpiryDate = (expiryDate) => {
  if (!expiryDate) return null;
  const parsedDate = new Date(expiryDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const roundQuantity = (value) => Math.round(toNumber(value) * 100) / 100;

const getStartOfYesterday = () => {
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

const isPastOrToday = (date) => {
  if (!date) return false;
  const parsedDate = new Date(date);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate <= new Date();
};

const withExpiredQuantities = async (ingredients) => {
  const ingredientList = Array.isArray(ingredients) ? ingredients : [];
  const expiredTotals = await IngredientLot.aggregate([
    {
      $match: {
        ingredient: { $in: ingredientList.map((ingredient) => ingredient._id) },
        type: 'EXPIRED',
      },
    },
    {
      $group: {
        _id: '$ingredient',
        expiredQuantity: { $sum: '$quantity' },
      },
    },
  ]);
  const expiredQuantityById = new Map(
    expiredTotals.map((item) => [String(item._id), Math.abs(Number(item.expiredQuantity || 0))]),
  );

  return ingredientList.map((ingredient) => ({
    ...(ingredient.toObject ? ingredient.toObject() : ingredient),
    expiredQuantity: expiredQuantityById.get(String(ingredient._id)) || 0,
  }));
};

export async function getAllIngredients(req, res) {
  try {
    const ingredients = await Ingredient.find().sort({ ingredient_index: 1, name: 1 });
    res.json(await withExpiredQuantities(ingredients));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getIngredientsByStatus(req, res) {
  try {
    const ingredients = await Ingredient.find({ active_status: true }).sort({
      ingredient_index: 1,
      name: 1,
    });

    const grouped = {
      in_stock: [],
      low_stock: [],
      out_of_stock: [],
    };

    ingredients.forEach((item) => {
      if (item.quantity === 0) {
        grouped.out_of_stock.push(item);
      } else if (item.quantity < item.low_stock_threshold) {
        grouped.low_stock.push(item);
      } else {
        grouped.in_stock.push(item);
      }
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getIngredient(req, res) {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getIngredientLots(req, res) {
  try {
    const activeLots = await IngredientLot.find({
      ingredient: req.params.id,
      type: 'IN',
      remainingQuantity: { $gt: 0 },
    }).sort({ expiryDate: 1, createdAt: 1 });
    const activeLotIds = new Set(activeLots.map((lot) => String(lot._id)));
    const recentLots = await IngredientLot.find({ ingredient: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    const lots = [
      ...activeLots,
      ...recentLots.filter((lot) => !activeLotIds.has(String(lot._id))),
    ];
    res.json(lots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addIngredientStock(req, res) {
  try {
    const { quantity, expiryDate, reason } = req.body;
    const normalizedQuantity = roundQuantity(quantity);
    if (typeof quantity !== 'number' || normalizedQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    const lotExpiryDate = parseRequiredExpiryDate(expiryDate);
    if (!lotExpiryDate) {
      return res.status(400).json({ error: 'Expiry date is required for stock lots' });
    }

    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    await IngredientLot.create({
      ingredient: ingredient._id,
      quantity: normalizedQuantity,
      remainingQuantity: normalizedQuantity,
      unit: ingredient.unit,
      expiryDate: lotExpiryDate,
      type: 'IN',
      reason: reason || 'New lot added',
    });

    await syncIngredientState(ingredient._id);
    const updatedIngredient = await Ingredient.findById(ingredient._id);

    await broadcastIngredientSnapshot();
    res.json(updatedIngredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function expireIngredientLot(req, res) {
  try {
    const lotId = req.params.lotId;
    const lot = await IngredientLot.findById(lotId).populate('ingredient');
    
    if (!lot || lot.type !== 'IN' || lot.remainingQuantity <= 0) {
      return res.status(404).json({ error: 'Active lot not found' });
    }

    const ingredient = lot.ingredient;
    lot.expiryDate = getStartOfYesterday();
    lot.reason = lot.reason || 'Manually marked expired';
    await lot.save();

    await processExpiredIngredientLots({ broadcast: false });
    await syncIngredientState(ingredient._id);
    await broadcastIngredientSnapshot();

    res.json({ message: 'Lot expired successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateIngredientLot(req, res) {
  try {
    const { lotId } = req.params;
    const { quantity, remainingQuantity, expiryDate, reason } = req.body;
    
    const lot = await IngredientLot.findById(lotId);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });

    if (quantity !== undefined) lot.quantity = roundQuantity(quantity);
    if (remainingQuantity !== undefined) lot.remainingQuantity = roundQuantity(remainingQuantity);
    if (expiryDate !== undefined) lot.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (reason !== undefined) lot.reason = reason;
    if (lot.type === 'IN' && lot.remainingQuantity > 0 && !parseRequiredExpiryDate(lot.expiryDate)) {
      return res.status(400).json({ error: 'Expiry date is required for active stock lots' });
    }

    await lot.save();
    if (lot.type === 'IN' && lot.remainingQuantity > 0 && isPastOrToday(lot.expiryDate)) {
      await processExpiredIngredientLots({ broadcast: false });
    }
    await syncIngredientState(lot.ingredient);
    await broadcastIngredientSnapshot();
    
    res.json(lot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteIngredientLot(req, res) {
  try {
    const { lotId } = req.params;
    const lot = await IngredientLot.findById(lotId);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });

    const ingredientId = lot.ingredient;
    await IngredientLot.findByIdAndDelete(lotId);
    
    await syncIngredientState(ingredientId);
    await broadcastIngredientSnapshot();
    
    res.json({ message: 'Lot deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateIngredientStock(req, res) {
  try {
    const { quantity, expiryDate, reason } = req.body;
    const normalizedQuantity = roundQuantity(quantity);
    if (typeof quantity !== 'number') {
      return res.status(400).json({ error: 'Quantity must be a number' });
    }

    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Determine the type of change
    const diff = roundQuantity(normalizedQuantity - ingredient.quantity);
    if (diff === 0) return res.json(ingredient);

    if (diff > 0) {
      const lotExpiryDate = parseRequiredExpiryDate(expiryDate);
      if (!lotExpiryDate) {
        return res.status(400).json({ error: 'Expiry date is required when adding stock' });
      }
      // Adding stock: Create an IN entry
      await IngredientLot.create({
        ingredient: ingredient._id,
        quantity: diff,
        remainingQuantity: diff,
        unit: ingredient.unit,
        expiryDate: lotExpiryDate,
        type: 'IN',
        reason: reason || 'Manual stock adjustment (Add)',
      });
    } else {
      // Decreasing stock: Use the consume logic
      await consumeFromLots(ingredient._id, Math.abs(diff), 'ADJUSTMENT', reason || 'Manual stock adjustment (Decrease)');
    }

    await syncIngredientState(ingredient._id);
    const updatedIngredient = await Ingredient.findById(ingredient._id);

    await broadcastIngredientSnapshot();
    res.json(updatedIngredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateIngredient(req, res) {
  try {
    const allowedFields = [
      'name',
      'unit',
      'price_per_unit',
      'low_stock_threshold',
      'active_status',
    ];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (updates.name !== undefined) {
      const duplicateIngredient = await Ingredient.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${String(updates.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });
      if (duplicateIngredient) {
        return res.status(409).json({ error: 'Ingredient name already exists' });
      }
      updates.name = String(updates.name).trim();
    }

    if (updates.unit !== undefined && !String(updates.unit).trim()) {
      return res.status(400).json({ error: 'Unit is required' });
    }

    ['price_per_unit', 'low_stock_threshold'].forEach((field) => {
      if (updates[field] !== undefined) {
        updates[field] = Number(updates[field]);
      }
    });

    // Special handling for quantity and expiryDate if they are provided in the update
    if (req.body.quantity !== undefined || req.body.expiryDate !== undefined) {
      const ingredient = await Ingredient.findById(req.params.id);
      if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });

      const newQty = req.body.quantity !== undefined ? roundQuantity(req.body.quantity) : ingredient.quantity;
      const newExpiry = req.body.expiryDate !== undefined ? (req.body.expiryDate ? new Date(req.body.expiryDate) : null) : ingredient.expiryDate;
      if (req.body.expiryDate !== undefined && newQty > 0 && !parseRequiredExpiryDate(newExpiry)) {
        return res.status(400).json({ error: 'Expiry date is required for active stock' });
      }

      const diff = roundQuantity(newQty - ingredient.quantity);
      if (diff !== 0 || (req.body.expiryDate !== undefined && String(newExpiry) !== String(ingredient.expiryDate))) {
        if (diff > 0) {
          if (!parseRequiredExpiryDate(newExpiry)) {
            return res.status(400).json({ error: 'Expiry date is required when adding stock' });
          }
          await IngredientLot.create({
            ingredient: ingredient._id,
            quantity: diff,
            remainingQuantity: diff,
            unit: updates.unit || ingredient.unit,
            expiryDate: newExpiry,
            type: 'IN',
            reason: 'Ingredient details update',
          });
        } else if (diff < 0) {
          await consumeFromLots(ingredient._id, Math.abs(diff), 'ADJUSTMENT', 'Ingredient details update');
        } else if (req.body.expiryDate !== undefined) {
          // Update the earliest active lot's expiry
          const earliestLot = await IngredientLot.findOne({
            ingredient: ingredient._id,
            type: 'IN',
            remainingQuantity: { $gt: 0 },
          }).sort({ expiryDate: 1, createdAt: 1 });
          
          if (earliestLot) {
            earliestLot.expiryDate = newExpiry;
            await earliestLot.save();
          }
        }
      }
    }

    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    );

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    if (updates.unit !== undefined) {
      await IngredientLot.updateMany(
        { ingredient: ingredient._id, type: 'IN' },
        { $set: { unit: updates.unit } },
      );
    }

    await syncIngredientState(ingredient._id);
    const finalizedIngredient = await Ingredient.findById(ingredient._id);

    await broadcastIngredientSnapshot();
    res.json(finalizedIngredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function decreaseIngredientStock(req, res) {
  try {
    const { amount, reason } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    if (ingredient.quantity < amount) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    await consumeFromLots(ingredient._id, amount, 'OUT', reason);
    await syncIngredientState(ingredient._id);
    
    const updatedIngredient = await Ingredient.findById(ingredient._id);
    await broadcastIngredientSnapshot();
    res.json(updatedIngredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createIngredient(req, res) {
  try {
    const { name, quantity, unit, price_per_unit, low_stock_threshold, expiryDate } =
      req.body;

    const trimmedName = String(name || '').trim();
    const initialQuantity = Number(quantity || 0);
    const initialLotExpiryDate = initialQuantity > 0 ? parseRequiredExpiryDate(expiryDate) : null;

    if (!trimmedName || !unit || price_per_unit === undefined) {
      return res
        .status(400)
        .json({ error: 'Missing required fields' });
    }
    if (initialQuantity > 0 && !initialLotExpiryDate) {
      return res.status(400).json({ error: 'Expiry date is required for initial stock' });
    }

    const duplicateIngredient = await Ingredient.findOne({
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (duplicateIngredient) {
      return res.status(409).json({ error: 'Ingredient name already exists' });
    }

    const lastIngredient = await Ingredient.findOne()
      .sort({ ingredient_index: -1 })
      .select('ingredient_index');
    const nextIndex = Number(lastIngredient?.ingredient_index || 0) + 1;

    const ingredient = new Ingredient({
      ingredient_index: nextIndex,
      name: trimmedName,
      quantity: 0,
      unit: String(unit).trim(),
      price_per_unit: Number(price_per_unit),
      low_stock_threshold: roundQuantity(low_stock_threshold || 0),
      active_status: true,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    await ingredient.save();

    if (initialQuantity > 0) {
      await IngredientLot.create({
        ingredient: ingredient._id,
        quantity: roundQuantity(initialQuantity),
        remainingQuantity: roundQuantity(initialQuantity),
        unit: ingredient.unit,
        expiryDate: initialLotExpiryDate,
        type: 'IN',
        reason: 'Initial setup',
      });
      await syncIngredientState(ingredient._id);
    }

    const finalizedIngredient = await Ingredient.findById(ingredient._id);
    await broadcastIngredientSnapshot();
    res.status(201).json(finalizedIngredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
