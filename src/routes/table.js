import { Router } from 'express';

export const router = Router();

router.get('/', async (req, res) => {
  try {
    // Placeholder - implement tables listing
    res.json({ tables: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
