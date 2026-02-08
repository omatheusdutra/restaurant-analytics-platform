import React from "react";
import { Insight } from "@/api/client";
import type { Currency } from "@/contexts/PreferencesContext";

interface InsightsCardProps {
  insights: Insight[];
  currency?: Currency;
  fxRate?: number;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights, currency = "BRL", fxRate = 1 }) => {
  if (insights.length === 0) {
    return (
      <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
        <p>Nenhum insight disponível para o período selecionado.</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        // Em light theme, evite colidir com o fundo azulado do dashboard
        return "border-l-primary-600 bg-white dark:bg-primary-900/20";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "low":
        return "border-l-gray-400 bg-gray-50 dark:bg-gray-800/50";
      default:
        return "border-l-gray-300 bg-white dark:bg-gray-800";
    }
  };

  const titleMap: Record<string, string> = {
    summary: "Panorama de Resultados",
    top_product: "Campeão de Vendas",
    channel_performance: "Canal Destaque",
    peak_hours: "Picos de Movimento",
    growth: "Ritmo de Vendas",
    discount_pressure: "Descontos Elevados",
    cancellation_risk: "Cancelamentos em Alta",
  };

  const iconMap: Record<string, string> = {
    summary: "📊",
    top_product: "🏆",
    channel_performance: "📈",
    peak_hours: "⏰",
    growth: "🚀",
    discount_pressure: "🏷️",
    cancellation_risk: "❌",
  };

  // Keep backward compatibility with older backend titles.
  const legacyTitles = new Set([
    "Visão Geral de Desempenho",
    "Produto Mais Vendido",
    "Canal de Vendas Líder",
    "Horários de Pico",
    "Volume de Vendas",
  ]);

  /* c8 ignore start */
  const resolveTitle = (type: string, provided?: string) => {
    if (!provided || legacyTitles.has(provided)) {
      return titleMap[type] ?? provided ?? type;
    }
    return provided;
  };
  /* c8 ignore stop */
  const parseBrlAmount = (value: string): number => {
    const cleaned = value.replace(/\s/g, "");
    let normalized = cleaned;

    if (cleaned.includes(".") && cleaned.includes(",")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
      normalized = cleaned.replace(",", ".");
    }

    const numeric = Number(normalized.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatInsightDescription = (description: string) => {
    if (currency === "BRL" || !Number.isFinite(fxRate) || fxRate <= 0) return description;

    return description.replace(/R\$\s?([\d.,]+)/g, (_full, amount) => {
      const brlValue = parseBrlAmount(String(amount));
      const converted = brlValue * fxRate;
      try {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(converted);
      } catch {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(brlValue);
      }
    });
  };

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`card p-4 border-l-4 ${getPriorityColor(
            insight.priority
          )}`}
          role="article"
          aria-label={`Insight: ${resolveTitle(insight.type, insight.title)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" role="img" aria-label={insight.type}>
              {iconMap[insight.type] ?? insight.icon}
            </span>
            <div className="flex-1">
              <h4 className="text-16 font-semibold text-gray-900 dark:text-white mb-1">
                {resolveTitle(insight.type, insight.title)}
              </h4>
              <p className="text-14 text-gray-700 dark:text-gray-300">
                {formatInsightDescription(insight.description)}
              </p>
              {insight.priority === "high" && (
                <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                  Alta Prioridade
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
