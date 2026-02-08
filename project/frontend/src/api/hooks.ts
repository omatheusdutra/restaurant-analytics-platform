import { useQuery } from "@tanstack/react-query";
import { apiClient, MetricsOverview, TopProduct, ChannelSales, TimeSeriesData, Insight, Filters } from "@/api/client";

export const useOverview = (params: Record<string, string>) =>
  useQuery<MetricsOverview>({
    queryKey: ["overview", params],
    queryFn: () => apiClient.getOverview(params),
    staleTime: 60_000,
  });

export const useTopProducts = (params: Record<string, string>) =>
  useQuery<TopProduct[]>({
    queryKey: ["top-products", params],
    queryFn: () => apiClient.getTopProducts(params),
    staleTime: 60_000,
  });

export const useSalesByChannel = (params: Record<string, string>) =>
  useQuery<ChannelSales[]>({
    queryKey: ["sales-by-channel", params],
    queryFn: () => apiClient.getSalesByChannel(params),
    staleTime: 60_000,
  });

export const useTimeSeries = (params: Record<string, string>) =>
  useQuery<TimeSeriesData[]>({
    queryKey: ["time-series", params],
    queryFn: () => apiClient.getTimeSeries(params),
    staleTime: 60_000,
    select: (data: TimeSeriesData[]) => data.map((d: TimeSeriesData) => ({ ...d })),
  });

export const useInsights = (params: Record<string, string>) =>
  useQuery<{ insights: Insight[] }>({
    queryKey: ["insights", params],
    queryFn: () => apiClient.getInsights(params),
    staleTime: 60_000,
  });

export const useFilters = () =>
  useQuery<Filters>({
    queryKey: ["filters"],
    queryFn: () => apiClient.getFilters(),
    staleTime: 5 * 60_000,
  });
