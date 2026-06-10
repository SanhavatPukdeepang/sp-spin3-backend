import { Router } from 'express';
import { getOrders,getOrderById, createOrder,updateOrderItemStatus,updateOrderStatus, uploadOrderReceipt} from '../modules/orders/orderController.js';
import { isAuth, isEligible } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { sseHandler } from '../utils/sse.js';

export const router = Router();

router.get('/stream', sseHandler);
router.get('/', isAuth, getOrders);
router.get('/:id', isAuth, getOrderById);
router.post('/', isAuth, isEligible('customer', 'cashier', 'owner'), createOrder);
router.patch('/:id/receipt', isAuth, upload.single('receipt', 'receipt'), uploadOrderReceipt);
router.patch('/:orderId/item/:itemId', isAuth, isEligible('owner', 'cook', 'cashier'), updateOrderItemStatus);
router.patch('/:id', isAuth, updateOrderStatus);
