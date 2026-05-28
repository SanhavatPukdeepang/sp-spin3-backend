import { Router } from 'express';
import { Menu } from '../modules/menus/Menu.js';

export const router = Router();

// Get all menus
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category, available: true } : { available: true };
    const menus = await Menu.find(filter).sort({ category: 1, name: 1 });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single menu
router.get('/:id', async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new menu item
router.post('/', async (req, res) => {
  const { name, description, price, image, category, cookingTime } = req.body;
  
  if (!name || !price || !category || cookingTime === undefined) {
    return res.status(400).json({ 
      message: 'Missing required fields: name, price, category, cookingTime' 
    });
  }

  const menu = new Menu({
    name,
    description,
    price,
    image,
    category,
    cookingTime
  });

  try {
    const newMenu = await menu.save();
    res.status(201).json(newMenu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update menu item
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, price, image, category, cookingTime, available } = req.body;
    
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    if (name !== undefined) menu.name = name;
    if (description !== undefined) menu.description = description;
    if (price !== undefined) menu.price = price;
    if (image !== undefined) menu.image = image;
    if (category !== undefined) menu.category = category;
    if (cookingTime !== undefined) menu.cookingTime = cookingTime;
    if (available !== undefined) menu.available = available;
    
    menu.updatedAt = new Date();
    const updatedMenu = await menu.save();
    res.json(updatedMenu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });
    
    await Menu.deleteOne({ _id: req.params.id });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
