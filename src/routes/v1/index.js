import { Router } from "express";
export const router=Router();

//1. HTTP GET: สำหรับดึงข้อมูลเมนูทั้งหมด
router.get('/menus', async (req, res) => {
  try {
    // ดึงข้อมูลเมนูทั้งหมดจากฐานข้อมูล
    // หากต้องการดึงเฉพาะเมนูที่ยัง Active อยู่ สามารถใช้ Menu.find({ active_status: true }) ได้
    const menus = await Menu.find(); 
    
    res.status(200).json({
      success: true,
      count: menus.length,
      data: menus
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเมนู', 
      error: error.message 
    });
  }
});

// 2. HTTP POST: สำหรับสร้างเมนูใหม่
// Endpoint: POST /menus
router.post('/menus', createMenu);