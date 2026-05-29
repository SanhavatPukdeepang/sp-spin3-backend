import { Router } from "express";
import { Promotion } from "./Promotion.js";

export const router = Router();

// CRUD controller functions
export const getPromotions = async (req, res, next) => {
  try {
    const promotions = await Promotion.find();
    res.status(200).json({
      success: true,
      data: promotions,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getPromotionById = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ success: false, error: "ไม่พบโปรโมชันดังกล่าว (Promotion not found)" });
    }
    res.status(200).json({
      success: true,
      data: promotion,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const createPromotion = async (req, res, next) => {
  try {
    const { name, type, value, date_from, date_to, active_status } = req.body;

    const newPromotion = new Promotion({
      name,
      type,
      value,
      date_from,
      date_to,
      active_status,
    });

    const savedPromotion = await newPromotion.save();
    res.status(201).json({
      success: true,
      message: "สร้างโปรโมชันสำเร็จ (Success create promotion)",
      data: savedPromotion,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "ไม่สามารถสร้างโปรโมชันได้ (Can't create promotion)",
      error: err.message,
    });
  }
};

export const updatePromotion = async (req, res, next) => {
  try {
    const doc = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: "ไม่พบโปรโมชันดังกล่าว (Promotion not found)" });
    }
    return res.status(200).json({ success: true, message: "อัปเดตโปรโมชันสำเร็จ", data: doc });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "ไม่สามารถอัปเดตโปรโมชันได้ (Can't update promotion)",
      error: err.message,
    });
  }
};

export const deletePromotion = async (req, res, next) => {
  try {
    const doc = await Promotion.findByIdAndDelete(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "ไม่พบโปรโมชันที่ต้องการลบ (Promotion not found)" });
    }

    return res.status(200).json({ success: true, message: "ลบโปรโมชันสำเร็จ (Success delete promotion)", data: doc });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Map routes to router for backward compatibility or direct routing

