import { Router } from 'express';
import { router as authRouter } from './auth.js';
import { router as orderRouter } from './order.js';
import { router as paymentRouter } from './payment.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/orders', orderRouter);
router.use('/payments', paymentRouter);
