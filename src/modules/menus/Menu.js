import mongoose from 'mongoose'

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide menu name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Please provide price'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: ['chicken', 'burger', 'combo', 'drink', 'side', 'dessert'],
    },
    cookingTime: {
      type: Number,
      default: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export const Menu = mongoose.model('Menu', menuSchema)
