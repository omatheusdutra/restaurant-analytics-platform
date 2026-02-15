import { Request, Response } from "express";
import prisma from "../config/database";
import { parseDateRange } from "./metricsController";

function parseOptionalId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export const getInsights = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, channelId, storeId } = req.query;
    const dateRange = parseDateRange(startDate as string, endDate as string);

    const baseWhere: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    const parsedChannelId = parseOptionalId(channelId);
    if (parsedChannelId) baseWhere.channelId = parsedChannelId;
    const parsedStoreId = parseOptionalId(storeId);
    if (parsedStoreId) baseWhere.storeId = parsedStoreId;

    const completedWhere = { ...baseWhere, saleStatusDesc: "COMPLETED" };
    const cancelledWhere = { ...baseWhere, saleStatusDesc: "CANCELLED" };

    const [
      salesData,
      topProducts,
      channelsData,
      timeDistribution,
      totalOrdersAll,
      cancelledOrders,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: completedWhere,
        _sum: {
          totalAmount: true,
          totalAmountItems: true,
          totalDiscount: true,
        },
        _count: { id: true },
        _avg: { totalAmount: true },
      }),
      prisma.productSale.groupBy({
        by: ["productId"],
        where: { sale: completedWhere },
        _sum: {
          quantity: true,
          totalPrice: true,
        },
        orderBy: {
          _sum: { totalPrice: "desc" },
        },
        take: 5,
      }),
      prisma.sale.groupBy({
        by: ["channelId"],
        where: completedWhere,
        _sum: {
          totalAmount: true,
        },
        _count: { id: true },
        orderBy: {
          _sum: { totalAmount: "desc" },
        },
      }),
      prisma.sale.findMany({
        where: completedWhere,
        select: { createdAt: true },
      }),
      prisma.sale.count({ where: baseWhere }),
      prisma.sale.count({ where: cancelledWhere }),
    ]);

    const insights: any[] = [];

    const totalRevenue = Number(salesData._sum.totalAmount || 0);
    const totalOrders = salesData._count.id;
    const avgTicket = Number(salesData._avg.totalAmount || 0);
    const grossRevenue = Number(salesData._sum.totalAmountItems || 0);
    const totalDiscount = Number(salesData._sum.totalDiscount || 0);
    const discountRate = grossRevenue > 0 ? totalDiscount / grossRevenue : 0;
    const cancellationRate =
      totalOrdersAll > 0 ? cancelledOrders / totalOrdersAll : 0;

    insights.push({
      type: "summary",
      icon: "chart",
      title: "Visao Geral de Desempenho",
      description: `Foram gerados ${totalOrders.toLocaleString()} pedidos totalizando R$ ${totalRevenue.toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 }
      )} com ticket medio de R$ ${avgTicket.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}. Desconto medio de ${(discountRate * 100).toFixed(1)}% e taxa de cancelamento de ${(cancellationRate * 100).toFixed(1)}%.`,
      priority: "high",
    });

    if (topProducts.length > 0) {
      const topProduct = topProducts[0];
      const productDetails = await prisma.product.findUnique({
        where: { id: topProduct.productId },
        include: { category: true },
      });

      insights.push({
        type: "top_product",
        icon: "trophy",
        title: "Produto Mais Vendido",
        description: `"${productDetails?.name}" e o produto com melhor desempenho com ${
          topProduct._sum.quantity
        } unidades vendidas e R$ ${Number(
          topProduct._sum.totalPrice || 0
        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de receita.`,
        priority: "high",
        data: {
          productName: productDetails?.name,
          quantity: topProduct._sum.quantity,
          revenue: Number(topProduct._sum.totalPrice || 0),
        },
      });
    }

    if (channelsData.length > 1 && totalRevenue > 0) {
      const topChannel = channelsData[0];
      const channelDetails = await prisma.channel.findUnique({
        where: { id: topChannel.channelId },
      });

      const channelPercentage = (
        (Number(topChannel._sum.totalAmount || 0) / totalRevenue) *
        100
      ).toFixed(1);

      insights.push({
        type: "channel_performance",
        icon: "channel",
        title: "Canal Lider",
        description: `${
          channelDetails?.name
        } responde por ${channelPercentage}% da receita do periodo (R$ ${Number(
          topChannel._sum.totalAmount || 0
        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
        priority: "high",
        data: {
          channelName: channelDetails?.name,
          percentage: channelPercentage,
          revenue: Number(topChannel._sum.totalAmount || 0),
        },
      });
    }

    const hourDistribution: { [hour: number]: number } = {};
    timeDistribution.forEach((sale) => {
      const hour = new Date(sale.createdAt).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour, 10));

    if (peakHours.length > 0) {
      const peakHoursStr = peakHours.map((h) => `${h}:00-${h + 1}:00`).join(", ");

      insights.push({
        type: "peak_hours",
        icon: "clock",
        title: "Horarios de Pico",
        description: `Os horarios com maior volume foram ${peakHoursStr}. Ajuste escala e preparo para reduzir gargalos.`,
        priority: "medium",
        data: {
          peakHours,
          orderCounts: peakHours.map((h) => hourDistribution[h]),
        },
      });
    }

    if (avgTicket > 0 && avgTicket < 50) {
      insights.push({
        type: "opportunity",
        icon: "idea",
        title: "Oportunidade de Upsell",
        description: `Ticket medio de R$ ${avgTicket.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}. Combine itens e ofertas para elevar o valor por pedido.`,
        priority: "medium",
      });
    }

    if (discountRate >= 0.2) {
      insights.push({
        type: "discount_pressure",
        icon: "tag",
        title: "Desconto Elevado",
        description: `Taxa de desconto em ${(discountRate * 100).toFixed(1)}%. Revise politica promocional para proteger margem.`,
        priority: "medium",
      });
    }

    if (cancellationRate >= 0.08) {
      insights.push({
        type: "cancellation_risk",
        icon: "warning",
        title: "Cancelamento Acima do Ideal",
        description: `Taxa de cancelamento em ${(cancellationRate * 100).toFixed(1)}%. Investigue atrasos e indisponibilidade de itens.`,
        priority: "high",
      });
    }

    if (totalOrders > 100) {
      const daysInPeriod = Math.max(
        1,
        Math.ceil(
          (dateRange.end.getTime() - dateRange.start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const ordersPerDay = totalOrders / daysInPeriod;

      insights.push({
        type: "growth",
        icon: "growth",
        title: "Volume de Vendas",
        description: `Media de ${ordersPerDay.toFixed(1)} pedidos por dia no periodo analisado.`,
        priority: "low",
      });
    }

    if (topProducts.length >= 3 && totalRevenue > 0) {
      const top3Revenue = topProducts
        .slice(0, 3)
        .reduce((sum, p) => sum + Number(p._sum.totalPrice || 0), 0);
      const top3Percentage = (top3Revenue / totalRevenue) * 100;

      if (top3Percentage > 60) {
        insights.push({
          type: "risk",
          icon: "risk",
          title: "Concentracao de Receita",
          description: `Os 3 principais produtos concentram ${top3Percentage.toFixed(
            1
          )}% da receita. Avalie diversificacao de mix.`,
          priority: "medium",
        });
      }
    }

    return res.json({
      insights,
      generatedAt: new Date().toISOString(),
      period: {
        start: dateRange.start,
        end: dateRange.end,
      },
    });
  } catch (error) {
    console.error("Insights generation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
