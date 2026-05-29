import { Router } from "express";
import { OrderItem } from "./OrderItem.js";

export const router = Router();

// CRUD controller functions
export const getOrderItems = async (req, res, next) => {
  try {
    const orderItems = await OrderItem.find();
    res.status(200).json({
      success: true,
      data: orderItems,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getOrderItemById = async (req, res, next) => {
  try {
    const orderItem = await OrderItem.findById(req.params.id);
    if (!orderItem) {
      return res.status(404).json({ success: false, error: "ไม่พบรายการสั่งซื้อดังกล่าว (Order item not found)" });
    }
    res.status(200).json({
      success: true,
      data: orderItem,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const createOrderItem = async (req, res, next) => {
  try {
    const { order_id, menu_id, quantity, price_at_purchase } = req.body;

    const newOrderItem = new OrderItem({
      order_id,
      menu_id,
      quantity,
      price_at_purchase,
    });

    const savedOrderItem = await newOrderItem.save();
    res.status(201).json({
      success: true,
      message: "สร้างรายการสั่งซื้อสำเร็จ (Success create order item)",
      data: savedOrderItem,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "ไม่สามารถสร้างรายการสั่งซื้อได้ (Can't create order item)",
      error: err.message,
    });
  }
};

export const updateOrderItem = async (req, res, next) => {
  try {
    const doc = await OrderItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: "ไม่พบรายการสั่งซื้อดังกล่าว (Order item not found)" });
    }
    return res.status(200).json({ success: true, message: "อัปเดตรายการสั่งซื้อสำเร็จ", data: doc });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "ไม่สามารถอัปเดตรายการสั่งซื้อได้ (Can't update order item)",
      error: err.message,
    });
  }
};

export const deleteOrderItem = async (req, res, next) => {
  try {
    const doc = await OrderItem.findByIdAndDelete(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "ไม่พบรายการสั่งซื้อที่ต้องการลบ (Order item not found)" });
    }

    return res.status(200).json({ success: true, message: "ลบรายการสั่งซื้อสำเร็จ (Success delete order item)", data: doc });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Map routes to router for backward compatibility or direct routing
router.get("/", getOrderItems);
router.get("/:id", getOrderItemById);
router.post("/", createOrderItem);
router.put("/:id", updateOrderItem);
router.delete("/:id", deleteOrderItem);