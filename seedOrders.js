// import mongoose from 'mongoose';
// import { Order } from './src/modules/orders/Order.js';
// import dotenv from 'dotenv';

// dotenv.config();

// const orders = [
//   {
//     type: "Onsite",
//     customer: {
//       name: "Table 05",
//       note: "ขอซอสมะเขือเทศเพิ่ม",
//     },
//     orderList: [
//       {
//         name: "fire_chicken",
//         quantity: 5,
//         price: 159,
//         status: "Cook",
//         orderTime: new Date(),
//       },
//     ],
//     status: "preparing"
//   },
//   {
//     type: "delivery",
//     customer: {
//       name: "สมชาย รักดี",
//       contact: "081-234-5678",
//       address: "123/45 หมู่บ้านแสนสุข",
//       note: "ฝากไว้ที่ป้อมยาม",
//     },
//     orderList: [
//       {
//         name: "burger",
//         quantity: 1,
//         price: 89,
//         status: "finished",
//         orderTime: new Date(),
//       },
//     ],
//     status: "completed"
//   },
//   {
//     type: "Onsite",
//     customer: {
//       name: "Table 12",
//     },
//     orderList: [
//       {
//         name: "french_fries",
//         quantity: 2,
//         price: 55,
//         status: "InKitchen",
//         orderTime: new Date(),
//       },
//     ],
//     status: "pending"
//   }
// ];

// async function seed() {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI, { dbName: "serious-spin3" });
//     console.log("Connected to MongoDB for seeding");
    
//     await Order.deleteMany({});
//     console.log("Cleared existing orders");
    
//     await Order.insertMany(orders);
//     console.log("Inserted seed orders");
    
//     mongoose.disconnect();
//   } catch (err) {
//     console.error(err);
//   }
// }

// seed();
