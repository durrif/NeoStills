import { create } from 'zustand'
import { api } from '@/lib/api'
import type { StillType, UsageType } from '@/lib/types'

export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface OnboardingStillConfig {
  id: string
  name: string
  type: StillType
  capacityLiters: number
  material: 'copper' | 'stainless' | 'mixed'
  heaterType?: 'gas' | 'electric' | 'steam'
  hasDephlegmator?: boolean
  hasGinBasket?: boolean
  hasParrot?: boolean
  condenserType?: 'shell_tube' | 'coil'
  notes?: string
  locationZone?: string
}

export interface OnboardingFermenterConfig {
  id: string
  name: string
  capacityLiters: number
  hasTemperatureControl: boolean
  locationZone?: string
}

export interface IoTDeviceConfig {
  id: string
  name: string
  deviceType: string
  protocol: 'wifi' | 'ble' | 'zigbee' | 'lorawan' | 'mqtt'
  enabled: boolean
}

interface OnboardingState {
  currentStep: 1 | 2 | 3 | 4 | 5
  stepStatus: Record<1 | 2 | 3 | 4 | 5, StepStatus>
  completedSteps: number[]
  skippedSteps: number[]

  profile: {
    type: UsageType
    units: 'metric' | 'imperial'
    language: 'es' | 'en'
  }

  facility: {
    name: string
    location: string
    dimensions?: {
      width_m: number
      depth_m: number
      height_m: number
    }
    zones: string[]
  }

  stills: OnboardingStillConfig[]
  fermenters: OnboardingFermenterConfig[]

  firstData: {
    waterProfileId: string
    starterPack: 'none' | 'whiskey' | 'gin' | 'rum'
    firstRecipeTemplate: string
  }

  iot: {
    hubEnabled: boolean
    connectedDevices: IoTDeviceConfig[]
  }

  setProfile: (patch: Partial<OnboardingState['profile']>) => void
  setFacility: (patch: Partial<OnboardingState['facility']>) => void
  addStill: (still: Omit<OnboardingStillConfig, 'id'>) => void
  updateStill: (id: string, patch: Partial<OnboardingStillConfig>) => void
  removeStill: (id: string) => void
  addFermenter: (fermenter: Omit<OnboardingFermenterConfig, 'id'>) => void
  updateFermenter: (id: string, patch: Partial<OnboardingFermenterConfig>) => void
  removeFermenter: (id: string) => void
  setFirstData: (patch: Partial<OnboardingState['firstData']>) => void
  setIot: (patch: Partial<OnboardingState['iot']>) => void
  addDevice: (device: Omit<IoTDeviceConfig, 'id'>) => void
  removeDevice: (id: string) => void

  goToStep: (step: 1 | 2 | 3 | 4 | 5) => void
  completeStep: (step: 1 | 2 | 3 | 4 | 5) => void
  skipStep: (step: 3 | 4) => void
  validateStep: (step: 1 | 2 | 3 | 4 | 5) => { valid: boolean; errors: string[] }

  hydrateFromProfile: (payload: {
    usageType?: UsageType
    distilleryName?: string | null
    location?: string | null
    stillType?: StillType | null
    stillCapacity?: number | null
    spaceDimensions?: { width_m: number; depth_m: number; height_m: number } | null
  }) => void

  submitOnboarding: () => Promise<void>
  reset: () => void
}

const INITIAL_STEP_STATUS: Record<1 | 2 | 3 | 4 | 5, StepStatus> = {
  1: 'active',
  2: 'pending',
  3: 'pending',
  4: 'pending',
  5: 'pending',
}

const DEFAULT_STATE = {
  currentStep: 1 as const,
  stepStatus: INITIAL_STEP_STATUS,
  completedSteps: [] as number[],
  skippedSteps: [] as number[],
  profile: {
    type: 'home' as UsageType,
    units: 'metric' as const,
    language: 'es' as const,
  },
  facility: {
    name: '',
    location: '',
    dimensions: undefined,
    zones: ['produccion', 'fermentacion', 'destilacion', 'aging_room', 'bottling'],
  },
  stills: [] as OnboardingStillConfig[],
  fermenters: [] as OnboardingFermenterConfig[],
  firstData: {
    waterProfileId: 'neutral',
    starterPack: 'none' as const,
    firstRecipeTemplate: 'starter-whiskey',
  },
  iot: {
    hubEnabled: false,
    connectedDevices: [] as IoTDeviceConfig[],
  },
}

function nextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function setActiveStepStatus(step: 1 | 2 | 3 | 4 | 5, prev: Record<1 | 2 | 3 | 4 | 5, StepStatus>) {
  return {
    1: step === 1 ? 'active' : prev[1] === 'completed' || prev[1] === 'skipped' ? prev[1] : 'pending',
    2: step === 2 ? 'active' : prev[2] === 'completed' || prev[2] === 'skipped' ? prev[2] : 'pending',
    3: step === 3 ? 'active' : prev[3] === 'completed' || prev[3] === 'skipped' ? prev[3] : 'pending',
    4: step === 4 ? 'active' : prev[4] === 'completed' || prev[4] === 'skipped' ? prev[4] : 'pending',
    5: step === 5 ? 'active' : prev[5] === 'completed' || prev[5] === 'skipped' ? prev[5] : 'pending',
  } as Record<1 | 2 | 3 | 4 | 5, StepStatus>
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...DEFAULT_STATE,

  setProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),

  setFacility: (patch) => set((state) => ({ facility: { ...state.facility, ...patch } })),

  addStill: (still) =>
    set((state) => ({
      stills: [...state.stills, { ...still, id: nextId('still') }],
    })),

  updateStill: (id, patch) =>
    set((state) => ({
      stills: state.stills.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  removeStill: (id) =>
    set((state) => ({
      stills: state.stills.filter((item) => item.id !== id),
    })),

  addFermenter: (fermenter) =>
    set((state) => ({
      fermenters: [...state.fermenters, { ...fermenter, id: nextId('fermenter') }],
    })),

  updateFermenter: (id, patch) =>
    set((state) => ({
      fermenters: state.fermenters.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  removeFermenter: (id) =>
    set((state) => ({
      fermenters: state.fermenters.filter((item) => item.id !== id),
    })),

  setFirstData: (patch) => set((state) => ({ firstData: { ...state.firstData, ...patch } })),

  setIot: (patch) => set((state) => ({ iot: { ...state.iot, ...patch } })),

  addDevice: (device) =>
    set((state) => ({
      iot: {
        ...state.iot,
        connectedDevices: [...state.iot.connectedDevices, { ...device, id: nextId('device') }],
      },
    })),

  removeDevice: (id) =>
    set((state) => ({
      iot: {
        ...state.iot,
        connectedDevices: state.iot.connectedDevices.filter((device) => device.id !== id),
      },
    })),

  goToStep: (step) =>
    set((state) => ({
      currentStep: step,
      stepStatus: setActiveStepStatus(step, state.stepStatus),
    })),

  completeStep: (step) =>
    set((state) => {
      const nextStep = step < 5 ? ((step + 1) as 1 | 2 | 3 | 4 | 5) : 5
      const completedSteps = state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step]

      const nextStatus = { ...state.stepStatus, [step]: 'completed' as StepStatus }
      return {
        completedSteps,
        currentStep: nextStep,
        stepStatus: setActiveStepStatus(nextStep, nextStatus),
      }
    }),

  skipStep: (step) =>
    set((state) => {
      const nextStep = step < 5 ? ((step + 1) as 1 | 2 | 3 | 4 | 5) : 5
      const skippedSteps = state.skippedSteps.includes(step)
        ? state.skippedSteps
        : [...state.skippedSteps, step]
      const nextStatus = { ...state.stepStatus, [step]: 'skipped' as StepStatus }
      return {
        skippedSteps,
        currentStep: nextStep,
        stepStatus: setActiveStepStatus(nextStep, nextStatus),
      }
    }),

  validateStep: (step) => {
    const state = get()
    const errors: string[] = []

    if (step === 1) {
      if (!state.profile.type) {
        errors.push('Debes seleccionar un perfil de operación')
      }
    }

    if (step === 2) {
      // facility.name is optional — user can fill it later
      if (state.stills.length < 1) {
        errors.push('Debes configurar al menos 1 alambique')
      }
      const invalidStill = state.stills.some((still) => !still.capacityLiters || still.capacityLiters <= 0)
      if (invalidStill) {
        errors.push('Todos los alambiques deben tener capacidad válida')
      }
      // Dimensions are optional in step 2 — craft distillery users can fill them later
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  hydrateFromProfile: (payload) =>
    set((state) => {
      const stills = [...state.stills]
      if (stills.length === 0 && payload.stillType && payload.stillCapacity) {
        stills.push({
          id: nextId('still'),
          name: 'Alambique principal',
          type: payload.stillType,
          capacityLiters: payload.stillCapacity,
          material: 'copper',
        })
      }

      return {
        profile: {
          ...state.profile,
          type: payload.usageType ?? state.profile.type,
        },
        facility: {
          ...state.facility,
          name: payload.distilleryName ?? state.facility.name,
          location: payload.location ?? state.facility.location,
          dimensions: payload.spaceDimensions ?? state.facility.dimensions,
        },
        stills,
      }
    }),

  submitOnboarding: async () => {
    const state = get()
    const primaryStill = state.stills[0]

    if (!primaryStill) {
      throw new Error('No hay alambique configurado')
    }

    await api.post('/v1/onboarding/setup', {
      usage_type: state.profile.type,
      distillery_name: state.facility.name.trim(),
      location: state.facility.location.trim() || null,
      still_type: primaryStill.type,
      still_capacity_liters: primaryStill.capacityLiters,
      space_dimensions: state.profile.type === 'professional' ? state.facility.dimensions ?? null : null,
      water_profile_id: state.firstData.waterProfileId,
      starter_pack: state.firstData.starterPack,
      additional_stills: state.stills.slice(1).map((still) => ({
        name: still.name,
        still_type: still.type,
        capacity_liters: still.capacityLiters,
        material: still.material,
        location_zone: still.locationZone ?? null,
      })),
      fermenters: state.fermenters.map((fermenter) => ({
        name: fermenter.name,
        capacity_liters: fermenter.capacityLiters,
        has_temperature_control: fermenter.hasTemperatureControl,
        location_zone: fermenter.locationZone ?? null,
      })),
      iot_devices: state.iot.connectedDevices,
      iot_hub_enabled: state.iot.hubEnabled,
    })
  },

  reset: () => set(DEFAULT_STATE),
}))
