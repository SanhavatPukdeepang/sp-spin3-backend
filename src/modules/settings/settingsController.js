import { Settings } from './Settings.js'

export const getBookingConfig = async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: 'reservationThresholds' })
    if (!doc) {
      return res.json({ oneTwoMin: 600, threeSixMin: 1200, sevenTenMin: 2500 })
    }
    return res.json(doc.value)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateBookingConfig = async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate(
      { key: 'reservationThresholds' },
      { value: req.body },
      { upsert: true, new: true }
    )
    return res.json(updated.value)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
