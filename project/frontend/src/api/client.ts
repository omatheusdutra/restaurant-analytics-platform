// Base da API sem sufixo /api; os endpoints ja incluem "/api/..."
/* c8 ignore next */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface MetricsOverview {
  currentPeriod: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalRevenue: number;
    grossRevenue: number;
    totalOrders: number;
    totalOrdersAll: number;
    ordersCancelled: number;
    averageTicket: number;
    totalDiscount: number;
    discountRate: number;
    cancellationRate: number;
    averageProductionTime: number;
    averageDeliveryTime: number;
  };
  growth: {
    revenueGrowth: number;
    ordersGrowth: number;
  };
}

export interface TopProduct {
  productId: number;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ChannelSales {
  channelId: number;
  channelName: string;
  channelType: string;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
}

export interface StoreSales {
  storeId: number;
  storeName: string;
  city: string;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
}

export interface TimeSeriesData {
  date: string;
  orders: number;
  ordersTotal: number;
  ordersCancelled: number;
  revenue: number;
  grossRevenue: number;
  avgTicket: number;
  discountRate: number;
  cancellationRate: number;
}

export interface CategorySales {
  name: string;
  quantity: number;
  revenue: number;
}

export interface Filters {
  channels: Array<{ id: number; name: string; type: string }>;
  stores: Array<{ id: number; name: string; city: string; state: string }>;
  categories: Array<{ id: number; name: string }>;
}

export interface DataQualitySummary {
  totalSalesAudited?: number;
  totalItemsAudited?: number;
  totalCustomersAudited?: number;
  salesMissingStore: number;
  salesMissingChannel: number;
  salesMissingCreatedAt: number;
  negativeTotalAmount: number;
  nonPositiveItemQty: number;
  orphanProductSales: number;
  customersMissingEmail: number;
  customersInvalidEmail: number;
}

export interface DataQualityTrendPoint extends DataQualitySummary {
  date: string;
}

export interface Insight {
  type: string;
  icon: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  data?: any;
}

export interface InsightsResponse {
  insights: Insight[];
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
}


export interface ExchangeRatesResponse {
  base: "BRL";
  date: string;
  rates: {
    USD: number;
    EUR: number;
  };
}
export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  layout: any;
  isPublic: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    } as Record<string, string>;

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async register(
    email: string,
    password: string,
    name: string
  ): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(response.token);
    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async getProfile(): Promise<User> {
    return this.request<User>("/api/auth/profile");
  }

  async updateProfile(name: string): Promise<User> {
    return this.request<User>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getOverview(params?: Record<string, string>): Promise<MetricsOverview> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<MetricsOverview>(`/api/metrics/overview${query}`);
  }

  async getTopProducts(params?: Record<string, string>): Promise<TopProduct[]> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<TopProduct[]>(`/api/metrics/top-products${query}`);
  }

  async getSalesByChannel(
    params?: Record<string, string>
  ): Promise<ChannelSales[]> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ChannelSales[]>(
      `/api/metrics/sales-by-channel${query}`
    );
  }

  async getSalesByStore(
    params?: Record<string, string>
  ): Promise<StoreSales[]> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<StoreSales[]>(`/api/metrics/sales-by-store${query}`);
  }

  async getTimeSeries(
    params?: Record<string, string>
  ): Promise<TimeSeriesData[]> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<TimeSeriesData[]>(`/api/metrics/time-series${query}`);
  }

  async getCategories(
    params?: Record<string, string>
  ): Promise<CategorySales[]> {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<CategorySales[]>(`/api/metrics/categories${query}`);
  }

  /* c8 ignore start */
  async getFilters(params?: { state?: string; city?: string }): Promise<Filters> {
    const query = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.request<Filters>(`/api/metrics/filters${query}`);
  }
  /* c8 ignore stop */

  async getInsights(
    params?: Record<string, string>
  ): Promise<InsightsResponse> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<InsightsResponse>(`/api/metrics/insights${query}`);
  }

  async exportCSV(params?: Record<string, string>): Promise<Blob> {
    /* c8 ignore next */
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const response = await fetch(`${API_URL}/api/metrics/export-csv${query}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to export CSV");
    }

    return response.blob();
  }

  async createDashboard(data: Partial<Dashboard>): Promise<Dashboard> {
    return this.request<Dashboard>("/api/dashboards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getDashboards(): Promise<Dashboard[]> {
    return this.request<Dashboard[]>("/api/dashboards");
  }

  async getDashboard(id: number): Promise<Dashboard> {
    return this.request<Dashboard>(`/api/dashboards/${id}`);
  }

  async updateDashboard(
    id: number,
    data: Partial<Dashboard>
  ): Promise<Dashboard> {
    return this.request<Dashboard>(`/api/dashboards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDashboard(id: number): Promise<void> {
    await this.request(`/api/dashboards/${id}`, {
      method: "DELETE",
    });
  }

  async getSharedDashboard(shareToken: string): Promise<Dashboard> {
    return this.request<Dashboard>(`/api/dashboards/shared/${shareToken}`);
  }

  async getDataQualitySummary(days = 7): Promise<DataQualitySummary> {
    return this.request<DataQualitySummary>(`/api/metrics/data-quality?days=${days}`);
  }

  async getDataQualityTrend(days = 7): Promise<DataQualityTrendPoint[]> {
    return this.request<DataQualityTrendPoint[]>(`/api/metrics/data-quality-trend?days=${days}`);
  }

  async getExchangeRates(): Promise<ExchangeRatesResponse> {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD,EUR");
    if (!response.ok) throw new Error("Failed to fetch exchange rates");
    const data = await response.json();
    return {
      base: "BRL",
      date: data?.date || new Date().toISOString().slice(0, 10),
      rates: {
        USD: Number(data?.rates?.USD || 0),
        EUR: Number(data?.rates?.EUR || 0),
      },
    };
  }
}

export const apiClient = new ApiClient();









