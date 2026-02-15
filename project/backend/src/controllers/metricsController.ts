import { Request, Response } from "express";
import prisma from "../config/database";
import { Prisma } from "@prisma/client";

interface DateRange {
  start: Date;
  end: Date;
}

// Helpers to normalize specific channel names across endpoints
const stripAccents = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizeChannelName = (name: string) => {
  const n = stripAccents(name).toLowerCase().trim();
  if (n === "app proprio" || n.includes("app proprio")) return "aiqfome";
  return name;
};

const MAX_TOP_PRODUCTS = 100;
const MAX_EXPORT_ROWS = 5000;
const MAX_CUSTOMERS_AT_RISK = 500;


function parseOptionalId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "";
  const visible = local.length <= 2 ? local[0] : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "").replace(/"/g, '""');
  if (/^[=+\-@]/.test(str)) return `"'${str}"`;
  return `"${str}"`;
}

export const parseDateRange = (
  startDate?: string,
  endDate?: string
): DateRange => {
  const parsedEnd = endDate ? new Date(endDate) : new Date();
  const end = Number.isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;

  const parsedStart = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start = Number.isNaN(parsedStart.getTime())
    ? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    : parsedStart;

  return start <= end ? { start, end } : { start: end, end: start };
};

export const getOverview = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, channelId, storeId } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const baseWhere: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) baseWhere.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) baseWhere.storeId = parsedStoreId;

    const completedWhere: Prisma.SaleWhereInput = {
      ...baseWhere,
      saleStatusDesc: "COMPLETED",
    };
    const cancelledWhere: Prisma.SaleWhereInput = {
      ...baseWhere,
      saleStatusDesc: "CANCELLED",
    };

    const currentSales = await prisma.sale.aggregate({
      where: completedWhere,
      _sum: {
        totalAmount: true,
        totalDiscount: true,
        totalAmountItems: true,
        deliveryFee: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        totalAmount: true,
        productionSeconds: true,
        deliverySeconds: true,
      },
    });

    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodDuration);
    const previousEnd = new Date(dateRange.start);

    const previousSales = await prisma.sale.aggregate({
      where: {
        ...completedWhere,
        createdAt: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const [totalOrdersAll, cancelledOrders] = await Promise.all([
      prisma.sale.count({ where: baseWhere }),
      prisma.sale.count({ where: cancelledWhere }),
    ]);

    const totalRevenue = Number(currentSales._sum.totalAmount || 0);
    const grossRevenue = Number(currentSales._sum.totalAmountItems || 0);
    const totalOrders = currentSales._count.id;
    const averageTicket = Number(currentSales._avg.totalAmount || 0);
    const totalDiscount = Number(currentSales._sum.totalDiscount || 0);
    const discountRate =
      grossRevenue > 0 ? totalDiscount / grossRevenue : 0;
    const averageProductionTime = Math.round(
      currentSales._avg.productionSeconds || 0
    );
    const averageDeliveryTime = Math.round(
      currentSales._avg.deliverySeconds || 0
    );
    const cancellationRate =
      totalOrdersAll > 0 ? cancelledOrders / totalOrdersAll : 0;

    const previousRevenue = Number(previousSales._sum.totalAmount || 0);
    const previousOrders = previousSales._count.id;

    const revenueGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
    const ordersGrowth =
      previousOrders > 0
        ? ((totalOrders - previousOrders) / previousOrders) * 100
        : 0;

    res.json({
      currentPeriod: {
        startDate: dateRange.start,
        endDate: dateRange.end,
      },
      metrics: {
        totalRevenue,
        grossRevenue,
        totalOrders,
        totalOrdersAll,
        ordersCancelled: cancelledOrders,
        averageTicket,
        totalDiscount,
        discountRate,
        cancellationRate,
        averageProductionTime, // in seconds
        averageDeliveryTime, // in seconds
      },
      growth: {
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        ordersGrowth: Math.round(ordersGrowth * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Overview error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, channelId, storeId, limit = "10" } = req.query;
    const rawLimit = Number(limit);
    if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
      return res.status(400).json({ error: "invalid limit" });
    }
    if (rawLimit > MAX_TOP_PRODUCTS) {
      return res.status(400).json({ error: "limit exceeds max" });
    }
    const limitNum = rawLimit;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      saleStatusDesc: "COMPLETED",
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) whereClause.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) whereClause.storeId = parsedStoreId;

    const topProducts = await prisma.productSale.groupBy({
      by: ["productId"],
      where: {
        sale: whereClause,
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: "desc",
        },
      },
      take: limitNum,
    });

    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            category: true,
          },
        });

        return {
          productId: item.productId,
          productName: product?.name || "Unknown",
          categoryName: product?.category?.name || "Unknown",
          totalQuantity: item._sum.quantity || 0,
          totalRevenue: Number(item._sum.totalPrice || 0),
        };
      })
    );

    res.json(productsWithDetails);
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSalesByChannel = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      saleStatusDesc: "COMPLETED",
    };

    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) whereClause.storeId = parsedStoreId;

    const salesByChannel = await prisma.sale.groupBy({
      by: ["channelId"],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        totalAmount: true,
      },
    });

    const channelsWithDetails = await Promise.all(
      salesByChannel.map(async (item) => {
        const channel = await prisma.channel.findUnique({
          where: { id: item.channelId },
        });

        return {
          channelId: item.channelId,
          channelName: normalizeChannelName(channel?.name || "Unknown"),
          channelType: channel?.type || "Unknown",
          totalRevenue: Number(item._sum.totalAmount || 0),
          totalOrders: item._count.id,
          averageTicket: Number(item._avg.totalAmount || 0),
        };
      })
    );

    res.json(channelsWithDetails);
  } catch (error) {
    console.error("Sales by channel error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSalesByStore = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, channelId } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      saleStatusDesc: "COMPLETED",
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) whereClause.channelId = parsedChannelId;

    const salesByStore = await prisma.sale.groupBy({
      by: ["storeId"],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        totalAmount: true,
      },
    });

    const storesWithDetails = await Promise.all(
      salesByStore.map(async (item) => {
        const store = await prisma.store.findUnique({
          where: { id: item.storeId },
        });

        return {
          storeId: item.storeId,
          storeName: store?.name || "Unknown",
          city: store?.city || "Unknown",
          totalRevenue: Number(item._sum.totalAmount || 0),
          totalOrders: item._count.id,
          averageTicket: Number(item._avg.totalAmount || 0),
        };
      })
    );

    res.json(storesWithDetails);
  } catch (error) {
    console.error("Sales by store error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getHourlyHeatmap = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, channelId, storeId } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      saleStatusDesc: "COMPLETED",
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) whereClause.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) whereClause.storeId = parsedStoreId;

    const sales = await prisma.sale.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // Group by hour and day of week
    const heatmap: {
      [key: string]: { [key: number]: { orders: number; revenue: number } };
    } = {};
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    sales.forEach((sale) => {
      const hour = sale.createdAt.getHours();
      const dayOfWeek = daysOfWeek[sale.createdAt.getDay()];

      if (!heatmap[dayOfWeek]) {
        heatmap[dayOfWeek] = {};
      }

      if (!heatmap[dayOfWeek][hour]) {
        heatmap[dayOfWeek][hour] = { orders: 0, revenue: 0 };
      }

      heatmap[dayOfWeek][hour].orders += 1;
      heatmap[dayOfWeek][hour].revenue += Number(sale.totalAmount);
    });

    const heatmapArray = Object.entries(heatmap).map(([day, hours]) => ({
      day,
      hours: Object.entries(hours).map(([hour, data]) => ({
        hour: parseInt(hour),
        orders: data.orders,
        revenue: Math.round(data.revenue * 100) / 100,
      })),
    }));

    res.json(heatmapArray);
  } catch (error) {
    console.error("Heatmap error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTimeSeries = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      channelId,
      storeId,
      groupBy = "day",
    } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) whereClause.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) whereClause.storeId = parsedStoreId;

    const sales = await prisma.sale.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        totalAmount: true,
        totalAmountItems: true,
        totalDiscount: true,
        saleStatusDesc: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const timeSeries: {
      [key: string]: {
        orders: number;
        ordersTotal: number;
        ordersCancelled: number;
        revenue: number;
        grossRevenue: number;
        totalDiscount: number;
      };
    } = {};

    sales.forEach((sale) => {
      let key: string;
      const date = sale.createdAt;

      if (groupBy === "hour") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")} ${String(
          date.getHours()
        ).padStart(2, "0")}:00`;
      } else if (groupBy === "day") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")}`;
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${String(
          weekStart.getMonth() + 1
        ).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
      } else {
        // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      }

      if (!timeSeries[key]) {
        timeSeries[key] = {
          orders: 0,
          ordersTotal: 0,
          ordersCancelled: 0,
          revenue: 0,
          grossRevenue: 0,
          totalDiscount: 0,
        };
      }

      const status = sale.saleStatusDesc || "COMPLETED";
      const isCancelled = status === "CANCELLED";
      const isCompleted = status === "COMPLETED" || !sale.saleStatusDesc;

      timeSeries[key].ordersTotal += 1;
      if (isCancelled) {
        timeSeries[key].ordersCancelled += 1;
      }
      if (isCompleted) {
        timeSeries[key].orders += 1;
        timeSeries[key].revenue += Number(sale.totalAmount || 0);
        timeSeries[key].grossRevenue += Number(sale.totalAmountItems || 0);
        timeSeries[key].totalDiscount += Number(sale.totalDiscount || 0);
      }
    });

    const timeSeriesArray = Object.entries(timeSeries)
      .map(([date, data]) => {
        const avgTicket = data.orders > 0 ? data.revenue / data.orders : 0;
        const discountRate =
          data.grossRevenue > 0 ? data.totalDiscount / data.grossRevenue : 0;
        const cancellationRate =
          data.ordersCancelled / Math.max(data.ordersTotal, 1);
        return {
          date,
          orders: data.orders,
          ordersTotal: data.ordersTotal,
          ordersCancelled: data.ordersCancelled,
          revenue: Math.round(data.revenue * 100) / 100,
          grossRevenue: Math.round(data.grossRevenue * 100) / 100,
          avgTicket: Math.round(avgTicket * 100) / 100,
          discountRate: Math.round(discountRate * 10000) / 10000,
          cancellationRate: Math.round(cancellationRate * 10000) / 10000,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(timeSeriesArray);
  } catch (error) {
    console.error("Time series error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, channelId, storeId } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: Prisma.SaleWhereInput = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      saleStatusDesc: "COMPLETED",
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) whereClause.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) whereClause.storeId = parsedStoreId;

    const productSales = await prisma.productSale.findMany({
      where: {
        sale: whereClause,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoriesMap: {
      [key: number]: { name: string; quantity: number; revenue: number };
    } = {};

    productSales.forEach((ps) => {
      const categoryId = ps.product.categoryId || 0;
      const categoryName = ps.product.category?.name || "Uncategorized";

      if (!categoriesMap[categoryId]) {
        categoriesMap[categoryId] = {
          name: categoryName,
          quantity: 0,
          revenue: 0,
        };
      }

      categoriesMap[categoryId].quantity += ps.quantity;
      categoriesMap[categoryId].revenue += ps.totalPrice;
    });

    const categoriesArray = Object.values(categoriesMap)
      .map((cat) => ({
        ...cat,
        revenue: Math.round(cat.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(categoriesArray);
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFilters = async (req: Request, res: Response) => {
  try {
    const q = (req.query || {}) as { state?: string; city?: string };
    const { state, city } = q;
    const storeWhere: any = { isActive: true };
    if (state && typeof state === 'string') {
      storeWhere.state = state.trim().toUpperCase();
    }
    if (city && typeof city === 'string') {
      storeWhere.city = city.trim();
    }

    const [channels, stores, categories] = await Promise.all([
      prisma.channel.findMany({
        select: {
          id: true,
          name: true,
          type: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.store.findMany({
        where: storeWhere,
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.category.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    // Normalize channel names in filters
    const normChannels = channels.map((c) => ({ ...c, name: normalizeChannelName(c.name) }));

    res.json({
      channels: normChannels,
      stores,
      categories,
    });
  } catch (error) {
    console.error("Filters error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCustomersAtRisk = async (req: Request, res: Response) => {
  try {
    const minPurchases = clamp(parsePositiveInt(req.query.minPurchases, 3), 1, 50);
    const daysSince = clamp(parsePositiveInt(req.query.daysSince, 30), 1, 365);

    const rawLimit = Number(req.query.limit ?? 50);
    if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
      return res.status(400).json({ error: "invalid limit" });
    }
    if (rawLimit > MAX_CUSTOMERS_AT_RISK) {
      return res.status(400).json({ error: "limit exceeds max" });
    }
    const limit = rawLimit;

    const rows: any[] = await prisma.$queryRaw`
      SELECT c.id, COALESCE(c.customer_name, 'Desconhecido') AS name,
             COALESCE(c.email,'') AS email,
             COUNT(s.id) AS orders,
             MAX(s.created_at) AS last_order,
             SUM(s.total_amount) AS total_spent
      FROM customers c
      JOIN sales s ON s.customer_id = c.id
      WHERE s.sale_status_desc = 'COMPLETED'
      GROUP BY c.id, c.customer_name, c.email
      HAVING COUNT(s.id) >= ${minPurchases}
        AND MAX(s.created_at) < (NOW() - (${String(daysSince)} || ' days')::interval)
      ORDER BY last_order ASC, total_spent DESC
      LIMIT ${limit}
    `;
    return res.json(rows.map(r => ({
      customerId: r.id,
      name: r.name,
      email: maskEmail(String(r.email || "")),
      orders: Number(r.orders || 0),
      lastOrder: r.last_order,
      totalSpent: Number(r.total_spent || 0),
    })));
  } catch (error) {
    console.error('customers-at-risk error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportToCSV = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      channelId,
      storeId,
      limit = "1000",
    } = req.query;
    const rawLimit = Number(limit);
    if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
      return res.status(400).json({ error: "invalid limit" });
    }
    if (rawLimit > MAX_EXPORT_ROWS) {
      return res.status(400).json({ error: "limit exceeds max" });
    }
    const limitNum = rawLimit;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const whereClause: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      saleStatusDesc: "COMPLETED",
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) whereClause.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) whereClause.storeId = parsedStoreId;

    const sales = await prisma.sale.findMany({
      where: whereClause,
      take: limitNum,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        channel: true,
        store: true,
        customer: true,
        productSales: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    const csvRows: string[] = [];
    csvRows.push(
      [
        "Sale ID",
        "Date",
        "Time",
        "Channel",
        "Store",
        "Customer",
        "Product",
        "Category",
        "Quantity",
        "Unit Price",
        "Total Price",
        "Discount",
        "Delivery Fee",
        "Total Amount",
        "Production Time (min)",
        "Delivery Time (min)",
        "Status",
      ].join(",")
    );

    sales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      const dateStr = saleDate.toISOString().split("T")[0];
      const timeStr = saleDate.toTimeString().split(" ")[0];
      const prodTime = sale.productionSeconds
        ? Math.round(sale.productionSeconds / 60)
        : 0;
      const deliveryTime = sale.deliverySeconds
        ? Math.round(sale.deliverySeconds / 60)
        : 0;

      sale.productSales.forEach((ps) => {
        const row = [
          sale.id,
          dateStr,
          timeStr,
          escapeCsvCell(normalizeChannelName(sale.channel?.name || "Unknown")),
          escapeCsvCell(sale.store?.name || "Unknown"),
          escapeCsvCell(sale.customerName || "Unknown"),
          escapeCsvCell(ps.product?.name || "Unknown"),
          escapeCsvCell(ps.product?.category?.name || "Unknown"),
          ps.quantity,
          ps.basePrice.toString(),
          ps.totalPrice.toString(),
          sale.totalDiscount?.toString() || "0",
          sale.deliveryFee?.toString() || "0",
          sale.totalAmount.toString(),
          prodTime,
          deliveryTime,
          sale.saleStatusDesc || "COMPLETED",
        ].join(",");
        csvRows.push(row);
      });
    });

    const csvContent = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-export-${Date.now()}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDataQualitySummary = async (req: Request, res: Response) => {
  try {
    const days = clamp(parsePositiveInt(req.query?.days, 7), 1, 90);
    const rows: any[] = await prisma.$queryRaw`
      WITH recent_sales AS (
        SELECT *
        FROM sales s
        WHERE s.created_at::date BETWEEN (CURRENT_DATE - (${String(days)} || ' days')::interval)::date AND CURRENT_DATE
      )
      SELECT
        (SELECT COUNT(*) FROM recent_sales) AS total_sales_audited,
        (SELECT COUNT(*) FROM product_sales ps JOIN recent_sales rs ON rs.id = ps.sale_id) AS total_items_audited,
        (SELECT COUNT(DISTINCT rs.customer_id) FROM recent_sales rs WHERE rs.customer_id IS NOT NULL) AS total_customers_audited,
        (SELECT COUNT(*) FROM recent_sales WHERE store_id IS NULL) AS sales_missing_store,
        (SELECT COUNT(*) FROM recent_sales WHERE channel_id IS NULL) AS sales_missing_channel,
        (SELECT COUNT(*) FROM recent_sales WHERE created_at IS NULL) AS sales_missing_created_at,
        (SELECT COUNT(*) FROM recent_sales WHERE total_amount < 0) AS negative_total_amount,
        (SELECT COUNT(*) FROM product_sales ps JOIN recent_sales rs ON rs.id = ps.sale_id WHERE ps.quantity <= 0) AS non_positive_item_qty,
        (SELECT COUNT(*) FROM product_sales ps LEFT JOIN sales s ON s.id = ps.sale_id WHERE s.id IS NULL) AS orphan_product_sales,
        (SELECT COUNT(*) FROM customers c JOIN recent_sales rs ON rs.customer_id = c.id WHERE c.email IS NULL OR c.email = '') AS customers_missing_email,
        (SELECT COUNT(*) FROM customers c JOIN recent_sales rs ON rs.customer_id = c.id WHERE c.email IS NOT NULL AND c.email <> '' AND POSITION('@' IN c.email) = 0) AS customers_invalid_email
    `;

    const summary = rows?.[0] || {};
    res.json({
      totalSalesAudited: Number(summary.total_sales_audited || 0),
      totalItemsAudited: Number(summary.total_items_audited || 0),
      totalCustomersAudited: Number(summary.total_customers_audited || 0),
      salesMissingStore: Number(summary.sales_missing_store || 0),
      salesMissingChannel: Number(summary.sales_missing_channel || 0),
      salesMissingCreatedAt: Number(summary.sales_missing_created_at || 0),
      negativeTotalAmount: Number(summary.negative_total_amount || 0),
      nonPositiveItemQty: Number(summary.non_positive_item_qty || 0),
      orphanProductSales: Number(summary.orphan_product_sales || 0),
      customersMissingEmail: Number(summary.customers_missing_email || 0),
      customersInvalidEmail: Number(summary.customers_invalid_email || 0),
    });
  } catch (error) {
    console.error("Data quality summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDataQualityTrend = async (req: Request, res: Response) => {
  try {
    const days = clamp(parsePositiveInt(req.query?.days, 7), 1, 90);
    const rows: any[] = await prisma.$queryRaw`
      WITH days AS (
        SELECT d::date AS date
        FROM generate_series(
          (CURRENT_DATE - (${String(days)} || ' days')::interval),
          CURRENT_DATE,
          interval '1 day'
        ) d
      )
      SELECT
        days.date,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s.store_id IS NULL) AS sales_missing_store,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s.channel_id IS NULL) AS sales_missing_channel,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s.created_at IS NULL) AS sales_missing_created_at,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s.total_amount < 0) AS negative_total_amount,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND ps.quantity <= 0) AS non_positive_item_qty,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND ps.sale_id IS NULL) AS orphan_product_sales,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND (c.email IS NULL OR c.email = '')) AS customers_missing_email,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL AND c.email IS NOT NULL AND c.email <> '' AND POSITION('@' IN c.email) = 0) AS customers_invalid_email
      FROM days
      LEFT JOIN sales s ON s.created_at::date = days.date
      LEFT JOIN product_sales ps ON ps.sale_id = s.id
      LEFT JOIN customers c ON c.id = s.customer_id
      GROUP BY days.date
      ORDER BY days.date;
    `;
    res.json(
      (rows || []).map((r) => ({
        date: r.date,
        salesMissingStore: Number(r.sales_missing_store || 0),
        salesMissingChannel: Number(r.sales_missing_channel || 0),
        salesMissingCreatedAt: Number(r.sales_missing_created_at || 0),
        negativeTotalAmount: Number(r.negative_total_amount || 0),
        nonPositiveItemQty: Number(r.non_positive_item_qty || 0),
        orphanProductSales: Number(r.orphan_product_sales || 0),
        customersMissingEmail: Number(r.customers_missing_email || 0),
        customersInvalidEmail: Number(r.customers_invalid_email || 0),
      }))
    );
  } catch (error) {
    console.error("Data quality trend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const __private = {
  maskEmail,
  escapeCsvCell,
};
