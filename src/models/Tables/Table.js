import mongoose from "mongoose";
import { act } from "react";

const tableSchema = new mongoose.Schema({
  table_Id: {type: String, required: true, unique: true},
  status: {type: String ,enum: ['FREE', 'OCCUPIED', 'BILL', 'RESERVED']},default: 'FREE',required: true
  // date_and_time: {type: String},
  // active_status: {type: String},
  // staff_id: {type: String},
  // customerOrder_id: {type: String},
  // order_Id: {type: String},
});

export const Table = mongoose.model("Table", tableSchema);
