import mongoose from 'mongoose'

const menuLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['created', 'deleted', 'activated', 'deactivated'],
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
    },
    menuName: {
      type: String,
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    performedByRole: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }
)

export const MenuLog = mongoose.model('MenuLog', menuLogSchema)
