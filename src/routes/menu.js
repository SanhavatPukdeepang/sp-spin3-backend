import { Router } from 'express';
import {
  getMenus,
  getMenuById,
  getMenuLogs,
  createMenu,
  updateMenu,
  deleteMenu,
} from '../modules/Menus/menuController.js';
import { isAuth, isEligible } from '../middleware/auth.js';

export const router = Router();

router.get('/', getMenus);
router.get('/logs/all', isAuth, isEligible('owner'), getMenuLogs);
router.get('/:id', getMenuById);
router.post('/', isAuth, isEligible('owner'), createMenu);
router.patch('/:id', isAuth, isEligible('owner'), updateMenu);
router.delete('/:id', isAuth, isEligible('owner'), deleteMenu);
