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
      default: 'https://placehold.co/600x400/e4002b/ffffff?text=Serious+Fried+Chicken',
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
    ingredients: [
      {
        ingredient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Ingredient',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, 'Ingredient quantity cannot be negative'],
          default: 1,
        },
      },
    ],
  },
  { timestamps: true }
)

export const Menu = mongoose.model('Menu', menuSchema)
