You are a senior developer. I need you to fix 4 files in my backend 
project. Edit the actual files on disk one by one.

========================================================================
TASK 1 — Fix category enum in Menu model
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/src/models/Menu.js

Find this line:
  enum: ['fried-chicken', 'side', 'drink', 'dessert', 'combo']

Replace with:
  enum: ['chicken', 'burger', 'combo', 'drink', 'side', 'dessert']

========================================================================
TASK 2 — Replace seed data with real menu items
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/seedMenus.js

Replace the entire menuItems array with this:

const menuItems = [
  // CHICKEN
  { name: 'Signature 8pc Bucket', description: 'Classic Original Recipe chicken.', price: 299, image: '', category: 'chicken', cookingTime: 600 },
  { name: 'Party Pack 20pc', description: 'Extra spicy bucket.', price: 555, image: '', category: 'chicken', cookingTime: 600 },
  { name: 'Zabb Team Box', description: 'Wingz Zabb + nuggets combo.', price: 149, image: '', category: 'chicken', cookingTime: 600 },
  { name: 'Smile Bucket', description: 'Limited time smile bucket.', price: 199, image: '', category: 'chicken', cookingTime: 600 },
  { name: 'Chick N Share', description: 'Perfect for sharing.', price: 99, image: '', category: 'chicken', cookingTime: 600 },

  // BURGER
  { name: 'Spicy Chicken Sandwich', description: 'Crispy, spicy, and juicy.', price: 89, image: '', category: 'burger', cookingTime: 480 },
  { name: 'Classic Sandwich', description: 'Original crispy chicken.', price: 69, image: '', category: 'burger', cookingTime: 480 },
  { name: 'Zinger Double', description: 'Double patty, double flavor.', price: 199, image: '', category: 'burger', cookingTime: 480 },
  { name: 'Chickskate', description: 'New street style sandwich.', price: 199, image: '', category: 'burger', cookingTime: 480 },

  // SIDE
  { name: 'Golden Fries L', description: 'Golden crispy fries.', price: 49, image: '', category: 'side', cookingTime: 180 },
  { name: 'Coleslaw', description: 'Creamy classic slaw.', price: 39, image: '', category: 'side', cookingTime: 180 },
  { name: 'Mac and Cheese', description: 'Creamy cheesey goodness.', price: 49, image: '', category: 'side', cookingTime: 180 },
  { name: 'Tteokbokki', description: 'Spicy Korean rice cakes.', price: 89, image: '', category: 'side', cookingTime: 180 },
  { name: 'Seafood Pajeon', description: 'Korean savory pancake.', price: 99, image: '', category: 'side', cookingTime: 180 },
  { name: 'Japchae', description: 'Stir-fried glass noodles.', price: 79, image: '', category: 'side', cookingTime: 180 },
  { name: 'Hot Oden', description: 'Light and savory broth.', price: 59, image: '', category: 'side', cookingTime: 180 },

  // DESSERT
  { name: 'Chocolate Cupcake', description: 'Rich chocolate treat.', price: 45, image: '', category: 'dessert', cookingTime: 0 },
  { name: 'Soft Serve', description: 'Vanilla swirl.', price: 39, image: '', category: 'dessert', cookingTime: 0 },

  // DRINK
  { name: 'Coca-Cola', description: 'Ice cold refreshment.', price: 39, image: '', category: 'drink', cookingTime: 0 },
  { name: 'Chocolate Float', description: 'Choco blend with vanilla top.', price: 65, image: '', category: 'drink', cookingTime: 0 },
  { name: 'Soju Original', description: 'Classic Korean spirit.', price: 150, image: '', category: 'drink', cookingTime: 0 },
  { name: 'Makgeolli', description: 'Korean rice wine.', price: 180, image: '', category: 'drink', cookingTime: 0 },

  // COMBO
  { name: 'Party Bucket Set', description: 'Combo deal -10%', price: 383, image: '', category: 'combo', cookingTime: 600 },
  { name: 'Spicy Sandwich Set', description: 'Combo deal -10%', price: 115, image: '', category: 'combo', cookingTime: 600 },
  { name: 'Chickskate Set', description: 'Try me -5%', price: 189, image: '', category: 'combo', cookingTime: 600 },
]

Keep everything else in the file exactly the same.
Only replace the menuItems array.

========================================================================
TASK 3 — Fix route URL /menu to /menus
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/src/routes/index.js

Find this line:
  router.use('/menu', menuRouter)

Replace with:
  router.use('/menus', menuRouter)

========================================================================
TASK 4 — Fix GET /menus to support all=true for owner app
========================================================================

File: /Users/aj/jsd12/sp-spin3-backend/src/routes/menu.js

Find the GET / route. It currently looks like this:
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

Replace the entire GET / route with this:
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

========================================================================

After ALL 4 tasks are done:

1. Show me the final content of every file you changed
2. Confirm each task was written to disk successfully
3. Run this command and show me the output:
   cd /Users/aj/jsd12/sp-spin3-backend && npm run dev
4. Then run the seed script and show me the output:
   cd /Users/aj/jsd12/sp-spin3-backend && node seedMenus.js
5. Confirm you see MongoDB connected, server on port 3000,
   and all 25 menu items seeded successfully