import { Router } from "express";
import { router as usersRoute } from "./userRoute.js";
import { router as menuRouter } from "./menuRoute.js";


export const router = Router();

router.use("v1/user", usersRoute);
router.use("v1/menu", menuRouter);
