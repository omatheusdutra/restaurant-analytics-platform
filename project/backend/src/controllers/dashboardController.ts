import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import crypto from "crypto";

function parseDashboardId(idRaw: string): number | null {
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export const createDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, description, layout, isPublic } = req.body;

    if (!name || !layout) {
      return res.status(400).json({ error: "Name and layout are required" });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        userId,
        name,
        description: description || null,
        layout,
        isPublic: isPublic || false,
        shareToken: isPublic ? crypto.randomBytes(16).toString("hex") : null,
      },
    });

    return res.status(201).json(dashboard);
  } catch (error) {
    console.error("Create dashboard error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getDashboards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const dashboards = await prisma.dashboard.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(dashboards);
  } catch (error) {
    console.error("Get dashboards error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsedId = parseDashboardId(req.params.id);
    if (!parsedId) return res.status(400).json({ error: "invalid dashboard id" });

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: parsedId,
        userId,
      },
    });

    if (!dashboard) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    return res.json(dashboard);
  } catch (error) {
    console.error("Get dashboard error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsedId = parseDashboardId(req.params.id);
    if (!parsedId) return res.status(400).json({ error: "invalid dashboard id" });

    const { name, description, layout, isPublic } = req.body;

    const existingDashboard = await prisma.dashboard.findFirst({
      where: {
        id: parsedId,
        userId,
      },
    });

    if (!existingDashboard) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    let shareToken = existingDashboard.shareToken;
    if (isPublic && !shareToken) {
      shareToken = crypto.randomBytes(16).toString("hex");
    } else if (!isPublic) {
      shareToken = null;
    }

    const dashboard = await prisma.dashboard.update({
      where: { id: parsedId },
      data: {
        name: name || existingDashboard.name,
        description:
          description !== undefined ? description : existingDashboard.description,
        layout: layout || existingDashboard.layout,
        isPublic:
          isPublic !== undefined ? isPublic : existingDashboard.isPublic,
        shareToken,
      },
    });

    return res.json(dashboard);
  } catch (error) {
    console.error("Update dashboard error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsedId = parseDashboardId(req.params.id);
    if (!parsedId) return res.status(400).json({ error: "invalid dashboard id" });

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: parsedId,
        userId,
      },
    });

    if (!dashboard) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    await prisma.dashboard.delete({
      where: { id: parsedId },
    });

    return res.json({ message: "Dashboard deleted successfully" });
  } catch (error) {
    console.error("Delete dashboard error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSharedDashboard = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        shareToken,
        isPublic: true,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!dashboard) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    return res.json({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      createdBy: dashboard.user.name,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    });
  } catch (error) {
    console.error("Get shared dashboard error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
