import express from "express";
import { Router } from "express";
import { router as apiRoutes } from "./routes/index.js";
import {connectDB} from "./configs/mongodb.js";
const app=express();

const port = 3000;


const app = express();






















app.use("/api",apiRoutes);

await connectDB();
app.listen(PORT);