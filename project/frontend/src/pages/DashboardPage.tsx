import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/MetricCard";
import { FilterBar } from "@/components/FilterBar";
import { InsightsCard } from "@/components/InsightsCard";
import { useFilterStore } from "@/store/filterStore";
import {
  apiClient,
  MetricsOverview,
  ChannelSales,
  TimeSeriesData,
  Insight,
  DataQualitySummary,
  DataQualityTrendPoint,
} from "@/api/client";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  TrendingUp,
  Download,
  Percent,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { usePreferences } from "@/contexts/PreferencesContext";

export const formatDateHelper = (dateFormat: string, d: string) => {
  // Avoid timezone drift for ISO-like inputs by parsing manually
  const isoLike = /^\d{4}-\d{2}-\d{2}$/;
  if (isoLike.test(d)) {
    const [y, m, day] = d.split("-");
    if (dateFormat === "yyyy-MM-dd") return `${y}-${m}-${day}`;
    return `${day}/${m}/${y}`;
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  if (dateFormat === "yyyy-MM-dd") {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const DashboardPage: React.FC = () => {
  const { getQueryParams } = useFilterStore();
  const { currency, dateFormat } = usePreferences();
  const { data: exchangeRates } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => apiClient.getExchangeRates(),
    enabled: currency !== "BRL",
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const location = useLocation();

  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [channels, setChannels] = useState<ChannelSales[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | null>(null);
  const [dataQualityTrend, setDataQualityTrend] = useState<DataQualityTrendPoint[]>([]);
  const [exporting, setExporting] = useState(false);

  const fxRate = currency === "BRL" ? 1 : exchangeRates?.rates?.[currency] || 1;
  const convertCurrency = (v: number) => (v || 0) * fxRate;

  const formatCurrency = (v: number) => {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(convertCurrency(v));
    } catch {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
    }
  };
  const formatNumber = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);
  const formatDate = (d: string) => formatDateHelper(dateFormat, d);
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;
  const QUALITY_WARN_AT = Number(import.meta.env.VITE_QUALITY_WARN_AT || 1);
  const QUALITY_TREND_DAYS = Number(import.meta.env.VITE_QUALITY_TREND_DAYS || 7);

  const qualityBadge = (value: number, warnAt = QUALITY_WARN_AT) => (
    <span
      className={
        value >= warnAt
          ? "text-12 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-300"
          : "text-12 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-300"
      }
    >
      {value >= warnAt ? "Alerta" : "OK"}
    </span>
  );

  // Debounced params + React Query fetching
  const rawParams = getQueryParams();
  const [debouncedParams, setDebouncedParams] = useState(rawParams);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedParams(rawParams), 300);
    return () => clearTimeout(id);
  }, [rawParams.startDate, rawParams.endDate, rawParams.channelId, rawParams.storeId]);

  const { isLoading } = useQuery({
    queryKey: ["dashboard", debouncedParams],
    queryFn: async () => {
      const params = debouncedParams;
      const [overviewData, channelsData, timeSeriesData, insightsData, qualityData, qualityTrend] =
        await Promise.all([
          apiClient.getOverview(params),
          apiClient.getSalesByChannel(params),
          apiClient.getTimeSeries({ ...params, groupBy: "day" }),
          apiClient.getInsights(params),
          apiClient.getDataQualitySummary(),
          apiClient.getDataQualityTrend(QUALITY_TREND_DAYS),
        ]);
      setOverview(overviewData);
      setChannels(channelsData);
      setTimeSeries(timeSeriesData);
      setInsights(insightsData.insights);
      setDataQuality(qualityData);
      setDataQualityTrend(qualityTrend);
      return true;
    },
    staleTime: 60_000,
  });

  // Deep-link support: /dashboard#insights or #channels
  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    const map: Record<string, string> = {
      insights: "insights-section",
      channels: "channels-section",
    };
    const target = document.getElementById(map[hash]);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = getQueryParams();
      const blob = await apiClient.exportCSV(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" role="status" aria-live="polite">
        <div className="text-20" aria-label="Carregando dados do dashboard">
          Carregando dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-32 font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Insights em tempo real para turbinar seu restaurante
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="btn-secondary flex items-center gap-2"
          aria-label="Exportar dados para CSV"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </header>

      <FilterBar />

      {/* KPI Cards */}
      <section aria-label="Indicadores Principais de Desempenho">
        <h2 className="sr-only">Indicadores Principais de Desempenho</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Receita Total"
            value={convertCurrency(overview?.metrics.totalRevenue || 0)}
            format="currency"
            icon={<DollarSign className="w-5 h-5 text-primary-600" aria-hidden="true" />}
            trend={overview?.growth.revenueGrowth}
            currency={currency}
          />
          <MetricCard
            title="Receita Bruta"
            value={convertCurrency(overview?.metrics.grossRevenue || 0)}
            format="currency"
            icon={<DollarSign className="w-5 h-5 text-primary-600" aria-hidden="true" />}
            subtitle={`Desconto: ${formatCurrency(overview?.metrics.totalDiscount || 0)}`}
            currency={currency}
          />
          <MetricCard
            title="Total de Pedidos"
            value={overview?.metrics.totalOrders || 0}
            icon={<ShoppingCart className="w-5 h-5 text-primary-600" aria-hidden="true" />}
            trend={overview?.growth.ordersGrowth}
          />
          <MetricCard
            title="Ticket por Pedido"
            value={convertCurrency(overview?.metrics.averageTicket || 0)}
            format="currency"
            icon={<TrendingUp className="w-5 h-5 text-primary-600" aria-hidden="true" />}
            currency={currency}
          />
          <MetricCard
            title="Tempo de Preparo"
            value={overview?.metrics.averageProductionTime || 0}
            format="time"
            icon={<Clock className="w-5 h-5 text-primary-600" aria-hidden="true" />}
          />
          <MetricCard
            title="Taxa de Desconto"
            value={formatPercent(overview?.metrics.discountRate || 0)}
            icon={<Percent className="w-5 h-5 text-primary-600" aria-hidden="true" />}
            subtitle={`Desconto total: ${formatCurrency(overview?.metrics.totalDiscount || 0)}`}
          />
          <MetricCard
            title="Taxa de Cancelamento"
            value={formatPercent(overview?.metrics.cancellationRate || 0)}
            icon={<XCircle className="w-5 h-5 text-primary-600" aria-hidden="true" />}
            subtitle={`Cancelados: ${formatNumber(overview?.metrics.ordersCancelled || 0)} de ${formatNumber(overview?.metrics.totalOrdersAll || 0)}`}
          />
        </div>
      </section>

      {/* Charts Grid */}
      <section aria-label="Visualizações de Dados">
        <h2 className="sr-only">Visualizações de Dados</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-20 font-semibold mb-4 text-gray-900 dark:text-white">
              Ritmo da Receita
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis yAxisId="left" tickFormatter={(v) => formatNumber(convertCurrency(Number(v)))} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${Number(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v: any, name: any) => {
                    const seriesName = String(name || "");
                    if (seriesName === "Receita" || seriesName === "Receita Bruta") {
                      return [formatCurrency(Number(v)), name];
                    }
                    if (seriesName === "Taxa de Desconto" || seriesName === "Taxa de Cancelamento") {
                      return [formatPercent(Number(v)), name];
                    }
                    return [formatNumber(Number(v)), name];
                  }}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Receita" stroke="#ef4444" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="grossRevenue" name="Receita Bruta" stroke="#f59e0b" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="discountRate" name="Taxa de Desconto" stroke="#6366f1" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="cancellationRate" name="Taxa de Cancelamento" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-20 font-semibold mb-4 text-gray-900 dark:text-white">
              Fluxo de Pedidos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(v: any, name: any) => [formatNumber(Number(v)), name]}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line type="monotone" dataKey="orders" name="Pedidos" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="ordersTotal" name="Pedidos Totais" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="ordersCancelled" name="Cancelados" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Insights */}
      <section id="insights-section" aria-label="Insights Gerados por IA">
        <h2 className="text-20 font-semibold text-gray-900 dark:text-white mb-4">Insights</h2>
        {insights.length > 0 ? (
          <InsightsCard insights={insights} currency={currency} fxRate={fxRate} />
        ) : (
          <div className="card">
            <p className="text-gray-600 dark:text-gray-400">Sem insights para o periodo e filtros selecionados.</p>
          </div>
        )}
      </section>

      {/* Qualidade de Dados */}
      {dataQuality && (
        <section aria-label="Qualidade de Dados">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-20 font-semibold text-gray-900 dark:text-white">Qualidade de Dados</h2>
            <div className="flex items-center gap-2 text-14 text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Atualizado (últimos {QUALITY_TREND_DAYS} dias)
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Pedidos Auditados"
              value={dataQuality.totalSalesAudited || 0}
              icon={<CheckCircle2 className="w-5 h-5 text-primary-600" aria-hidden="true" />}
              subtitle={`${formatNumber(dataQuality.totalItemsAudited || 0)} itens | ${formatNumber(dataQuality.totalCustomersAudited || 0)} clientes`}
            />
            <MetricCard
              title="Pedidos sem Loja"
              value={dataQuality.salesMissingStore}
              icon={<XCircle className="w-5 h-5 text-primary-600" aria-hidden="true" />}
              subtitle={qualityBadge(dataQuality.salesMissingStore)}
            />
            <MetricCard
              title="Pedidos sem Canal"
              value={dataQuality.salesMissingChannel}
              icon={<XCircle className="w-5 h-5 text-primary-600" aria-hidden="true" />}
              subtitle={qualityBadge(dataQuality.salesMissingChannel)}
            />
            <MetricCard
              title="Itens com Quantidade Inválida"
              value={dataQuality.nonPositiveItemQty}
              icon={<XCircle className="w-5 h-5 text-primary-600" aria-hidden="true" />}
              subtitle={qualityBadge(dataQuality.nonPositiveItemQty)}
            />
            <MetricCard
              title="Emails Inválidos"
              value={dataQuality.customersInvalidEmail}
              icon={<XCircle className="w-5 h-5 text-primary-600" aria-hidden="true" />}
              subtitle={qualityBadge(dataQuality.customersInvalidEmail)}
            />
          </div>

          {dataQualityTrend.length > 0 && (
            <div className="card mt-4">
              <h3 className="text-16 font-semibold mb-3 text-gray-900 dark:text-white">Tendência (últimos 7 dias)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dataQualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis tickFormatter={formatNumber} />
                  <Tooltip
                    formatter={(v: any, name: any) => [formatNumber(Number(v)), name]}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="salesMissingStore" name="Pedidos sem Loja" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="salesMissingChannel" name="Pedidos sem Canal" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="nonPositiveItemQty" name="Itens Inválidos" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="customersInvalidEmail" name="Emails Inválidos" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* Desempenho por Canal */}
      <section id="channels-section" aria-label="Dados de Desempenho por Canal">
        <h2 className="sr-only">Dados de Desempenho por Canal</h2>
        <div className="card">
          <h3 className="text-20 font-semibold mb-4 text-gray-900 dark:text-white">
            Performance por Canal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Métricas de desempenho por canal">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-12 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    scope="col"
                  >
                    Canal
                  </th>
                  <th
                    className="px-4 py-3 text-left text-12 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    scope="col"
                  >
                    Tipo
                  </th>
                  <th
                    className="px-4 py-3 text-right text-12 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    scope="col"
                  >
                    Pedidos
                  </th>
                  <th
                    className="px-4 py-3 text-right text-12 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    scope="col"
                  >
                    Receita
                  </th>
                  <th
                    className="px-4 py-3 text-right text-12 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    scope="col"
                  >                    Ticket por Pedido
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {channels.map((c) => (
                  <tr key={c.channelId} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-4 py-3 whitespace-nowrap text-16 text-gray-900 dark:text-white">
                      {c.channelName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-16">
                      <span
                        className={
                          c.channelType === "D"
                            ? "text-12 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-300"
                            : "text-12 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-300"
                        }
                        aria-label={c.channelType === "D" ? "Delivery" : "Presencial"}
                        title={`Tipo do canal: ${c.channelType === "D" ? "Delivery" : "Presencial"}`}
                      >
                        {c.channelType === "D" ? "Delivery" : "Presencial"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-16 text-gray-900 dark:text-white">
                      {formatNumber(c.totalOrders)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-16 text-gray-900 dark:text-white">
                      {formatCurrency(c.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-16 text-gray-900 dark:text-white">
                      {formatCurrency(c.averageTicket)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

