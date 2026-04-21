import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Beaker,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Droplets,
  Factory,
  FlaskConical,
  Plus,
  Radio,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Logo } from '@/components/ui/logo'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Brewery, OnboardingStatus, StillType, User, UsageType } from '@/lib/types'
import { WATER_PROFILES } from '@/data/water-profiles'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/stores/onboarding-store'

const StillConfigurator3D = lazy(() => import('@/components/still-configurator/StillConfigurator3D'))

const STEP_IDS = [1, 2, 3, 4, 5] as const

const stepMeta: Record<(typeof STEP_IDS)[number], { title: string; description: string }> = {
  1: { title: 'Perfil de operación', description: 'Selecciona tu modo de trabajo' },
  2: { title: 'Equipo y espacio', description: 'Configura alambiques, fermentadores y nave' },
  3: { title: 'Primeros datos', description: 'Agua local, starter pack y receta base' },
  4: { title: 'Integraciones IoT', description: 'Añade sensores y dispositivos opcionales' },
  5: { title: 'Revisión final', description: 'Confirma el snapshot operativo' },
}

const stillTypeOptions: Array<{ value: StillType; label: string }> = [
  { value: 'pot_still', label: 'Pot still' },
  { value: 'column_still', label: 'Column still' },
  { value: 'reflux_still', label: 'Reflux still' },
  { value: 'alembic', label: 'Alambique clásico' },
  { value: 'other', label: 'Otro' },
]

function StepPill({ step, currentStep, status, title }: {
  step: number
  currentStep: number
  status: 'pending' | 'active' | 'completed' | 'skipped'
  title: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 transition-all',
        currentStep === step && 'border-accent-amber/50 bg-accent-amber/12',
        status === 'completed' && 'border-status-success/40 bg-status-success/10',
        status === 'skipped' && 'border-status-warning/40 bg-status-warning/10',
        status === 'pending' && currentStep !== step && 'border-white/10 bg-white/[0.03]'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.24em] text-text-tertiary">Paso 0{step}</p>
        {status === 'completed' && <Check size={14} className="text-status-success" />}
      </div>
      <p className="mt-2 text-sm font-medium text-text-primary">{title}</p>
    </div>
  )
}

