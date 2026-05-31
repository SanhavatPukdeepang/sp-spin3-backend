import { Router } from 'express';
import { getOrders,getOrderById, createOrder,updateOrderItemStatus,updateOrderStatus} from '../modules/orders/orderController.js';
import { isAuth, isEligible } from '../middleware/auth.js';

export const router = Router();

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:orderId/item/:itemId', isAuth, isEligible('owner', 'cook', 'cashier'), updateOrderItemStatus);
router.patch('/:id', updateOrderStatus);
