import { connectDB } from '../src/configs/mongodb.js';
import { Order } from '../src/modules/orders/Order.js';

const deliveryOrders = [
  {
    type: 'delivery',
    customer: {
      email: 'delivery-ready@example.com',
      name: 'Delivery Ready Customer',
      contact: '081-234-5678',
      address: '34 G Tower, Rama 9 Road, Bangkok',
      note: 'Leave at reception',
    },
    orderList: [
      {
        name: 'Crispy Chicken Combo',
        quantity: 1,
        price: 159,
        status: 'finished',
      },
    ],
    status: 'delivery',
  },
  {
    type: 'delivery',
    customer: {
      email: 'delivery-kitchen@example.com',
      name: 'Delivery Kitchen Customer',
      contact: '082-345-6789',
      address: 'Asok Montri Road, Bangkok',
      note: 'Call before arrival',
    },
    orderList: [
      {
        name: 'Spicy Chicken Burger',
        quantity: 2,
        price: 99,
        status: 'Cook',
      },
    ],
    status: 'preparing',
  },
];

const seedOrders = async () => {
  try {
    await connectDB();

    for (const order of deliveryOrders) {
      await Order.findOneAndUpdate(
        { 'customer.email': order.customer.email },
        { $setOnInsert: order },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );
      console.log(`Delivery order ready: ${order.customer.email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding orders:', err);
    process.exit(1);
  }
};

seedOrders();