export default function OnboardingPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const authStore = useAuthStore()

  const {
    currentStep,
    stepStatus,
    profile,
    facility,
    stills,
    fermenters,
    firstData,
    iot,
    setProfile,
    setFacility,
    addStill,
    removeStill,
    addFermenter,
    removeFermenter,
    setFirstData,
    setIot,
    addDevice,
    removeDevice,
    goToStep,
    completeStep,
    skipStep,
    validateStep,
    hydrateFromProfile,
    submitOnboarding,
  } = useOnboardingStore()

  const [bootstrapped, setBootstrapped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stillConfiguratorOpen, setStillConfiguratorOpen] = useState(false)

  const [stillName, setStillName] = useState('')
  const [stillType, setStillType] = useState<StillType>('pot_still')
  const [stillCapacity, setStillCapacity] = useState('50')
  const [stillMaterial, setStillMaterial] = useState<'copper' | 'stainless' | 'mixed'>('copper')

  const [fermenterName, setFermenterName] = useState('')
  const [fermenterCapacity, setFermenterCapacity] = useState('120')

  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState('iSpindel')
  const [deviceProtocol, setDeviceProtocol] = useState<'wifi' | 'ble' | 'zigbee' | 'lorawan' | 'mqtt'>('wifi')

  useEffect(() => {
    if (bootstrapped) return
    hydrateFromProfile({
      usageType: authStore.onboardingStatus?.usage_type ?? authStore.brewery?.usage_type,
      distilleryName: authStore.onboardingStatus?.distillery_name ?? authStore.brewery?.name,
      location: authStore.onboardingStatus?.location ?? authStore.brewery?.location,
      stillType: authStore.onboardingStatus?.still_type ?? authStore.brewery?.still_type,
      stillCapacity: authStore.onboardingStatus?.still_capacity_liters ?? authStore.brewery?.still_capacity_liters,
      spaceDimensions: authStore.onboardingStatus?.space_dimensions ?? authStore.brewery?.space_dimensions,
    })
    setBootstrapped(true)
  }, [authStore.brewery, authStore.onboardingStatus, bootstrapped, hydrateFromProfile])

  const validation = useMemo(() => validateStep(currentStep), [currentStep, validateStep, stills, facility, profile])

  const canGoBack = currentStep > 1 && !saving
  // Step 2: button is clickable even with empty stills if facility name + capacity are present
  // (goNext will auto-register the still before validating)
  const hasPendingStillData =
    currentStep === 2 &&
    stills.length === 0 &&
    Number(stillCapacity) > 0
  const canContinue = (validation.valid || hasPendingStillData) && !saving
  const canSkip = (currentStep === 3 || currentStep === 4) && !saving

  const addStillHandler = () => {
    const capacity = Number(stillCapacity)
    if (!stillName.trim() || !capacity || capacity <= 0) {
      toast.error('Nombre y capacidad validos son obligatorios para el alambique')
      return
    }
    addStill({
      name: stillName.trim(),
      type: stillType,
      capacityLiters: capacity,
      material: stillMaterial,
      heaterType: 'gas',
      hasParrot: true,
      condenserType: 'shell_tube',
      locationZone: facility.zones[0],
    })
    setStillName('')
    setStillCapacity('50')
  }

  const addFermenterHandler = () => {
    const capacity = Number(fermenterCapacity)
    if (!fermenterName.trim() || !capacity || capacity <= 0) {
      toast.error('Nombre y capacidad validos son obligatorios para el fermentador')
      return
    }
    addFermenter({
      name: fermenterName.trim(),
      capacityLiters: capacity,
      hasTemperatureControl: true,
      locationZone: facility.zones[1] ?? facility.zones[0],
    })
    setFermenterName('')
    setFermenterCapacity('120')
  }

  const addDeviceHandler = () => {
    if (!deviceName.trim()) {
      toast.error('Debes indicar un nombre de dispositivo')
      return
    }
    addDevice({
      name: deviceName.trim(),
      deviceType,
      protocol: deviceProtocol,
      enabled: true,
    })
    setDeviceName('')
  }

  const goNext = async () => {
    if (currentStep < 5) {
      // Step 2: auto-add still if form has capacity but no stills registered yet.
      // Zustand addStill() is synchronous, so validateStep() below will see the new item.
      if (currentStep === 2 && stills.length === 0 && Number(stillCapacity) > 0) {
        const autoName =
          stillName.trim() ||
          `${stillTypeOptions.find((o) => o.value === stillType)?.label ?? 'Alambique'} principal`
        addStill({
          name: autoName,
          type: stillType,
          capacityLiters: Number(stillCapacity),
          material: stillMaterial,
          heaterType: 'gas',
          hasParrot: true,
          condenserType: 'shell_tube',
          locationZone: facility.zones[0],
        })
        setStillName('')
        setStillCapacity('50')
      }
      // Re-read validation from store after the possible auto-add (get() is synchronous)
      const freshValidation = validateStep(currentStep)
      if (!freshValidation.valid) {
        toast.error(freshValidation.errors[0] ?? 'Revisa los campos requeridos')
        return
      }
      completeStep(currentStep)
      return
    }

    setSaving(true)
    try {
      await submitOnboarding()

      const [authData, status] = await Promise.all([
        api.get<{ user: User; brewery: Brewery | null }>('/v1/auth/me/full'),
        api.get<OnboardingStatus>('/v1/onboarding/status'),
      ])

      useAuthStore.setState({
        user: authData.user,
        brewery: authData.brewery ?? null,
        onboardingStatus: status,
        onboardingLoaded: true,
      })

      toast.success('Onboarding completado. Bienvenido al panel de NeoStills.')
      void navigate({ to: '/' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.server_error'))
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    if (currentStep <= 1) return
    goToStep((currentStep - 1) as 1 | 2 | 3 | 4 | 5)
  }

  const addStillFromConfigurator = (still: Parameters<typeof addStill>[0]) => {
    addStill({
      ...still,
      name: still.name.trim() || stillName.trim() || `Pot still ${stills.length + 1}`,
      locationZone: still.locationZone ?? facility.zones[0],
    })
    setStillName('')
    setStillCapacity('50')
    setStillType('pot_still')
    setStillMaterial('copper')
    setStillConfiguratorOpen(false)
    toast.success('Alambique 3D añadido al snapshot operativo')
  }

  return (
    <div className="min-h-dvh bg-bg-primary text-text-primary">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 system-background--main" />
        <div className="absolute inset-0 system-background--schematic opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Logo size="lg" showTagline className="drop-shadow-[0_0_18px_rgba(212,149,107,0.22)]" />
          <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-text-secondary md:flex md:items-center md:gap-2">
            <ShieldCheck size={14} className="text-accent-amber" />
            Wizard NeoStills v2 · Parte 2
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="glass-card rounded-[2rem] border border-white/10 px-6 py-7 shadow-glass lg:px-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-6 border-b border-white/8 pb-6">
              <div className="max-w-2xl">
                <p className="system-kicker">Onboarding operativo</p>
                <h1 className="system-heading mt-3 text-3xl lg:text-4xl">Wizard lineal de 5 pasos</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary lg:text-base">
                  Cada paso valida requisitos minimos y actualiza el snapshot lateral en tiempo real.
                </p>
              </div>
              <div className="rounded-2xl border border-accent-copper/30 bg-accent-copper/10 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.24em] text-accent-amber-bright">Progreso</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">0{currentStep}/05</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {STEP_IDS.map((step) => (
                <button
                  type="button"
                  key={step}
                  onClick={() => {
                    if (step <= currentStep || stepStatus[step] === 'completed' || stepStatus[step] === 'skipped') {
                      goToStep(step)
                    }
                  }}
                  className="text-left"
                >
                  <StepPill
                    step={step}
                    currentStep={currentStep}
                    status={stepStatus[step]}
                    title={stepMeta[step].title}
                  />
                </button>
              ))}
            </div>

            <div className="mt-8 min-h-[32rem]">
              {currentStep === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      {
                        type: 'home' as UsageType,
                        title: 'Homedistiller',
                        description: 'Setup simplificado: alambique principal y flujo rápido para lotes caseros.',
                        icon: Beaker,
                      },
                      {
                        type: 'professional' as UsageType,
                        title: 'Craft distillery',
                        description: 'Setup completo con nave, zonas y múltiples equipos de producción.',
                        icon: Building2,
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon
                    const selected = profile.type === option.type
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => setProfile({ type: option.type })}
                        className={cn(
                          'rounded-[1.75rem] border p-5 text-left transition-all',
                          selected
                            ? 'border-accent-amber/40 bg-gradient-to-br from-accent-amber/18 via-accent-copper/12 to-transparent'
                            : 'border-white/8 bg-white/[0.03] hover:border-accent-cobalt/30 hover:bg-white/[0.05]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
                            <Icon size={22} className={selected ? 'text-accent-amber' : 'text-accent-cyan'} />
                          </div>
                          {selected && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-amber text-bg-primary">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                        <h2 className="mt-5 text-xl font-semibold text-text-primary">{option.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{option.description}</p>
                      </button>
                    )
                  })}
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">Nombre de destileria</span>
                      <input
                        value={facility.name}
                        onChange={(event) => setFacility({ name: event.target.value })}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-amber/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">Ubicación</span>
                      <input
                        value={facility.location}
                        onChange={(event) => setFacility({ location: event.target.value })}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-amber/40"
                      />
                    </label>
                  </div>

                  {profile.type === 'professional' && (
                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                      <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
                        <Factory size={14} /> Dimensiones de nave (m)
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        {(
                          [
                            { key: 'width_m', label: 'Ancho' },
                            { key: 'depth_m', label: 'Fondo' },
                            { key: 'height_m', label: 'Alto' },
                          ] as const
                        ).map((item) => (
                          <label key={item.key} className="space-y-2">
                            <span className="text-xs text-text-tertiary">{item.label}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={facility.dimensions?.[item.key] ?? ''}
                              onChange={(event) => {
                                const value = Number(event.target.value)
                                setFacility({
                                  dimensions: {
                                    width_m: facility.dimensions?.width_m ?? 0,
                                    depth_m: facility.dimensions?.depth_m ?? 0,
                                    height_m: facility.dimensions?.height_m ?? 0,
                                    [item.key]: Number.isFinite(value) ? value : 0,
                                  },
                                })
                              }}
                              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
                      <Beaker size={14} /> Alambiques ({stills.length})
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <input
                        value={stillName}
                        onChange={(event) => setStillName(event.target.value)}
                        placeholder="Nombre"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      />
                      <select
                        value={stillType}
                        onChange={(event) => setStillType(event.target.value as StillType)}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      >
                        {stillTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={stillCapacity}
                        onChange={(event) => setStillCapacity(event.target.value)}
                        placeholder="Capacidad (L)"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      />
                      <button type="button" onClick={addStillHandler} className="rounded-2xl bg-amber-gradient px-3 py-2 text-sm font-semibold text-bg-primary">
                        <span className="inline-flex items-center gap-2"><Plus size={14} /> Añadir</span>
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setStillConfiguratorOpen(true)}
                        className="rounded-2xl border border-accent-copper/35 bg-accent-copper/10 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent-copper/60"
                      >
                        Abrir configurador 3D
                      </button>
                      <p className="text-xs leading-5 text-text-secondary">
                        MVP activo: pot still con cobre/inox, condensador, gin basket y parrot. El alta rápida sigue disponible como fallback.
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {stills.length === 0 && <p className="text-sm text-text-secondary">Aun no hay alambiques configurados.</p>}
                      {stills.map((still) => (
                        <div key={still.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-sm text-text-primary">{still.name} · {still.type} · {still.capacityLiters} L{still.hasGinBasket ? ' · gin basket' : ''}{still.hasParrot ? ' · parrot' : ''}</p>
                          <button type="button" onClick={() => removeStill(still.id)} className="text-text-secondary hover:text-status-danger">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
                      <FlaskConical size={14} /> Fermentadores ({fermenters.length})
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={fermenterName}
                        onChange={(event) => setFermenterName(event.target.value)}
                        placeholder="Nombre"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        value={fermenterCapacity}
                        onChange={(event) => setFermenterCapacity(event.target.value)}
                        placeholder="Capacidad (L)"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      />
                      <button type="button" onClick={addFermenterHandler} className="rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-2"><Plus size={14} /> Añadir</span>
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {fermenters.map((fermenter) => (
                        <div key={fermenter.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-sm text-text-primary">{fermenter.name} · {fermenter.capacityLiters} L</p>
                          <button type="button" onClick={() => removeFermenter(fermenter.id)} className="text-text-secondary hover:text-status-danger">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
                      <Droplets size={14} /> Perfil de agua local
                    </div>
                    <div className="grid gap-3">
                      {WATER_PROFILES.map((profileOption) => (
                        <button
                          key={profileOption.id}
                          type="button"
                          onClick={() => setFirstData({ waterProfileId: profileOption.id })}
                          className={cn(
                            'rounded-2xl border p-4 text-left transition-all',
                            firstData.waterProfileId === profileOption.id
                              ? 'border-accent-cobalt/50 bg-accent-cobalt/14'
                              : 'border-white/8 bg-white/[0.03] hover:border-accent-cobalt/30'
                          )}
                        >
                          <p className="font-medium text-text-primary">{profileOption.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">Starter pack</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(
                        [
                          { value: 'none', label: 'Ninguno' },
                          { value: 'whiskey', label: 'Whiskey' },
                          { value: 'gin', label: 'Gin' },
                          { value: 'rum', label: 'Rum' },
                        ] as const
                      ).map((pack) => (
                        <button
                          key={pack.value}
                          type="button"
                          onClick={() => setFirstData({ starterPack: pack.value })}
                          className={cn(
                            'rounded-2xl border p-4 text-left transition-all',
                            firstData.starterPack === pack.value
                              ? 'border-accent-amber/40 bg-accent-amber/12'
                              : 'border-white/8 bg-white/[0.03] hover:border-accent-amber/30'
                          )}
                        >
                          <p className="font-medium text-text-primary">{pack.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
                      <Cpu size={14} /> Hub IoT
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm text-text-primary">
                      <input
                        type="checkbox"
                        checked={iot.hubEnabled}
                        onChange={(event) => setIot({ hubEnabled: event.target.checked })}
                      />
                      Activar integración IoT para lotes en tiempo real
                    </label>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
                      <Radio size={14} /> Dispositivos conectados ({iot.connectedDevices.length})
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <input
                        value={deviceName}
                        onChange={(event) => setDeviceName(event.target.value)}
                        placeholder="Nombre"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      />
                      <input
                        value={deviceType}
                        onChange={(event) => setDeviceType(event.target.value)}
                        placeholder="Tipo"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      />
                      <select
                        value={deviceProtocol}
                        onChange={(event) => setDeviceProtocol(event.target.value as typeof deviceProtocol)}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                      >
                        <option value="wifi">WiFi</option>
                        <option value="mqtt">MQTT</option>
                        <option value="ble">BLE</option>
                        <option value="zigbee">Zigbee</option>
                        <option value="lorawan">LoRaWAN</option>
                      </select>
                      <button type="button" onClick={addDeviceHandler} className="rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-2"><Plus size={14} /> Añadir</span>
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {iot.connectedDevices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-sm text-text-primary">{device.name} · {device.deviceType} · {device.protocol}</p>
                          <button type="button" onClick={() => removeDevice(device.id)} className="text-text-secondary hover:text-status-danger">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-accent-cyan/80">Resumen editable</p>
                    <div className="mt-5 space-y-4 text-sm text-text-secondary">
                      <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-4">
                        <span>Perfil</span>
                        <strong className="text-right font-medium text-text-primary">{profile.type === 'professional' ? 'Craft distillery' : 'Homedistiller'}</strong>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-4">
                        <span>Destilería</span>
                        <strong className="text-right font-medium text-text-primary">{facility.name || '--'}</strong>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-4">
                        <span>Alambiques</span>
                        <strong className="text-right font-medium text-text-primary">{stills.length}</strong>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-4">
                        <span>Fermentadores</span>
                        <strong className="text-right font-medium text-text-primary">{fermenters.length}</strong>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-4">
                        <span>Perfil de agua</span>
                        <strong className="text-right font-medium text-text-primary">{firstData.waterProfileId}</strong>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span>Dispositivos IoT</span>
                        <strong className="text-right font-medium text-text-primary">{iot.connectedDevices.length}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[1.75rem] border border-accent-copper/20 bg-accent-copper/10 p-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-accent-amber-bright">Validación</p>
                      <p className="mt-3 text-sm leading-6 text-text-secondary">
                        El wizard ya cumple la estructura de 5 pasos de la Parte 2. Al finalizar, se persiste en backend y redirige al panel.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={!canGoBack}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all',
                  !canGoBack
                    ? 'cursor-not-allowed border-white/6 bg-white/[0.02] text-text-tertiary'
                    : 'border-white/10 bg-white/[0.04] text-text-primary hover:border-white/20 hover:bg-white/[0.07]'
                )}
              >
                <ChevronLeft size={16} /> Volver
              </button>

              <div className="flex items-center gap-3">
                {canSkip && (
                  <button
                    type="button"
                    onClick={() => skipStep(currentStep as 3 | 4)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm font-medium text-status-warning"
                  >
                    Omitir paso
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={!canContinue}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-bg-primary transition-all',
                    !canContinue
                      ? 'cursor-not-allowed bg-white/20 text-text-secondary'
                      : 'bg-amber-gradient hover:shadow-glow active:scale-[0.99]'
                  )}
                >
                  {currentStep === 5 ? (saving ? 'Guardando...' : 'Entrar al panel') : 'Continuar'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="space-y-6"
          >
            <div className="tech-panel rounded-[2rem] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-accent-cyan/80">Snapshot operativo</p>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Estado del onboarding</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">Resumen en tiempo real de decisiones críticas del setup.</p>
              <div className="mt-6 space-y-3">
                {STEP_IDS.map((step) => (
                  <StepPill
                    key={`snapshot-${step}`}
                    step={step}
                    currentStep={currentStep}
                    status={stepStatus[step]}
                    title={stepMeta[step].title}
                  />
                ))}
              </div>
            </div>

            <div className="glass-card rounded-[2rem] border border-white/10 p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-tertiary">Métricas actuales</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-text-tertiary">Perfil</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{profile.type === 'professional' ? 'Craft distillery' : 'Homedistiller'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-text-tertiary">Alambiques</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{stills.length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-text-tertiary">Fermentadores</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{fermenters.length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-text-tertiary">IoT</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{iot.connectedDevices.length} dispositivos</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      <Modal
        open={stillConfiguratorOpen}
        onClose={() => setStillConfiguratorOpen(false)}
        title="Configurador 3D de alambique"
        description="Pot still MVP con carga diferida. El render se monta solo al abrir este modal."
        size="xl"
        className="max-w-6xl"
      >
        <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-text-secondary">Cargando configurador 3D...</div>}>
          <StillConfigurator3D
            initialValue={{
              name: stillName,
              type: stillType,
              capacityLiters: Number(stillCapacity) || 50,
              material: stillMaterial,
            }}
            onSave={addStillFromConfigurator}
          />
        </Suspense>
      </Modal>
    </div>
  )
}
