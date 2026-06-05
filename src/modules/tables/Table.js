import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    table_Id: { type: String, required: true, unique: true },
    number: { type: Number },
    area: { type: String, default: "Main Floor" },
    seats: { type: Number, default: 4 },
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    onlineReservable: { type: Boolean, default: true },
    seatedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["FREE", "OCCUPIED", "BILL", "RESERVED"],
      default: "FREE",
      required: true,
    },
    // date_and_time: {type: String},
    // active_status: {type: String},
    // staff_id: {type: String},
    // customerOrder_id: {type: String},
    // order_Id: {type: String},
    current_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    active_status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tableSchema.index({ status: 1 });
tableSchema.index({ active_status: 1, status: 1 });

export const Table = mongoose.model("Table", tableSchema);
