// src/components/keezer/config-wizard.tsx — Keezer Configuration Wizard
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Check, Thermometer,
  Gauge, Droplets, Settings, Wifi, X,
} from 'lucide-react'
import { KEG_CATALOG } from '@/data/kegs'
import { useKeezerStore, type KeezerType, type KeezerConfig } from '@/stores/keezer-store'

/* ── Step data ──────────────────────────────────────────────────────────────── */

const KEEZER_TYPES: { id: KeezerType; label: string; desc: string; icon: string }[] = [
  { id: 'chest_freezer', label: 'Cámara fría con líneas', icon: '🧊', desc: 'Arcón o armario refrigerado con líneas de servicio o muestreo' },
  { id: 'fridge_tower', label: 'Nevera con columna', icon: '🗼', desc: 'Nevera vertical con columna superior para servicio controlado' },
  { id: 'jockey_box', label: 'Estación portátil', icon: '📦', desc: 'Módulo portátil para eventos, muestras o servicio temporal' },
  { id: 'custom', label: 'Personalizado', icon: '🔧', desc: 'Configuración a medida para setups únicos' },
]

const TAP_OPTIONS = [1, 2, 3, 4, 5, 6, 8]

/* ── Wizard ──────────────────────────────────────────────────────────────────── */

interface WizardProps {
  onClose: () => void
}

export default function KeezerConfigWizard({ onClose }: WizardProps) {
  const { config, setConfig } = useKeezerStore()

  const [step, setStep] = useState(0)
  const [keezerType, setKeezerType] = useState<KeezerType>(config.type)
  const [tapCount, setTapCount] = useState(config.tapCount)
  const [tapKegTypes, setTapKegTypes] = useState<(string | null)[]>(
    () => config.tapKegTypes.length >= config.tapCount
      ? config.tapKegTypes
      : Array.from({ length: 8 }, (_, i) => config.tapKegTypes[i] ?? 'corny-19')
  )
  const [hasFlowMeter, setHasFlowMeter] = useState(config.hasFlowMeter)
  const [hasTempSensor, setHasTempSensor] = useState(config.hasTempSensor)
  const [hasPressureSensor, setHasPressureSensor] = useState(config.hasPressureSensor)

  const steps = ['Tipo de instalación', 'Número de líneas', 'Tipo de recipiente', 'Sensores']
  const totalSteps = steps.length

  const canNext = step < totalSteps - 1
  const canFinish = step === totalSteps - 1

  const handleFinish = () => {
    const newConfig: KeezerConfig = {
      type: keezerType,
      tapCount,
      tapKegTypes: tapKegTypes.slice(0, tapCount),
      hasFlowMeter,
      hasTempSensor,
      hasPressureSensor,
      configured: true,
    }
    setConfig(newConfig)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl glass-card rounded-2xl overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] text-text-tertiary hover:text-text-secondary transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center">
              <Settings size={20} className="text-accent-amber" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary font-display">
                Configurar Aging Room
              </h2>
              <p className="text-xs text-text-tertiary">
                Paso {step + 1} de {totalSteps} — {steps[step]}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-amber"
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 pb-4 min-h-[280px]">
          <AnimatePresence mode="wait">
            {/* Step 0: Keezer Type */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                {KEEZER_TYPES.map((kt) => (
                  <button
                    key={kt.id}
                    onClick={() => setKeezerType(kt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      keezerType === kt.id
                        ? 'bg-accent-amber/10 border-accent-amber/30'
                        : 'bg-white/[0.02] border-border-subtle hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-2xl">{kt.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${
                        keezerType === kt.id ? 'text-accent-amber' : 'text-text-primary'
                      }`}>
                        {kt.label}
                      </p>
                      <p className="text-xs text-text-tertiary">{kt.desc}</p>
                    </div>
                    {keezerType === kt.id && (
                      <Check size={16} className="text-accent-amber ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Step 1: Tap Count */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="text-sm text-text-secondary mb-4">
                  ¿Cuántas líneas de servicio o muestreo tiene tu sala?
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {TAP_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setTapCount(n)}
                      className={`aspect-square rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                        tapCount === n
                          ? 'bg-accent-amber/15 border-accent-amber/40 text-accent-amber'
                          : 'bg-white/[0.02] border-border-subtle text-text-secondary hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-2xl font-bold font-display">{n}</span>
                      <span className="text-[10px] mt-0.5">
                        {n === 1 ? 'línea' : 'líneas'}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Keg Type per Tap */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-sm text-text-secondary mb-2">
                  Selecciona el tipo de recipiente para cada línea:
                </p>
                <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                  {Array.from({ length: tapCount }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent-amber/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-accent-amber">{i + 1}</span>
                      </div>
                      <select
                        value={tapKegTypes[i] ?? 'corny-19'}
                        onChange={(e) => {
                          const next = [...tapKegTypes]
                          next[i] = e.target.value
                          setTapKegTypes(next)
                        }}
                        className="flex-1 bg-white/[0.03] border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-amber/40"
                      >
                        {KEG_CATALOG.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name} ({k.capacity_liters}L · {k.connector.replace('_', ' ')})
                          </option>
                        ))}
                        <option value="">Vacío / Sin barril</option>
                      </select>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Sensors */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-sm text-text-secondary mb-2">
                  ¿Qué sensores tienes instalados? (opcional)
                </p>
                {[
                  { key: 'flow', label: 'Caudalímetro (Flow Meter)', desc: 'Mide el volumen de cada salida automáticamente', icon: Droplets, color: '#42A5F5', checked: hasFlowMeter, toggle: () => setHasFlowMeter(!hasFlowMeter) },
                  { key: 'temp', label: 'Sensor de temperatura', desc: 'Monitoriza la temperatura interior del Aging Room', icon: Thermometer, color: '#7CB342', checked: hasTempSensor, toggle: () => setHasTempSensor(!hasTempSensor) },
                  { key: 'pressure', label: 'Sensor de presión', desc: 'Monitoriza la presión de cada línea o recipiente', icon: Gauge, color: '#B87333', checked: hasPressureSensor, toggle: () => setHasPressureSensor(!hasPressureSensor) },
                ].map((sensor) => (
                  <button
                    key={sensor.key}
                    onClick={sensor.toggle}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      sensor.checked
                        ? 'bg-white/[0.04] border-white/[0.15]'
                        : 'bg-white/[0.02] border-border-subtle'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${sensor.color}15` }}
                    >
                      <sensor.icon size={18} style={{ color: sensor.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{sensor.label}</p>
                      <p className="text-xs text-text-tertiary">{sensor.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      sensor.checked
                        ? 'bg-accent-amber text-bg-deep'
                        : 'border border-border-subtle'
                    }`}>
                      {sensor.checked && <Check size={12} />}
                    </div>
                  </button>
                ))}

                {/* IoT hint */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 mt-4">
                  <Wifi size={14} className="text-blue-400 shrink-0" />
                  <p className="text-xs text-text-secondary">
                    Los sensores se configuran desde Dispositivos. Aquí solo indicamos qué hardware está presente.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: navigation buttons */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-border-subtle">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <ChevronLeft size={14} />
            {step > 0 ? 'Anterior' : 'Cancelar'}
          </button>

          {canNext && (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-accent-amber/15 text-accent-amber hover:bg-accent-amber/25 transition-colors"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          )}

          {canFinish && (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-accent-amber text-bg-deep hover:bg-accent-amber/90 transition-colors"
            >
              <Check size={14} />
              Finalizar
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
