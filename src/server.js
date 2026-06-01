import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './configs/mongodb.js'
import { router as apiRoutes } from './routes/index.js'
import { router as ownerCompatRoutes } from './routes/ownerCompat.js'
import { initIngredientSocket } from './realtime/ingredientSocket.js'

dotenv.config();

const app = express()
const PORT = process.env.PORT || 5000
const server = createServer(app)

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://spc-owner.vercel.app',
  'https://spc-customer.vercel.app',
  'https://sp-spin3-frontend.vercel.app',
]

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())
app.use('/api/api', ownerCompatRoutes)
app.use('/api', apiRoutes)

await connectDB()
initIngredientSocket(server)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

server.on('error', (err) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message)
  process.exit(1)
})
