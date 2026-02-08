import express from "express";
import {
  createDashboard,
  getDashboards,
  getDashboard,
  updateDashboard,
  deleteDashboard,
  getSharedDashboard,
} from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Limit public shared dashboard access to reduce brute-force risk
const sharedLimiter = rateLimit({ windowMs: 60_000, max: 60 });
router.get("/shared/:shareToken", sharedLimiter, getSharedDashboard);

router.use(authMiddleware);

router.post("/", createDashboard);
router.get("/", getDashboards);
router.get("/:id", getDashboard);
router.put("/:id", updateDashboard);
router.delete("/:id", deleteDashboard);

export default router;
