import express from "express";
import { runExploreQuery } from "../controllers/exploreController";
import { authMiddleware } from "../middleware/auth";
import { cacheMiddleware } from "../middleware/cache";

const router = express.Router();

router.use(authMiddleware);

// Cache standard JSON responses for 5 minutes by default
router.post("/query", cacheMiddleware(), runExploreQuery);
router.get("/query", cacheMiddleware(), runExploreQuery);

export default router;

