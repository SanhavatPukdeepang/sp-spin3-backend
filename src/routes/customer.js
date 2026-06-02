import { Router } from 'express';
import {
  getCustomerIndex,
  getCustomerMenus,
} from '../modules/customer/customerController.js';

export const router = Router();

router.get('/index', getCustomerIndex);
router.get('/menus', getCustomerMenus);
