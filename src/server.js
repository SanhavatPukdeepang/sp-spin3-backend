import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './configs/mongodb.js'
import { router as apiRoutes } from './routes/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: ['https://sp-spin3-frontend.vercel.app', 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use('/api', apiRoutes)

await connectDB()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
