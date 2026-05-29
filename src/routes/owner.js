import { Router } from 'express';
import { isAuth, isEligible } from '../middleware/auth.js';

export const router = Router();

router.get('/staff', isAuth, isEligible('owner'), async (req, res) => {
  try {
    // Placeholder - implement staff listing
    res.json({ staff: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/staff', isAuth, isEligible('owner'), async (req, res) => {
  try {
    // Placeholder - implement staff invite
    res.status(201).json({ message: 'Staff invited' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/staff/:id', isAuth, isEligible('owner'), async (req, res) => {
  try {
    // Placeholder - implement staff update
    res.json({ message: 'Staff updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
