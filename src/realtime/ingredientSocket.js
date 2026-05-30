import { WebSocket, WebSocketServer } from 'ws';
import { Ingredient } from '../modules/ingredients/Ingredient.js';
import { Menu } from '../modules/menus/Menu.js';
import { broadcastSSE } from '../utils/sse.js';


let ingredientSocketServer;

const withStockStatus = (menu) => {
  const item = menu.toObject ? menu.toObject() : menu;
  const linkedIngredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  const missingIngredients = linkedIngredients
    .filter((entry) => {
      const ingredient = entry.ingredient;
      return (
        !ingredient ||
        ingredient.active_status === false ||
        Number(ingredient.quantity || 0) < Number(entry.quantity || 0)
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
    soldOut: item.available === false || missingIngredients.length > 0,
    soldOutReason:
      item.available === false
        ? 'Menu unavailable'
        : missingIngredients.length > 0
          ? 'Ingredient stock is not enough'
          : '',
    missingIngredients,
  };
};

async function sendIngredientSnapshot(socket) {
  const [ingredients, menus] = await Promise.all([
    Ingredient.find().sort({ ingredient_index: 1, name: 1 }),
    Menu.find({}).populate('ingredients.ingredient').sort({ name: 1 }),
  ]);

  socket.send(
    JSON.stringify({
      type: 'ingredient:snapshot',
      ingredients,
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
  const payload = JSON.stringify({
    type: 'ingredient:snapshot',
    ingredients,
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
      menus: processedMenus,
    });
  }

  openSockets.forEach((socket) => {
    socket.send(payload);
  });
}
