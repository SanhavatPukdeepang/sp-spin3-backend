import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { name, surname, username, email, password, role } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      name,
      surname,
      username,
      email,
      password: hashedPassword,
      role: role || 'customer'
    })

    await user.save()

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
