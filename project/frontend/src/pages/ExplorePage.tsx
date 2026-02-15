import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { useFilterStore } from "@/store/filterStore";
import { FilterBar } from "@/components/FilterBar";
import { useQuery } from "@tanstack/react-query";
import { apiClient, Filters } from "@/api/client";
import { usePreferences } from "@/contexts/PreferencesContext";

type Row = { ts: string; dim?: string; [k: string]: any };
type ExploreResponse = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PAGE_SIZES = [25, 50, 100] as const;
const CHART_MAX_POINTS = 300;

function toNumeric(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    const n = Number(value.toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const MEASURES = [
  { key: 'revenue', label: 'Receita' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'avg_ticket', label: 'Ticket medio' },
  { key: 'cancels', label: 'Cancelamentos' },
  { key: 'avg_delivery_minutes', label: 'Tempo medio de entrega (min)' },
  { key: 'net_revenue', label: 'Receita liquida (aprox.)' },
] as const;

const GRAINS = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
] as const;

const DIMS = [
  { key: '', label: 'Sem dimensao' },
  { key: 'channel', label: 'Canal' },
  { key: 'store', label: 'Loja' },
  { key: 'product', label: 'Produto' },
  { key: 'category', label: 'Categoria' },
];

const CURRENCY_MEASURES = ['revenue', 'avg_ticket', 'net_revenue'] as const;

const isCurrencyMeasure = (measureKey: string) =>
  CURRENCY_MEASURES.includes(measureKey as (typeof CURRENCY_MEASURES)[number]);

export const ExplorePage: React.FC = () => {
  const [grain, setGrain] = useState('day');
  const [measure, setMeasure] = useState('revenue');
  const [dimension, setDimension] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { filters } = useFilterStore();
  const { currency } = usePreferences();
  const { data: exchangeRates } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => apiClient.getExchangeRates(),
    enabled: currency !== "BRL",
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const { data: availableFilters } = useQuery<Filters>({ queryKey: ["filters"], queryFn: () => apiClient.getFilters(), staleTime: 300000 });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
  });

  const buildPayload = (targetPage: number, requestedPageSize: number = pageSize) => {
    const payload: any = {
      measures: [measure],
      time_grain: grain,
      dimension: dimension || undefined,
      page: targetPage,
      pageSize: requestedPageSize,
    };
    if (filters?.startDate) payload.startDate = filters.startDate;
    if (filters?.endDate) payload.endDate = filters.endDate;
    if (filters?.storeId) payload.storeIds = [Number(filters.storeId)];
    if (filters?.channelId) payload.channelIds = [Number(filters.channelId)];
    return payload;
  };

  const normalizeResponse = (data: any, targetPage: number, requestedPageSize: number): ExploreResponse => {
    if (Array.isArray(data)) {
      return {
        rows: data,
        total: data.length,
        page: targetPage,
        pageSize: requestedPageSize,
        totalPages: Math.max(1, Math.ceil(data.length / requestedPageSize)),
      };
    }

    if (data && Array.isArray(data.rows)) {
      const nextPage = Number(data.page || targetPage);
      const nextSize = Number(data.pageSize || requestedPageSize);
      const nextTotal = Number(data.total || 0);
      return {
        rows: data.rows,
        total: nextTotal,
        page: nextPage,
        pageSize: nextSize,
        totalPages: Number(data.totalPages || Math.max(1, Math.ceil(nextTotal / nextSize))),
      };
    }

    throw new Error(data?.error || 'Resposta inesperada da API de Explore.');
  };

  const load = async (targetPage = 1, requestedPageSize: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildPayload(targetPage, requestedPageSize);
      const res = await fetch(`${API_URL}/api/explore/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json().catch(() => []);
      if (typeof res.ok === 'boolean' && !res.ok) {
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        setError(data?.error || `Falha ao consultar (${res.status})`);
        return;
      }

      const parsed = normalizeResponse(data, targetPage, requestedPageSize);
      setRows(parsed.rows);
      setTotal(parsed.total);
      setPage(parsed.page);
      setTotalPages(parsed.totalPages);
    } catch (e: any) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError(e?.message || 'Nao foi possivel consultar Explore. Verifique API/token.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    setError(null);
    const payload: any = {
      measures: [measure],
      time_grain: grain,
      dimension: dimension || undefined,
    };
    if (filters?.startDate) payload.startDate = filters.startDate;
    if (filters?.endDate) payload.endDate = filters.endDate;
    if (filters?.storeId) payload.storeIds = [Number(filters.storeId)];
    if (filters?.channelId) payload.channelIds = [Number(filters.channelId)];

    const res = await fetch(`${API_URL}/api/explore/query?format=csv`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (typeof res.ok === 'boolean' && !res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err?.error || `Falha ao exportar CSV (${res.status})`);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explore-${measure}-${grain}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const flat = useMemo(() => rows.map(r => ({
    date: new Date(r.ts).toISOString().substring(0, 10),
    label: r.dim || '',
    value: toNumeric(r[measure])
  })), [rows, measure]);

  const hasDim = Boolean(dimension);
  const selectedMeasureLabel = MEASURES.find(m => m.key === measure)?.label || measure;

  const fxRate = currency === 'BRL' ? 1 : exchangeRates?.rates?.[currency] || 1;
  const convertCurrency = (value: number) => value * fxRate;

  const formatMetricValue = (raw: any) => {
    const value = toNumeric(raw);
    if (isCurrencyMeasure(measure)) {
      const converted = convertCurrency(value);
      try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(converted);
      } catch {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      }
    }
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  };

  const chartData = useMemo(() => {
    if (hasDim) {
      const totals = new Map<string, number>();
      for (const item of flat) {
        const key = item.label || 'Sem dimensao';
        totals.set(key, (totals.get(key) || 0) + item.value);
      }
      return Array.from(totals.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    }

    if (flat.length <= CHART_MAX_POINTS) return flat;
    const step = Math.ceil(flat.length / CHART_MAX_POINTS);
    return flat.filter((_, idx) => idx % step === 0);
  }, [flat, hasDim]);

  const chips = useMemo(() => {
    const list: Array<{ label: string }> = [];
    if (filters?.startDate && filters?.endDate) {
      list.push({ label: `Periodo: ${filters.startDate} -> ${filters.endDate}` });
    }
    if (filters?.channelId) {
      const ch = availableFilters?.channels.find(c => String(c.id) === String(filters.channelId));
      const type = ch?.type === 'P' ? 'Presencial' : (ch?.type ? 'Delivery' : '');
      list.push({ label: `Canal: ${ch?.name || filters.channelId}${type ? ` (${type})` : ''}` });
    }
    if (filters?.storeId) {
      const st = availableFilters?.stores.find(s => String(s.id) === String(filters.storeId));
      const city = st?.city ? ` - ${st.city}` : '';
      list.push({ label: `Loja: ${st?.name || filters.storeId}${city}` });
    }
    return list;
  }, [filters, availableFilters]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-32 font-bold text-gray-900 dark:text-white">Explorar dados</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monte consultas customizadas por medida, tempo e dimensao.
          </p>
        </div>
      </header>
      <FilterBar />
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Medida</label>
          <select value={measure} onChange={e => { setMeasure(e.target.value); setPage(1); }} className="input">
            {MEASURES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tempo</label>
          <select value={grain} onChange={e => { setGrain(e.target.value); setPage(1); }} className="input">
            {GRAINS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Dimensao</label>
          <select value={dimension} onChange={e => { setDimension(e.target.value); setPage(1); }} className="input">
            {DIMS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
        <button onClick={() => load(1)} disabled={loading} className="btn-primary">{loading ? 'Carregando...' : 'Consultar'}</button>
        <button onClick={exportCsv} className="btn-secondary">Exportar CSV</button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-700 text-14 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
          {error}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-12">
              {c.label}
            </span>
          ))}
        </div>
      )}

      <div className="card">
        {hasDim ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => formatMetricValue(v)} />
              <Tooltip formatter={(v: any) => [formatMetricValue(v), selectedMeasureLabel]} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => formatMetricValue(v)} />
              <Tooltip formatter={(v: any) => [formatMetricValue(v), selectedMeasureLabel]} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card overflow-x-auto space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-13 text-gray-600 dark:text-gray-300">
          <span>Mostrando {from}-{to} de {total}</span>
          {total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Itens/pag</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const nextSize = Number(e.target.value);
                  setPageSize(nextSize);
                  setPage(1);
                  load(1, nextSize);
                }}
                className="input w-[120px] min-w-[120px]"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}/pag</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <table className="min-w-full text-left text-14">
          <thead>
            <tr className="text-gray-500">
              <th className="px-3 py-2">Data</th>
              {hasDim && <th className="px-3 py-2">Dimensao</th>}
              <th className="px-3 py-2">{selectedMeasureLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-3 py-2">{new Date(r.ts).toLocaleString()}</td>
                {hasDim && <td className="px-3 py-2">{r.dim}</td>}
                <td className="px-3 py-2">{formatMetricValue(r[measure])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex justify-end pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
              <span className="text-gray-500">Pagina</span>
              <button onClick={() => load(page - 1)} disabled={loading || page <= 1} className="btn-secondary">Anterior</button>
              <span className="min-w-[52px] text-center font-medium">{page}/{Math.max(totalPages, 1)}</span>
              <button onClick={() => load(page + 1)} disabled={loading || page >= totalPages} className="btn-secondary">Proxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;








