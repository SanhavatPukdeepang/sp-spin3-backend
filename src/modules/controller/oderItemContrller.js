import { Router } from "express";
import { OrderItem } from "../models/OrderItem.js";

export const router = Router();

router.get("/", async (req, res) => {
    try {
        const orderItems = await OrderItem.find();
        res.json(orderItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post("/",async(req,res)=>{
    // try {
        
    // } catch () {
        
    // }
}) 