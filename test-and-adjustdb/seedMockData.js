import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../src/modules/orders/Order.js';
import { Delivery } from '../src/modules/delivery/Delivery.js';
import { Waste } from '../src/modules/wastes/Waste.js';
import { Menu } from '../src/modules/menus/Menu.js';
import { User } from '../src/modules/users/User.js';
import { Table } from '../src/modules/tables/Table.js';
import { Ingredient } from '../src/modules/ingredients/Ingredient.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

const firstNames = ['สมชาย', 'สมหญิง', 'วิชัย', 'นภา', 'ธนพล', 'อรุณ', 'กมล', 'ปิยะ', 'มานะ', 'สุดา', 'ชัยวัฒน์', 'นิภา', 'ประเสริฐ', 'วันดี', 'อภิชาต', 'จิราพร', 'ธีรศักดิ์', 'สุภาพร', 'ณัฐพล', 'พรทิพย์'];
const lastNames = ['ใจดี', 'มีสุข', 'รักชาติ', 'สุขสม', 'พงษ์ศักดิ์', 'ทองดี', 'แก้วมณี', 'บุญมา', 'ศรีสุข', 'วงษ์ทอง'];
const addresses = [
  '123/4 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  '456 ถ.ลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',
  '789/1 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
  '321 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
  '654/2 ถ.งามวงศ์วาน แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพฯ 10210',
  '987 ถ.บางนา-ตราด แขวงบางนา เขตบางนา กรุงเทพฯ 10260',
  '147/3 ถ.เพชรบุรี แขวงมักกะสัน เขตราษฎร์บูรณะ กรุงเทพฯ 10120',
  '258 ถ.นวมินทร์ แขวงนวมินทร์ เขตบึงกุ่ม กรุงเทพฯ 10240'
];

function getRandomPhone() {
  const d1 = Math.floor(Math.random() * 5) + 5; // 5-9
  const d2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const d3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `08${d1}-${d2}-${d3}`;
}

