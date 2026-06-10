import { Router } from 'express'
import { isAuth, isEligible } from '../middleware/auth.js'
import { getBookingConfig, updateBookingConfig } from '../modules/settings/settingsController.js'

export const router = Router()

router.get('/booking', getBookingConfig)
router.patch('/booking', isAuth, isEligible('owner'), updateBookingConfig)
