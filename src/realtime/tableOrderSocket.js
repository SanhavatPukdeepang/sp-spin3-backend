import { WebSocket, WebSocketServer } from 'ws';
import { Table } from '../modules/tables/Table.js';
import { Order } from '../modules/orders/Order.js';

let tableOrderSocketServer;

const toOwnerStatus = (status) => {
  const map = {
    FREE: 'Available',
    OCCUPIED: 'Eating',
    BILL: 'Payment',
    RESERVED: 'Reserved',
  };
  return map[status] || 'Available';
};

const getTableNumber = (table) => {
  if (table.number) return table.number;
  const match = String(table.table_Id || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const toOwnerTable = (table) => ({
  id: String(table._id),
  table_Id: table.table_Id,
  number: getTableNumber(table),
  area: table.area || 'Main Floor',
  seats: table.seats || 4,
  x: table.x ?? 50,
  y: table.y ?? 50,
  onlineReservable: table.onlineReservable !== false,
  status: toOwnerStatus(table.status),
  seatedAt: table.seatedAt,
  active: table.active_status,
});

async function sendSnapshot(socket) {
  const [tables, orders] = await Promise.all([
    Table.find({ active_status: { $ne: false } }).sort({ number: 1, table_Id: 1 }),
    Order.find({}).sort({ createdAt: -1 }).limit(100), // Limit orders for snapshot
  ]);

  socket.send(
    JSON.stringify({
      type: 'snapshot',
      tables: tables.map(toOwnerTable),
      orders,
    }),
  );
}

export function initTableOrderSocket(server) {
  tableOrderSocketServer = new WebSocketServer({ server, path: '/ws/tables-orders' });

  tableOrderSocketServer.on('connection', (socket) => {
    sendSnapshot(socket).catch((err) => {
      socket.send(JSON.stringify({ type: 'error', message: err.message }));
    });
  });
}

export async function broadcastTableOrderUpdate() {
  if (!tableOrderSocketServer) return;

  const openSockets = [...tableOrderSocketServer.clients].filter(
    (socket) => socket.readyState === WebSocket.OPEN,
  );

  if (openSockets.length === 0) return;

  const [tables, orders] = await Promise.all([
    Table.find({ active_status: { $ne: false } }).sort({ number: 1, table_Id: 1 }),
    Order.find({}).sort({ createdAt: -1 }).limit(100),
  ]);

  const payload = JSON.stringify({
    type: 'update',
    tables: tables.map(toOwnerTable),
    orders,
  });

  openSockets.forEach((socket) => {
    socket.send(payload);
  });
}
