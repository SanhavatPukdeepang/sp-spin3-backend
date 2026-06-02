import jwt from 'jsonwebtoken'

export const isAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export const isEligible = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    console.log(`[Auth] Access denied for user: ${req.user?.id}, role: ${req.user?.role}. Expected: ${roles}`);
    return res.status(403).json({ message: 'Access denied' })
  }
  next()
}
