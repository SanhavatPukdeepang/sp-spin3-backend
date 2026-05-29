import { Router } from 'express';
import { isAuth } from '../middleware/auth.js';
import { register, login, getMe, updateMe, changePassword } from '../modules/users/userController.js';

export const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', isAuth, getMe);
router.patch('/me', isAuth, updateMe);
router.patch('/change-password', isAuth, changePassword);