function getRandomThaiName() {
  const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
  const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${fn} ${ln}`;
}

function getRandomHour() {
  const r = Math.random() * 100;
  if (r < 5) return 10;
  if (r < 35) return Math.floor(Math.random() * 2) + 11; // 11-12
  if (r < 50) return Math.floor(Math.random() * 4) + 13; // 13-16
  if (r < 85) return Math.floor(Math.random() * 3) + 17; // 17-19
  return Math.floor(Math.random() * 2) + 20; // 20-21
}

function pickMenuItems(menus, count) {
  const weights = { chicken: 40, combo: 25, drink: 20, side: 10, burger: 3, dessert: 2 };
  const weightedMenu = [];
  menus.forEach(menu => {
    const weight = weights[menu.category] || 0;
    for (let i = 0; i < weight; i++) {
      weightedMenu.push(menu);
    }
  });

  if (weightedMenu.length === 0) return [];

  const selectedItems = [];
  for (let i = 0; i < count; i++) {
    const randomMenu = weightedMenu[Math.floor(Math.random() * weightedMenu.length)];
    const quantity = Math.floor(Math.random() * 3) + 1; // 1-3
    selectedItems.push({
      menu_id: randomMenu._id,
      name: randomMenu.name,
      price_at_purchase: randomMenu.price,
      quantity: quantity,
      status: 'pending' // Will be updated to match order status later
    });
  }
  return selectedItems;
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    console.warn('⚠️  Clearing orders, deliveries, wastes...');
    await Order.deleteMany({});
    await Delivery.deleteMany({});
    await Waste.deleteMany({});

    console.log('Fetching existing data from DB...');
    const menus = await Menu.find({});
    const users = await User.find({});
    const nonOwners = users.filter(u => u.role !== 'owner');
    const staffUsers = users.filter(u => u.role !== 'customer');
    const riders = users.filter(u => u.role === 'rider');
    const tables = await Table.find({});
    const ingredients = await Ingredient.find({});

    if (menus.length === 0 || users.length === 0 || tables.length === 0 || ingredients.length === 0) {
      console.error('❌ Essential data (menus, users, tables, ingredients) is missing. Please seed them first.');
      process.exit(1);
    }

    const allOrders = [];
    const allDeliveries = [];
    const allWastes = [];

    const startDate = new Date('2026-04-10T00:00:00Z');
    const endDate = new Date('2026-06-09T23:59:59Z');

    let currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      const dayOfWeek = currentDay.getDay(); // 0 (Sun) - 6 (Sat)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat, Sun
      const dailyOrderCount = isWeekend 
        ? Math.floor(Math.random() * 26) + 75  // 75-100
        : Math.floor(Math.random() * 21) + 50; // 50-70

      const dateStr = currentDay.toISOString().split('T')[0].replace(/-/g, '');
      
      for (let i = 1; i <= dailyOrderCount; i++) {
        const orderId = `SPC-${dateStr}-${i.toString().padStart(3, '0')}`;
        const hour = getRandomHour();
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const createdAt = new Date(currentDay);
        createdAt.setUTCHours(hour, minute, second);

        const orderType = Math.random() < 0.4 ? 'delivery' : 'Onsite';
        
        // ITEMS PER ORDER
        const itemRand = Math.random();
        let itemCount;
        if (itemRand < 0.35) itemCount = Math.floor(Math.random() * 2) + 1; // 1-2
        else if (itemRand < 0.75) itemCount = Math.floor(Math.random() * 2) + 3; // 3-4
        else itemCount = Math.floor(Math.random() * 3) + 5; // 5-7

        const orderList = pickMenuItems(menus, itemCount);
        const totalAmount = orderList.reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0);

        // Status Logic
        let status;
        const diffDays = Math.floor((endDate - createdAt) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 2) { // Days 1-58
          status = orderType === 'delivery' ? 'delivered' : 'finished';
        } else if (diffDays === 1) { // Day 59
          status = Math.random() < 0.7 
            ? (orderType === 'delivery' ? 'delivered' : 'finished')
            : 'completed';
        } else { // Day 60 (Today)
          const r = Math.random();
          if (r < 0.40) status = 'pending';
          else if (r < 0.75) status = 'preparing';
          else status = 'completed';
        }

        // Update item status to match order status (simple mapping)
        orderList.forEach(item => {
          if (status === 'delivered' || status === 'finished' || status === 'completed') {
            item.status = 'finished';
          } else {
            item.status = status;
          }
        });

        // Payment logic
        const payMethods = ['promptpay', 'cash', 'card'];
        const payRand = Math.random();
        let method;
        if (payRand < 0.45) method = 'promptpay';
        else if (payRand < 0.80) method = 'cash';
        else method = 'card';

        const payment = {
          method,
          amount: totalAmount,
          paidAt: status === 'pending' ? null : createdAt
        };

        const randomUser = nonOwners[Math.floor(Math.random() * nonOwners.length)];
        const customerName = getRandomThaiName();
        const customerPhone = getRandomPhone();
        const customerAddress = orderType === 'delivery' ? addresses[Math.floor(Math.random() * addresses.length)] : undefined;

        const orderDoc = {
          orderId,
          type: orderType,
          user_id: randomUser ? randomUser._id.toString() : 'mock-user-id',
          customer: {
            name: customerName,
            phone: customerPhone,
            address: customerAddress
          },
          orderList,
          tableId: orderType === 'Onsite' ? tables[Math.floor(Math.random() * tables.length)]._id : undefined,
          status,
          payment,
          createdAt,
          updatedAt: createdAt
        };

        allOrders.push(orderDoc);

        // Delivery document
        if (orderType === 'delivery') {
          const rider = riders.length > 0 ? riders[Math.floor(Math.random() * riders.length)] : null;
          allDeliveries.push({
            orderId: orderId, // Temporary to link later if needed, but instructions say order: <order._id>
            // Since we use insertMany, we don't have _ids yet. 
            // We'll have to either generate them ourselves or link after insert.
            // But usually we can just generate a new ObjectId.
            _order_id_temp: new mongoose.Types.ObjectId(), 
            customer: {
              name: customerName,
              phone: customerPhone,
              address: customerAddress
            },
            rider_id: rider ? rider._id : null,
            status: status === 'delivered' ? 'delivered' : 'waiting',
            proof_photo_url: '',
            note: '',
            createdAt: createdAt
          });
          // Assign the same _id to the orderDoc
          orderDoc._id = allDeliveries[allDeliveries.length - 1]._order_id_temp;
          allDeliveries[allDeliveries.length - 1].order = orderDoc._id;
          delete allDeliveries[allDeliveries.length - 1]._order_id_temp;
          delete allDeliveries[allDeliveries.length - 1].orderId;
        }
      }

      // Waste logic: 2-3 per week
      // We can do this roughly by having a ~35% chance each day to generate 1 waste entry
      if (Math.random() < 0.35) {
        const randomIngredient = ingredients[Math.floor(Math.random() * ingredients.length)];
        const qtyWasted = Math.floor(Math.random() * 5) + 1;
        const reasons = ['หมดอายุ', 'ตกหล่น', 'ปรุงไหม้', 'ตรวจคุณภาพไม่ผ่าน', 'เก็บรักษาไม่ถูกต้อง'];
        
        allWastes.push({
          ingredient: randomIngredient._id,
          quantity_wasted: qtyWasted,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          total_cost: qtyWasted * randomIngredient.price_per_unit,
          createdAt: new Date(currentDay.getTime() + Math.random() * 24 * 60 * 60 * 1000)
        });
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    console.log(`Generated ${allOrders.length} orders, ${allDeliveries.length} deliveries, ${allWastes.length} waste entries.`);

    await Order.insertMany(allOrders, { ordered: false });
    await Delivery.insertMany(allDeliveries, { ordered: false });
    await Waste.insertMany(allWastes, { ordered: false });

    console.log(`✅ Orders inserted: ${allOrders.length}`);
    console.log(`✅ Deliveries inserted: ${allDeliveries.length}`);
    console.log(`✅ Waste entries inserted: ${allWastes.length}`);
    console.log('Total days: 60');
    console.log('Date range: April 10, 2026 → June 9, 2026');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

seed();
