import mongoose from 'mongoose'

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
  active_status: { type: Boolean, default: true }
}, { timestamps: true })

export const User = mongoose.model('User', userSchema)
