import { Router } from 'express';
import { OrderItem } from '../modules/orderItems/OrderItem.js';
import { createOrderItem, deleteOrderItem, getOrderItemById, getOrderItems, updateOrderItem } from '../modules/orderItems/orderItemController.js';


export const router = Router();


router.get("/", getOrderItems);
router.get("/:id", getOrderItemById);
router.post("/", createOrderItem);
router.put("/:id", updateOrderItem);
router.delete("/:id", deleteOrderItem);