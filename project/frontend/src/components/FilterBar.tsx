import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/store/filterStore";
import { apiClient, Filters } from "@/api/client";

export const FilterBar: React.FC = () => {
  const { filters, setDateRange, setChannel, setStore, resetFilters } =
    useFilterStore();
  const { data: availableFilters } = useQuery<Filters>({ queryKey: ["filters"], queryFn: () => apiClient.getFilters(), staleTime: 300000 });

  return (
    <div className="card">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Data inicial</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setDateRange(e.target.value, filters.endDate)}
            className="input"
            aria-label="Data inicial"
            title="Selecione a data inicial"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="label">Data final</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setDateRange(filters.startDate, e.target.value)}
            className="input"
            aria-label="Data final"
            title="Selecione a data final"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="label">Canal</label>
          <select
            value={filters.channelId || ""}
            onChange={(e) => setChannel(e.target.value || undefined)}
            className="input"
            aria-label="Selecionar canal"
            title="Selecione um canal"
          >
            <option value="">Todos os canais</option>
            {availableFilters?.channels.map((channel: { id: number; name: string; type: string }) => (
              <option key={channel.id} value={channel.id}>
                {channel.name} — {channel.type === 'P' ? 'Presencial' : 'Delivery'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="label">Loja</label>
          <select
            value={filters.storeId || ""}
            onChange={(e) => setStore(e.target.value || undefined)}
            className="input"
            aria-label="Selecionar loja"
            title="Selecione uma loja"
          >
            <option value="">Todas as lojas</option>
            {availableFilters?.stores.map((store: { id: number; name: string; city: string }) => {
              /* c8 ignore start */
              const name = (store.name || '').trim();
              const city = (store.city || '').trim();
              const hasCityInName = city && name.toLowerCase().includes(city.toLowerCase());
              const label = hasCityInName ? name : (city ? `${name} - ${city}` : name);
              /* c8 ignore stop */
              return (
                <option key={store.id} value={store.id} title={label}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          {/* Invisible label to align with other fields */}
          <label className="label invisible">Ação</label>
          <button
            onClick={resetFilters}
            className="btn-secondary w-full md:w-auto"
            title="Limpar filtros"
            aria-label="Limpar filtros"
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

