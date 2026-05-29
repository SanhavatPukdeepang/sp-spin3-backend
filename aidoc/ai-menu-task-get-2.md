You are a senior developer. I need you to complete 4 tasks in my 
backend project. Edit the actual files on disk one by one.

The goal is to support these 4 features for the owner app:
1. Create and delete menu items
2. Photo, title, price, description on each item  
3. Active / inactive toggle
4. Activity log — who did what and when

========================================================================
TASK 1 — Fix the real Menu model
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/src/modules/Menus/Menu.js

Replace the ENTIRE file content with this:

import mongoose from 'mongoose'

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide menu name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Please provide price'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: ['chicken', 'burger', 'combo', 'drink', 'side', 'dessert'],
    },
    cookingTime: {
      type: Number,
      default: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export const Menu = mongoose.model('Menu', menuSchema)

========================================================================
TASK 2 — Fix the menu route import path + add auth + rewrite routes
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/src/routes/menu.js

Replace the ENTIRE file content with this:

import { Router } from 'express'
import { Menu } from '../modules/Menus/Menu.js'
import { MenuLog } from '../modules/Menus/MenuLog.js'
import { isAuth, isEligible } from '../middleware/auth.js'

export const router = Router()

// GET all menus
// ?all=true returns all items (owner app)
// default returns only available:true items (customer app)
router.get('/', async (req, res) => {
  try {
    const { category, all } = req.query
    let filter = {}
    if (all !== 'true') {
      filter.available = true
    }
    if (category) {
      filter.category = category
    }
    const menus = await Menu.find(filter).sort({ category: 1, name: 1 })
    res.json(menus)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single menu item
router.get('/:id', async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id)
    if (!menu) return res.status(404).json({ message: 'Menu item not found' })
    res.json(menu)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET menu activity log
router.get('/logs/all', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const logs = await MenuLog.find().sort({ timestamp: -1 }).limit(100)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create new menu item (owner only)
router.post('/', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const { name, description, price, image, category, cookingTime } = req.body
    if (!name || price === undefined || !category) {
      return res.status(400).json({
        message: 'Missing required fields: name, price, category',
      })
    }
    const menu = new Menu({ name, description, price, image, category, cookingTime })
    const newMenu = await menu.save()

    await MenuLog.create({
      action: 'created',
      menuId: newMenu._id,
      menuName: newMenu.name,
      performedBy: req.user.name || req.user.email,
      performedByRole: req.user.role,
    })

    res.status(201).json(newMenu)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH update menu item (owner only)
router.patch('/:id', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const { name, description, price, image, category, cookingTime, available } = req.body
    const menu = await Menu.findById(req.params.id)
    if (!menu) return res.status(404).json({ message: 'Menu item not found' })

    if (name !== undefined) menu.name = name
    if (description !== undefined) menu.description = description
    if (price !== undefined) menu.price = price
    if (image !== undefined) menu.image = image
    if (category !== undefined) menu.category = category
    if (cookingTime !== undefined) menu.cookingTime = cookingTime

    if (available !== undefined) {
      const changed = menu.available !== available
      menu.available = available
      if (changed) {
        await MenuLog.create({
          action: available ? 'activated' : 'deactivated',
          menuId: menu._id,
          menuName: menu.name,
          performedBy: req.user.name || req.user.email,
          performedByRole: req.user.role,
        })
      }
    }

    const updatedMenu = await menu.save()
    res.json(updatedMenu)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE menu item (owner only)
router.delete('/:id', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id)
    if (!menu) return res.status(404).json({ message: 'Menu item not found' })

    await MenuLog.create({
      action: 'deleted',
      menuId: menu._id,
      menuName: menu.name,
      performedBy: req.user.name || req.user.email,
      performedByRole: req.user.role,
    })

    await Menu.deleteOne({ _id: req.params.id })
    res.json({ message: 'Menu item deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

========================================================================
TASK 3 — Create MenuLog model
========================================================================

Create this NEW file:
/Users/aj/jsd12/sp-spin3-backend/src/modules/Menus/MenuLog.js

File content:

import mongoose from 'mongoose'

const menuLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['created', 'deleted', 'activated', 'deactivated'],
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
    },
    menuName: {
      type: String,
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    performedByRole: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }
)

export const MenuLog = mongoose.model('MenuLog', menuLogSchema)

========================================================================
TASK 4 — Update seedMenus.js to use new field names
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/seedMenus.js

The Menu model now uses these field names:
  name, description, price, image, category, cookingTime, available

Find the import line at the top:
  import { Menu } from './src/models/Menu.js';

Replace with:
  import { Menu } from './src/modules/Menus/Menu.js';

Also make sure every item in menuItems uses image: '' not 
image_url or any other field name. Do not change any other part 
of the seed file.

========================================================================

After ALL 4 tasks are done:

1. Show me the final content of every file you created or changed
2. Run this command and show me the output:
   cd /Users/aj/jsd12/sp-spin3-backend && npm run dev
3. Then run the seed script:
   cd /Users/aj/jsd12/sp-spin3-backend && node seedMenus.js
4. Confirm server starts and 25 items seeded successfully
5. List any errors and explain what caused them