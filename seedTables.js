import mongoose from "mongoose";
import { connectDB } from "./src/configs/mongodb.js";
import { Table } from "./src/modules/tables/Table.js";

const defaultTables = [
  { table_Id: "T-01", number: 1, area: "INDOOR", seats: 2, x: 12, y: 25, onlineReservable: true },
  { table_Id: "T-02", number: 2, area: "INDOOR", seats: 2, x: 12, y: 45, onlineReservable: true },
  { table_Id: "T-03", number: 3, area: "INDOOR", seats: 2, x: 12, y: 65, onlineReservable: true },
  { table_Id: "T-04", number: 4, area: "INDOOR", seats: 2, x: 25, y: 25, onlineReservable: true },
  { table_Id: "T-05", number: 5, area: "INDOOR", seats: 2, x: 25, y: 45, onlineReservable: false },
  { table_Id: "T-06", number: 6, area: "INDOOR", seats: 2, x: 25, y: 65, onlineReservable: false },
  { table_Id: "T-07", number: 7, area: "INDOOR", seats: 6, x: 12, y: 85, onlineReservable: false },
  { table_Id: "T-08", number: 8, area: "INDOOR", seats: 6, x: 25, y: 85, onlineReservable: true },
  { table_Id: "T-09", number: 9, area: "INDOOR", seats: 6, x: 38, y: 25, onlineReservable: true },
  { table_Id: "T-10", number: 10, area: "INDOOR", seats: 6, x: 38, y: 45, onlineReservable: true },
  { table_Id: "T-11", number: 11, area: "INDOOR", seats: 6, x: 38, y: 65, onlineReservable: false },
  { table_Id: "T-12", number: 12, area: "INDOOR", seats: 6, x: 38, y: 85, onlineReservable: false },
  { table_Id: "T-13", number: 13, area: "OUTDOOR", seats: 10, x: 68, y: 30, onlineReservable: true },
  { table_Id: "T-14", number: 14, area: "OUTDOOR", seats: 10, x: 78, y: 30, onlineReservable: true },
  { table_Id: "T-15", number: 15, area: "OUTDOOR", seats: 10, x: 88, y: 30, onlineReservable: true },
  { table_Id: "T-16", number: 16, area: "OUTDOOR", seats: 10, x: 68, y: 60, onlineReservable: true },
  { table_Id: "T-17", number: 17, area: "OUTDOOR", seats: 10, x: 78, y: 60, onlineReservable: false },
  { table_Id: "T-18", number: 18, area: "OUTDOOR", seats: 10, x: 88, y: 60, onlineReservable: false },
  { table_Id: "T-19", number: 19, area: "OUTDOOR", seats: 10, x: 68, y: 85, onlineReservable: true },
  { table_Id: "T-20", number: 20, area: "OUTDOOR", seats: 10, x: 82, y: 85, onlineReservable: true },
];

await connectDB();

for (const table of defaultTables) {
  await Table.updateOne(
    { table_Id: table.table_Id },
    {
      $set: {
        ...table,
        active_status: true,
      },
      $setOnInsert: {
        status: "FREE",
        seatedAt: null,
      },
    },
    { upsert: true },
  );
}

console.log(`Seeded ${defaultTables.length} tables`);
await mongoose.disconnect();
