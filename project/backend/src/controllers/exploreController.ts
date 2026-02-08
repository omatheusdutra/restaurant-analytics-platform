import { Request, Response } from "express";
import prisma from "../config/database";
import { Prisma } from "@prisma/client";

// Very small query-spec allowing one time dimension and up to one categorical dimension
// Measures are constrained to a safe whitelist.

const MEASURES: Record<string, string> = {
  revenue: "COALESCE(SUM(s.total_amount),0)::double precision",
  orders: "COUNT(s.id)::bigint",
  avg_ticket: "COALESCE(AVG(s.total_amount),0)::double precision",
  cancels: "SUM(CASE WHEN s.sale_status_desc = 'CANCELLED' THEN 1 ELSE 0 END)::bigint",
  avg_delivery_minutes: "COALESCE(AVG(s.delivery_seconds) / 60.0,0)::double precision",
  // Net revenue roughly: total - channel commission - product costs
  net_revenue:
    "(SUM(s.total_amount) - COALESCE(SUM(s.total_amount * COALESCE(c.commission_pct,0) / 100.0),0) - COALESCE(SUM(ps.quantity * COALESCE(p.cost_price,0)),0))::double precision",
};

const TIME_GRAINS: Record<string, string> = {
  hour: "DATE_TRUNC('hour', s.created_at)",
  day: "DATE_TRUNC('day', s.created_at)",
  week: "DATE_TRUNC('week', s.created_at)",
  month: "DATE_TRUNC('month', s.created_at)",
};

const DIMENSIONS: Record<string, string> = {
  channel: "c.name",
  store: "st.name",
  product: "p.name",
  category: "cat.name",
};

const MAX_TOP = 100;
const MAX_ID_LIST = 100;
const MAX_MEASURES = 6;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function pick<T>(obj: Record<string, T>, key?: string): T | undefined {
  if (!key) return undefined;
  return obj[key];
}

function normalizeBigInt(value: any): any {
  if (typeof value === "bigint") {
    const num = Number(value);
    return Number.isSafeInteger(num) ? num : value.toString();
  }

  if (value && typeof value === "object") {
    const maybeDecimal = value as any;
    if (Prisma.Decimal && maybeDecimal instanceof Prisma.Decimal) {
      const n = maybeDecimal.toNumber();
      return Number.isFinite(n) ? n : maybeDecimal.toString();
    }
    if (
      typeof maybeDecimal.toNumber === "function" &&
      typeof maybeDecimal.toString === "function" &&
      String(maybeDecimal.constructor?.name || "").toLowerCase().includes("decimal")
    ) {
      const n = maybeDecimal.toNumber();
      return Number.isFinite(n) ? n : maybeDecimal.toString();
    }
  }

  if (Array.isArray(value)) {
    return value.map((v) => normalizeBigInt(v));
  }
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeBigInt(v);
    return out;
  }
  return value;
}

