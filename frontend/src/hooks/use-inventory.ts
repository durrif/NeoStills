// src/hooks/use-inventory.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Ingredient, PaginatedResponse } from "@/lib/types";

const INVENTORY_KEY = ["inventory"] as const;

interface InventoryParams {
  page?: number;
  page_size?: number;
  category?: string;
  search?: string;
  low_stock_only?: boolean;
  expiring_days?: number | null;
}

export function useInventory(params: InventoryParams = {}) {
  const breweryId = useAuthStore((s) => s.brewery?.id);

  const query = useQuery({
    queryKey: [...INVENTORY_KEY, params, breweryId],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set("page", String(params.page));
      if (params.page_size) sp.set("page_size", String(params.page_size));
      if (params.category) sp.set("category", params.category);
      if (params.search) sp.set("search", params.search);
      if (params.low_stock_only) sp.set("low_stock_only", "true");
      if (params.expiring_days != null)
        sp.set("expiring_days", String(params.expiring_days));
      const qs = sp.toString();
      return api.get<PaginatedResponse<Ingredient>>(
        `/v1/inventory${qs ? `?${qs}` : ""}`
      );
    },
    enabled: !!breweryId,
    staleTime: 30_000,
  });

  return query;
}

export function useInventoryAlerts() {
  const breweryId = useAuthStore((s) => s.brewery?.id);

  const expiring = useQuery({
    queryKey: [...INVENTORY_KEY, "alerts", "expiring", breweryId],
    queryFn: () =>
      api.get<Ingredient[]>("/v1/inventory/alerts/expiring?days=30"),
    enabled: !!breweryId,
    staleTime: 60_000,
  });

  const lowStock = useQuery({
    queryKey: [...INVENTORY_KEY, "alerts", "low-stock", breweryId],
    queryFn: () => api.get<Ingredient[]>("/v1/inventory/alerts/low-stock"),
    enabled: !!breweryId,
    staleTime: 60_000,
  });

  return { expiring, lowStock };
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Ingredient, "id" | "distillery_id" | "brewery_id" | "created_at" | "updated_at">) =>
      api.post<Ingredient>("/v1/inventory", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEY }),
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Ingredient> & { id: string }) =>
      api.patch<Ingredient>(`/v1/inventory/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEY }),
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/inventory/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEY }),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      delta,
      reason,
    }: {
      id: string;
      delta: number;
      reason?: string;
    }) =>
      api.post<Ingredient>(`/v1/inventory/${id}/adjust`, {
        delta,
        reason: reason ?? "quick_adjust",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVENTORY_KEY }),
  });
}
