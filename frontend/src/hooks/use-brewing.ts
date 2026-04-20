// src/hooks/use-brewing.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { BrewSession, Recipe, FermentationDataPoint } from "@/lib/types";

const SESSIONS_KEY = ["brewing", "sessions"] as const;
const RECIPES_KEY = ["recipes"] as const;

// ── Brew Sessions ──────────────────────────────────────────────────────────

export function useBrewSessions(phase?: string) {
  const breweryId = useAuthStore((s) => s.brewery?.id);
  return useQuery({
    queryKey: [...SESSIONS_KEY, phase, breweryId],
    queryFn: () => {
      const qs = phase ? `?phase_filter=${phase}` : "";
      return api.get<BrewSession[]>(`/v1/distillation${qs}`);
    },
    enabled: !!breweryId,
    staleTime: 15_000,
  });
}

export function useActiveSession() {
  const breweryId = useAuthStore((s) => s.brewery?.id);
  return useQuery({
    queryKey: [...SESSIONS_KEY, "active", breweryId],
    queryFn: () => api.get<BrewSession | null>("/v1/distillation/active"),
    enabled: !!breweryId,
    staleTime: 10_000,
  });
}

export function useBrewSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, sessionId],
    queryFn: () => api.get<BrewSession>(`/v1/distillation/${sessionId}`),
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BrewSession>) =>
      api.post<BrewSession>("/v1/distillation", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BrewSession> & { id: number }) =>
      api.patch<BrewSession>(`/v1/distillation/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

export function useAdvancePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      phase,
      notes,
    }: {
      sessionId: string;
      phase: string;
      notes?: string;
    }) =>
      api.post<BrewSession>(`/v1/distillation/${sessionId}/advance`, {
        phase,
        notes,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/distillation/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

// ── Recipes ────────────────────────────────────────────────────────────────

export function useRecipes(search?: string) {
  const breweryId = useAuthStore((s) => s.brewery?.id);
  return useQuery({
    queryKey: [...RECIPES_KEY, search, breweryId],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return api.get<Recipe[]>(`/v1/recipes${qs}`);
    },
    enabled: !!breweryId,
    staleTime: 60_000,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Recipe>) =>
      api.post<Recipe>("/v1/recipes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECIPES_KEY }),
  });
}

// ── Fermentation ────────────────────────────────────────────────────────────

export function useFermentationData(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["fermentation", sessionId],
    queryFn: () =>
      api.get<FermentationDataPoint[]>(
        `/v1/fermentation/${sessionId}/data`
      ),
    enabled: !!sessionId,
    refetchInterval: 60_000,
  });
}

export function useAddFermentationPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...data
    }: { sessionId: string } & Partial<FermentationDataPoint>) =>
      api.post<FermentationDataPoint>(
        `/v1/fermentation/${sessionId}/data`,
        data
      ),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["fermentation", vars.sessionId] }),
  });
}
