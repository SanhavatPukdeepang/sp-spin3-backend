import { Router } from 'express';
import {
  getAllIngredients,
  getIngredientsByStatus,
  getIngredient,
  updateIngredientStock,
  decreaseIngredientStock,
  createIngredient,
} from '../modules/ingredients/ingredientController.js';

export const router = Router();

// GET all ingredients
router.get('/', getAllIngredients);

// GET ingredients grouped by status (in_stock, low_stock, out_of_stock) - COOK BOARD
router.get('/status/board', getIngredientsByStatus);

// GET single ingredient
router.get('/:id', getIngredient);

// POST create ingredient
router.post('/', createIngredient);

// PUT update ingredient stock (set exact quantity)
router.put('/:id/stock', updateIngredientStock);

// PUT decrease ingredient stock (used when cooking)
router.put('/:id/decrease', decreaseIngredientStock);
