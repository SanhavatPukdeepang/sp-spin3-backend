import { Router } from 'express';
import { processPayment } from '../modules/payments/paymentController.js';
import { isAuth, isEligible } from '../middleware/auth.js';

export const router = Router();

router.post('/:orderId/process', isAuth, isEligible('customer', 'cashier', 'owner'), processPayment);
