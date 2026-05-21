import express from 'express'
import authRouter from './auth.js'

export const router = express.Router()

router.use('/auth', authRouter)
