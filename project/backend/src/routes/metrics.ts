import express from "express";
import {
  getOverview,
  getTopProducts,
  getSalesByChannel,
  getSalesByStore,
  getHourlyHeatmap,
  getTimeSeries,
  getCategories,
  getFilters,
  exportToCSV,
  getCustomersAtRisk,
  getDataQualitySummary,
  getDataQualityTrend,
} from "../controllers/metricsController";
import { getInsights } from "../controllers/insightsController";
import { authMiddleware } from "../middleware/auth";
import { cacheMiddleware } from "../middleware/cache";

const router = express.Router();

// Public: filters can be fetched before login (cached for 1 hour)
router.get("/filters", cacheMiddleware(60 * 60 * 1000), getFilters);

// Protected routes require auth from here on
router.use(authMiddleware);

// Apply cache middleware to improve performance (5 min cache)
router.get("/overview", cacheMiddleware(), getOverview);
router.get("/top-products", cacheMiddleware(), getTopProducts);
router.get("/sales-by-channel", cacheMiddleware(), getSalesByChannel);
router.get("/sales-by-store", cacheMiddleware(), getSalesByStore);
router.get("/heatmap", cacheMiddleware(), getHourlyHeatmap);
router.get("/time-series", cacheMiddleware(), getTimeSeries);
router.get("/categories", cacheMiddleware(), getCategories);
router.get("/export-csv", exportToCSV); // No cache for exports
router.get("/insights", cacheMiddleware(), getInsights);
router.get("/customers-at-risk", cacheMiddleware(), getCustomersAtRisk);
router.get("/data-quality", cacheMiddleware(), getDataQualitySummary);
router.get("/data-quality-trend", cacheMiddleware(), getDataQualityTrend);

export default router;
