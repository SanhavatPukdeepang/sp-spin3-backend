import { Router } from 'express';
import { Table } from '../modules/tables/Table.js';

export const router = Router();

const toOwnerStatus = (status) => {
  const map = {
    FREE: 'Available',
    OCCUPIED: 'Eating',
    BILL: 'Payment',
    RESERVED: 'Cooking',
  };
  return map[status] || 'Available';
};

const toBackendStatus = (status) => {
  const map = {
    Available: 'FREE',
    Eating: 'OCCUPIED',
    Cooking: 'RESERVED',
    Payment: 'BILL',
  };
  return map[status] || status;
};

const getTableNumber = (table) => {
  if (table.number) return table.number;
  const match = String(table.table_Id || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const toOwnerTable = (table) => ({
  id: String(table._id),
  number: getTableNumber(table),
  area: table.area || 'Main Floor',
  seats: table.seats || 4,
  status: toOwnerStatus(table.status),
  seatedAt: table.seatedAt,
  active: table.active_status,
});

router.get('/', async (req, res) => {
  try {
    const tables = await Table.find({ active_status: { $ne: false } }).sort({ number: 1, table_Id: 1 });
    res.json(tables.map(toOwnerTable));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const number = Number(req.body.number);
    const table = await Table.create({
      table_Id: req.body.table_Id || `T${String(number || Date.now()).padStart(2, '0')}`,
      number,
      area: req.body.area || 'Main Floor',
      seats: Number(req.body.seats || 4),
      status: toBackendStatus(req.body.status || 'Available'),
      seatedAt: req.body.status && req.body.status !== 'Available' ? new Date() : null,
      active_status: true,
    });

    res.status(201).json(toOwnerTable(table));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.status !== undefined) {
      updates.status = toBackendStatus(req.body.status);
      updates.seatedAt = req.body.status === 'Available' ? null : new Date();
    }
    if (req.body.area !== undefined) updates.area = req.body.area;
    if (req.body.seats !== undefined) updates.seats = Number(req.body.seats);
    if (req.body.active !== undefined) updates.active_status = Boolean(req.body.active);

    const table = await Table.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(toOwnerTable(table));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
