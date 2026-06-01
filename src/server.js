import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './configs/mongodb.js'
import { router as apiRoutes } from './routes/index.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

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
app.use('/api', apiRoutes)

await connectDB()

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

server.on('error', (err) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message)
  process.exit(1)
})
