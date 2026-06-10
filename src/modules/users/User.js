import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema({
  addressName: { type: String, trim: true },
  tag: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
  },
  firstname: { type: String, trim: true },
  lastname: { type: String, trim: true },
  username: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true })

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['owner', 'cashier', 'cook', 'rider', 'waitress', 'customer'],
    required: true,
    default: 'customer'
  },
  phone: { type: String, trim: true },
  addresses: [addressSchema],
  active_status: { type: Boolean, default: true },
  on_duty: { type: Boolean, default: false }
}, { timestamps: true })

export const User = mongoose.model('User', userSchema)