export const runExploreQuery = async (req: Request, res: Response) => {
  try {
    const isCsv = String(req.query.format || "").toLowerCase() === "csv";
    const {
      measures = ["revenue"],
      time_grain = "day",
      dimension,
      startDate,
      endDate,
      storeIds,
      channelIds,
      categoryIds,
      top,
      page = DEFAULT_PAGE,
      pageSize = DEFAULT_PAGE_SIZE,
    } = (req.method === "GET" ? req.query : req.body) as any;

    const timeExpr = pick(TIME_GRAINS, String(time_grain));
    if (!timeExpr) return res.status(400).json({ error: "invalid time_grain" });

    const dims: string[] = [timeExpr + " AS ts"];
    const groupBy: string[] = [timeExpr];

    const catDimSql = pick(
      DIMENSIONS,
      dimension ? String(dimension) : undefined
    ) as string | undefined;

    if (dimension) {
      if (!catDimSql) return res.status(400).json({ error: "invalid dimension" });
      dims.push(catDimSql + " AS dim");
      groupBy.push(catDimSql);
    }

    const measureList = Array.isArray(measures) ? measures : [measures];
    const normalizedMeasures = measureList.map((m) => String(m));
    if (normalizedMeasures.length > MAX_MEASURES) {
      return res.status(400).json({ error: "too many measures" });
    }

    const measureExprs: string[] = [];
    const aliases: string[] = [];
    for (const m of normalizedMeasures) {
      const expr = pick(MEASURES, m);
      if (!expr) return res.status(400).json({ error: `invalid measure: ${m}` });
      measureExprs.push(expr + ` AS ${m}`);
      aliases.push(m);
    }

    const needsProduct =
      dimension === "product" ||
      dimension === "category" ||
      normalizedMeasures.includes("net_revenue");

    const joins = [
      "sales s",
      "JOIN channels c ON c.id = s.channel_id",
      "JOIN stores st ON st.id = s.store_id",
    ];
    if (needsProduct) {
      joins.push("LEFT JOIN product_sales ps ON ps.sale_id = s.id");
      joins.push("LEFT JOIN products p ON p.id = ps.product_id");
      joins.push("LEFT JOIN categories cat ON cat.id = p.category_id");
    }

    const includesCancels = normalizedMeasures.includes("cancels");
    const whereParts: Prisma.Sql[] = [];
    if (!includesCancels) {
      whereParts.push(Prisma.sql`s.sale_status_desc = 'COMPLETED'`);
    }

    if (startDate) {
      const parsedStart = new Date(String(startDate));
      if (Number.isNaN(parsedStart.getTime())) {
        return res.status(400).json({ error: "invalid startDate" });
      }
      whereParts.push(Prisma.sql`s.created_at >= ${parsedStart}`);
    }

    if (endDate) {
      const parsedEnd = new Date(String(endDate));
      if (Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ error: "invalid endDate" });
      }
      whereParts.push(Prisma.sql`s.created_at <= ${parsedEnd}`);
    }

    let listError: string | null = null;
    const addIdList = (field: string, arr: any) => {
      if (!arr) return;
      const list = Array.isArray(arr) ? arr : String(arr).split(",").filter(Boolean);
      if (list.length > MAX_ID_LIST) {
        listError = `too many ids for ${field}`;
        return;
      }
      if (list.length === 0) return;
      const ids = list.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x));
      if (ids.length === 0) return;
      whereParts.push(Prisma.sql`${Prisma.raw(field)} IN (${Prisma.join(ids)})`);
    };

    addIdList("s.store_id", storeIds);
    addIdList("s.channel_id", channelIds);
    if (needsProduct) addIdList("p.category_id", categoryIds);
    if (listError) return res.status(400).json({ error: listError });

    const select = [...dims, ...measureExprs].join(", ");

    let whereSql = Prisma.empty;
    if (whereParts.length > 0) {
      let whereConditions = Prisma.sql`${whereParts[0]}`;
      for (let i = 1; i < whereParts.length; i++) {
        whereConditions = Prisma.sql`${whereConditions} AND ${whereParts[i]}`;
      }
      whereSql = Prisma.sql`WHERE ${whereConditions}`;
    }

    let topNum: number | null = null;
    let limitSql = Prisma.empty;
    if (catDimSql && top !== undefined) {
      topNum = Number(top);
      if (!Number.isFinite(topNum) || topNum <= 0) {
        return res.status(400).json({ error: "invalid top" });
      }
      if (topNum > MAX_TOP) {
        return res.status(400).json({ error: "top exceeds max" });
      }
      limitSql = Prisma.sql`LIMIT ${topNum}`;
    }

    let pageNum = DEFAULT_PAGE;
    let pageSizeNum = DEFAULT_PAGE_SIZE;
    let offset = 0;
    if (!isCsv) {
      pageNum = Number(page);
      pageSizeNum = Number(pageSize);
      if (!Number.isInteger(pageNum) || pageNum <= 0) {
        return res.status(400).json({ error: "invalid page" });
      }
      if (!Number.isInteger(pageSizeNum) || pageSizeNum <= 0 || pageSizeNum > MAX_PAGE_SIZE) {
        return res.status(400).json({ error: "invalid pageSize" });
      }
      offset = (pageNum - 1) * pageSizeNum;
    }

    const countRows: Array<{ total: bigint | number }> = await prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM (
        SELECT 1
        FROM ${Prisma.raw(joins.join(" "))}
        ${whereSql}
        GROUP BY ${Prisma.raw(groupBy.join(", "))}
      ) grouped
    `);

    const rawTotal = Number(normalizeBigInt(countRows[0]?.total ?? 0));
    const total = topNum !== null ? Math.min(rawTotal, topNum) : rawTotal;

    let rows: any[] = [];
    if (topNum !== null && !isCsv) {
      rows = await prisma.$queryRaw(Prisma.sql`
        WITH ranked AS (
          SELECT ${Prisma.raw(select)}
          FROM ${Prisma.raw(joins.join(" "))}
          ${whereSql}
          GROUP BY ${Prisma.raw(groupBy.join(", "))}
          ORDER BY ${Prisma.raw("ts ASC")}
          ${limitSql}
        )
        SELECT *
        FROM ranked
        ORDER BY ${Prisma.raw("ts ASC")}
        LIMIT ${pageSizeNum}
        OFFSET ${offset}
      `);
    } else {
      const pageLimitSql = !isCsv ? Prisma.sql`LIMIT ${pageSizeNum} OFFSET ${offset}` : Prisma.empty;
      rows = await prisma.$queryRaw(Prisma.sql`
        SELECT ${Prisma.raw(select)}
        FROM ${Prisma.raw(joins.join(" "))}
        ${whereSql}
        GROUP BY ${Prisma.raw(groupBy.join(", "))}
        ORDER BY ${Prisma.raw("ts ASC")}
        ${limitSql}
        ${pageLimitSql}
      `);
    }

    const safeRows = normalizeBigInt(rows) as any[];

    if (isCsv) {
      const header = ["ts"].concat(catDimSql ? ["dim"] : []).concat(aliases);
      const csv = [header.join(",")]
        .concat(
          safeRows.map((r) => {
            const base = [new Date(r.ts).toISOString()];
            if (catDimSql) base.push(`"${(r.dim ?? "").replaceAll('"', '\\"')}"`);
            for (const a of aliases) base.push(String(r[a] ?? 0));
            return base.join(",");
          })
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=explore-${Date.now()}.csv`);
      return res.send(csv);
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSizeNum));
    return res.json({
      rows: safeRows,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
    });
  } catch (err) {
    console.error("Explore error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
