I need you to create a realistic mock data seed script for a Thai fried chicken 
restaurant (like KFC). 

Create the file at:
/Users/aj/jsd12/sp-spin3-backend/test-and-adjustdb/seedMockData.js

The script must:
1. Read .env using dotenv for MONGODB_URI
2. Connect to MongoDB
3. WARN the user before clearing, then clear ONLY these collections:
   orders, deliveries, wastes
   Print: "⚠️  Clearing orders, deliveries, wastes..."
   DO NOT touch: menus, ingredients, tables, users, settings, counters
4. Read existing data from DB before generating:
   - const menus = await Menu.find({}) — use these real menu _ids
   - const users = await User.find({ role: { $ne: 'customer' } })
   - const riders = users.filter(u => u.role === 'rider')
   - const tables = await Table.find({})
   - const ingredients = await Ingredient.find({})
5. Generate 60 days of data from April 10, 2026 to June 9, 2026
6. Insert all generated data at the end using insertMany

---

DAILY ORDER COUNT:
Monday-Thursday: random 50-70
Friday-Sunday: random 75-100

TIME DISTRIBUTION per day (use these probabilities to pick hour):
10:00-11:00  5%
11:00-13:00  30%  (lunch peak)
13:00-17:00  15%
17:00-20:00  35%  (dinner peak — biggest)
20:00-22:00  15%

ORDER TYPE SPLIT:
60% Onsite (type: 'Onsite')
40% Delivery (type: 'delivery')

ITEMS PER ORDER:
35% chance: 1-2 items
40% chance: 3-4 items
25% chance: 5-7 items

MENU WEIGHT when picking items (use category field):
chicken   40%
combo     25%
drink     20%
side      10%
burger     3%
dessert    2%

Build a weighted picker function:
function pickMenuItems(menus, count) {
  const weights = { chicken:40, combo:25, drink:20, side:10, burger:3, dessert:2 }
  // Weight each menu item by its category weight
  // Pick `count` items using weighted random selection
  // Return array of { menu_id, name, price, quantity (1-3), price_at_purchase }
}

PAYMENT METHODS:
45% promptpay
35% cash
20% card

THAI CUSTOMER NAMES (use this pool, pick randomly):
First names: สมชาย, สมหญิง, วิชัย, นภา, ธนพล, อรุณ, กมล, ปิยะ, มานะ, สุดา,
             ชัยวัฒน์, นิภา, ประเสริฐ, วันดี, อภิชาต, จิราพร, ธีรศักดิ์, สุภาพร,
             ณัฐพล, พรทิพย์
Last names:  ใจดี, มีสุข, รักชาติ, สุขสม, พงษ์ศักดิ์, ทองดี, แก้วมณี, บุญมา,
             ศรีสุข, วงษ์ทอง

BANGKOK DELIVERY ADDRESSES (use this pool):
'123/4 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
'456 ถ.ลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',
'789/1 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
'321 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
'654/2 ถ.งามวงศ์วาน แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพฯ 10210',
'987 ถ.บางนา-ตราด แขวงบางนา เขตบางนา กรุงเทพฯ 10260',
'147/3 ถ.เพชรบุรี แขวงมักกะสัน เขตราษฎร์บูรณะ กรุงเทพฯ 10120',
'258 ถ.นวมินทร์ แขวงนวมินทร์ เขตบึงกุ่ม กรุงเทพฯ 10240'

THAI PHONE NUMBERS:
Generate random: '08' + random digit (5-9) + '-' + 3 random digits + '-' + 4 random digits
Example: 085-234-5678

ORDER ID FORMAT:
'SPC-' + YYYYMMDD + '-' + 3 digit sequence per day
Example: SPC-20260410-001, SPC-20260410-002

ORDER STATUS RULES:
Days 1-58 (April 10 - June 7):
  Onsite orders:  status 'finished'
  Delivery orders: status 'delivered'

Day 59 (June 8):
  70% finished/delivered
  30% completed (just paid, not yet finished)

Day 60 (June 9 — today):
  40% pending
  35% preparing
  25% completed

PAYMENT OBJECT structure:
{
  method: 'promptpay' | 'cash' | 'card',
  amount: <order total>,
  paidAt: <order datetime> (null for today's pending orders)
}

For today's pending orders: payment.paidAt = null

---

ORDER DOCUMENT STRUCTURE:
{
  orderId: 'SPC-20260410-001',
  type: 'Onsite' or 'delivery',
  user_id: pick random non-owner user._id as string,
  customer: {
    name: <random Thai name>,
    phone: <random Thai phone>,
    address: <random Bangkok address> (only for delivery)
  },
  orderList: [
    {
      menu_id: <real menu _id>,
      name: <menu name>,
      price_at_purchase: <menu price>,
      quantity: <1-3>,
      status: 'finished' | 'preparing' | 'pending' (match order status)
    }
  ],
  tableId: <random table._id> (only for Onsite),
  status: <based on date rules above>,
  payment: { method, amount, paidAt },
  createdAt: <datetime based on day + time distribution>,
  updatedAt: <same as createdAt>
}

---

DELIVERY DOCUMENT STRUCTURE:
Create one delivery document for every delivery-type order:
{
  order: <order._id>,
  customer: {
    name: <same as order.customer.name>,
    phone: <same as order.customer.phone>,
    address: <same as order.customer.address>
  },
  rider_id: <random rider._id if riders exist, else null>,
  status: 'delivered' (for old orders) | 'waiting' (for today's pending),
  proof_photo_url: '',
  note: '',
  createdAt: <same as order createdAt>
}

---

WASTE DOCUMENTS:
Generate 2-3 waste entries per week over the 60 days.
Pick random days, random ingredients from the ingredients array.

Each waste document:
{
  ingredient: <random ingredient._id>,
  quantity_wasted: random 1-5,
  reason: pick randomly from:
    ['หมดอายุ', 'ตกหล่น', 'ปรุงไหม้', 'ตรวจคุณภาพไม่ผ่าน', 'เก็บรักษาไม่ถูกต้อง'],
  total_cost: quantity_wasted * ingredient.price_per_unit,
  createdAt: <random datetime on that day>
}

---

SCRIPT STRUCTURE:
1. Import mongoose, dotenv, and all needed models from src/modules/
2. Connect to DB
3. Print warning and clear orders, deliveries, wastes
4. Fetch menus, users, riders, tables, ingredients
5. Validate: if any of these are empty, print warning and exit gracefully
6. Generate all orders array (loop 60 days)
7. Generate deliveries array (from delivery orders)
8. Generate waste array (2-3 per week)
9. Insert everything using insertMany with ordered: false
10. Print summary:
    "✅ Orders inserted: X"
    "✅ Deliveries inserted: X"
    "✅ Waste entries inserted: X"
    "Total days: 60"
    "Date range: April 10, 2026 → June 9, 2026"
11. Close connection

Add this to package.json scripts:
"seed:mockdata": "node test-and-adjustdb/seedMockData.js"

Use ES module syntax (import/export) to match the rest of the project.
Use async/await throughout.
No external libraries beyond mongoose and dotenv which are already installed.

After writing the file, show me:
1. The first 50 lines of the file
2. The generateOrders loop structure
3. The insertMany section at the end
so I can verify the structure before running it. 