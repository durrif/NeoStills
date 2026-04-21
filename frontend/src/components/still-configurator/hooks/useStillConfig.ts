import { create } from 'zustand'
import type { StillType } from '@/lib/types'

export interface StillConfiguratorComponents {
  dephlegmator: boolean
  ginBasket: boolean
  parrot: boolean
  condenserType: 'shell_tube' | 'coil'
  columnPlates: number
}

export interface StillConfiguratorState {
  type: StillType
  capacityLiters: number
  material: 'copper' | 'stainless' | 'mixed'
  heaterType: 'gas' | 'electric' | 'steam'
  components: StillConfiguratorComponents
  setType: (type: StillType) => void
  setCapacityLiters: (capacityLiters: number) => void
  setMaterial: (material: 'copper' | 'stainless' | 'mixed') => void
  setHeaterType: (heaterType: 'gas' | 'electric' | 'steam') => void
  setComponent: <K extends keyof StillConfiguratorComponents>(key: K, value: StillConfiguratorComponents[K]) => void
  reset: (initial?: Partial<StillConfiguratorSnapshot>) => void
  toSaveable: () => StillConfiguratorSnapshot
}

export interface StillConfiguratorSnapshot {
  type: StillType
  capacity_liters: number
  material: 'copper' | 'stainless' | 'mixed'
  heater_type: 'gas' | 'electric' | 'steam'
  components: {
    dephlegmator: boolean
    gin_basket: boolean
    parrot: boolean
    condenser_type: 'shell_tube' | 'coil'
    column_plates: number
  }
}

const DEFAULT_STATE = {
  type: 'pot_still' as StillType,
  capacityLiters: 120,
  material: 'copper' as const,
  heaterType: 'gas' as const,
  components: {
    dephlegmator: false,
    ginBasket: false,
    parrot: true,
    condenserType: 'shell_tube' as const,
    columnPlates: 4,
  },
}

export const useStillConfig = create<StillConfiguratorState>((set, get) => ({
  ...DEFAULT_STATE,
  setType: (type) => set({ type }),
  setCapacityLiters: (capacityLiters) => set({ capacityLiters }),
  setMaterial: (material) => set({ material }),
  setHeaterType: (heaterType) => set({ heaterType }),
  setComponent: (key, value) =>
    set((state) => ({
      components: {
        ...state.components,
        [key]: value,
      },
    })),
  reset: (initial) =>
    set({
      type: initial?.type ?? DEFAULT_STATE.type,
      capacityLiters: initial?.capacity_liters ?? DEFAULT_STATE.capacityLiters,
      material: initial?.material ?? DEFAULT_STATE.material,
      heaterType: initial?.heater_type ?? DEFAULT_STATE.heaterType,
      components: {
        dephlegmator: initial?.components?.dephlegmator ?? DEFAULT_STATE.components.dephlegmator,
        ginBasket: initial?.components?.gin_basket ?? DEFAULT_STATE.components.ginBasket,
        parrot: initial?.components?.parrot ?? DEFAULT_STATE.components.parrot,
        condenserType: initial?.components?.condenser_type ?? DEFAULT_STATE.components.condenserType,
        columnPlates: initial?.components?.column_plates ?? DEFAULT_STATE.components.columnPlates,
      },
    }),
  toSaveable: () => {
    const state = get()
    return {
      type: state.type,
      capacity_liters: state.capacityLiters,
      material: state.material,
      heater_type: state.heaterType,
      components: {
        dephlegmator: state.components.dephlegmator,
        gin_basket: state.components.ginBasket,
        parrot: state.components.parrot,
        condenser_type: state.components.condenserType,
        column_plates: state.components.columnPlates,
      },
    }
  },
}))
