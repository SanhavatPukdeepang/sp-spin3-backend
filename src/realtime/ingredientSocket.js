import { WebSocket, WebSocketServer } from 'ws';
import { Ingredient } from '../modules/ingredients/Ingredient.js';
import { IngredientLot } from '../modules/ingredients/IngredientLot.js';
import { Menu } from '../modules/menus/Menu.js';
import { broadcastSSE } from '../utils/sse.js';


let ingredientSocketServer;
const STOCK_EPSILON = 0.000001;

const withStockStatus = (menu) => {
  const item = menu.toObject ? menu.toObject() : menu;
  const linkedIngredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  const hasRecipe = linkedIngredients.length > 0;
  const missingIngredients = linkedIngredients
    .filter((entry) => {
      const ingredient = entry.ingredient;
      return (
        !ingredient ||
        ingredient.active_status === false ||
        Number(ingredient.quantity || 0) + STOCK_EPSILON < Number(entry.quantity || 0)
      );
    })
    .map((entry) => ({
      name: entry.ingredient?.name || 'Unknown ingredient',
      required: Number(entry.quantity || 0),
      available: Number(entry.ingredient?.quantity || 0),
      unit: entry.ingredient?.unit || '',
    }));

  return {
    ...item,
    hasRecipe,
    hiddenFromCustomerMenu: !hasRecipe,
    soldOut: item.available === false || !hasRecipe || missingIngredients.length > 0,
    soldOutReason:
      item.available === false
        ? 'Menu unavailable'
        : !hasRecipe
          ? 'Recipe ingredients are not assigned'
        : missingIngredients.length > 0
          ? 'Ingredient stock is not enough'
          : '',
    missingIngredients,
  };
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

async function sendIngredientSnapshot(socket) {
  const [ingredients, menus] = await Promise.all([
    Ingredient.find().sort({ ingredient_index: 1, name: 1 }),
    Menu.find({}).populate('ingredients.ingredient').sort({ name: 1 }),
  ]);

  socket.send(
    JSON.stringify({
      type: 'ingredient:snapshot',
      ingredients: await withExpiredQuantities(ingredients),
      menus: menus.map(withStockStatus),
    }),
  );
}

export function initIngredientSocket(server) {
  ingredientSocketServer = new WebSocketServer({ server, path: '/ws/ingredients' });

  ingredientSocketServer.on('connection', (socket) => {
    sendIngredientSnapshot(socket).catch((err) => {
      socket.send(JSON.stringify({ type: 'error', message: err.message }));
    });
  });
}

let lastMenuStatusMap = new Map();

export async function broadcastIngredientSnapshot() {
  if (!ingredientSocketServer) return;

  const openSockets = [...ingredientSocketServer.clients].filter(
    (socket) => socket.readyState === WebSocket.OPEN,
  );
  
  const [ingredients, menus] = await Promise.all([
    Ingredient.find().sort({ ingredient_index: 1, name: 1 }),
    Menu.find({}).populate('ingredients.ingredient').sort({ name: 1 }),
  ]);

  const processedMenus = menus.map(withStockStatus);
  const processedIngredients = await withExpiredQuantities(ingredients);
  const payload = JSON.stringify({
    type: 'ingredient:snapshot',
    ingredients: processedIngredients,
    menus: processedMenus,
  });

  // Check if any soldOut status changed since last broadcast
  let statusChanged = false;
  const currentStatusMap = new Map();

  processedMenus.forEach(menu => {
    const status = menu.soldOut;
    currentStatusMap.set(String(menu._id), status);
    if (lastMenuStatusMap.get(String(menu._id)) !== status) {
      statusChanged = true;
    }
  });

  // Also check if items were removed or added
  if (currentStatusMap.size !== lastMenuStatusMap.size) {
    statusChanged = true;
  }

  if (statusChanged) {
    lastMenuStatusMap = currentStatusMap;
    broadcastSSE({
      type: 'menu:update',
      menus: processedMenus.filter((menu) => menu.hasRecipe),
    });
  }

  openSockets.forEach((socket) => {
    socket.send(payload);
  });
}
