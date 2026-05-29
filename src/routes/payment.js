import { Router } from 'express';
import { processPayment } from '../modules/payments/paymentController.js';

export const router = Router();

router.post('/:orderId/process', processPayment);
