import { Router } from 'express';
import {
  getMenus,
  getMenuById,
  getMenuLogs,
  createMenu,
  updateMenu,
  updateMenuIngredients,
  deleteMenu,
} from '../modules/menus/menuController.js';
import { isAuth, isEligible } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { sseHandler } from '../utils/sse.js';

export const router = Router();

router.get('/stream', sseHandler);
router.get('/', getMenus);
router.get('/logs/all', isAuth, isEligible('owner'), getMenuLogs);
router.get('/:id', getMenuById);
router.post('/', isAuth, isEligible('owner'), upload.single('image'), createMenu);
router.patch('/:id/ingredients', isAuth, isEligible('owner', 'cook'), updateMenuIngredients);
router.patch('/:id', isAuth, isEligible('owner'), upload.single('image'), updateMenu);
router.delete('/:id', isAuth, isEligible('owner'), deleteMenu);
