import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { type LucideIcon, Droplets, RotateCcw, Beaker, FlaskConical, Activity } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useWaterStore } from '@/stores/water-store'
import { WATER_PROFILES } from '@/data/water-profiles'
import { WaterProfileSelector } from '@/components/water/water-profile-selector'
import { SaltAdditions } from '@/components/water/salt-additions'
import { ClSO4Ratio } from '@/components/water/cl-so4-ratio'
import { MashPHEstimator } from '@/components/water/mash-ph-estimator'
import { AcidCalculator } from '@/components/water/acid-calculator'
import { DilutionCalculator } from '@/components/water/dilution-calculator'
import { WaterComparisonChart } from '@/components/water/water-comparison-chart'

const card = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const, delay: i * 0.05 },
})

const LAB_PATTERNS = [
  [0.44, 0.48, 0.52, 0.5, 0.56, 0.54, 0.6],
  [0.3, 0.36, 0.42, 0.48, 0.44, 0.53, 0.58],
  [0.62, 0.58, 0.66, 0.63, 0.68, 0.71, 0.74],
  [0.28, 0.34, 0.39, 0.42, 0.48, 0.46, 0.52],
] as const

const buildSparkline = (pattern: readonly number[], base: number) => {
  const amplitude = Math.max(base, 1.5)
  return pattern.map((value, index) => ({ x: index, v: Number((value * amplitude).toFixed(2)) }))
}

function LabTrend({ id, data, stroke }: { id: string; data: Array<{ x: number; v: number }>; stroke: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function LabMetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent,
  pattern,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  accent: string
  pattern: readonly number[]
}) {
  const numeric = Number.parseFloat(value.replace(',', '.'))
  const trend = buildSparkline(pattern, Number.isFinite(numeric) ? numeric : 4)
  const trendId = `water-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className="metric-card h-full cursor-default">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">{label}</p>
          <div className="mt-3 text-[2.2rem] font-display font-semibold text-text-primary leading-none">{value}</div>
          <p className="mt-2 text-xs text-text-secondary">{note}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl border border-accent-cobalt/18 bg-white/[0.03] flex items-center justify-center shrink-0" style={{ color: accent }}>
          <Icon size={18} />
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-xl border border-accent-cobalt/14 bg-white/[0.02] px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">Tendencia</div>
        <div className="h-10">
          <LabTrend id={trendId} data={trend} stroke={accent} />
        </div>
      </div>
    </div>
  )
}

export default function WaterLabPage() {
  const { t } = useTranslation('common')
  const setActivePage = useUIStore((s) => s.setActivePage)
  const {
    sourceProfileId,
    targetProfileId,
    customSource,
    customTarget,
    mashVolume,
    spargeVolume,
    roFraction,
    targetPH,
    setSourceProfile,
    setTargetProfile,
    setCustomSource,
    setCustomTarget,
    resetAll,
    getAdjustedWater,
    getEstimatedPH,
    getClSO4Ratio,
  } = useWaterStore()

  useEffect(() => {
    setActivePage('water_lab')
  }, [setActivePage])

  const sourceLabel = useMemo(() => {
    if (customSource) return 'Perfil personalizado'
    return WATER_PROFILES.find((profile) => profile.id === sourceProfileId)?.name ?? 'Sin definir'
  }, [customSource, sourceProfileId])

  const targetLabel = useMemo(() => {
    if (customTarget) return 'Perfil personalizado'
    return WATER_PROFILES.find((profile) => profile.id === targetProfileId)?.name ?? 'Sin definir'
  }, [customTarget, targetProfileId])

  const adjusted = getAdjustedWater()
  const estimatedPH = getEstimatedPH()
  const ratio = getClSO4Ratio()
  const totalVolume = mashVolume + spargeVolume

  return (
    <div className="p-4 md:p-6 max-w-[1460px] mx-auto space-y-5">
      <motion.section {...card(0)} className="grid xl:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <p className="system-kicker">LABORATORIO DE AGUA // Ajuste de maceración</p>
          <h1 className="system-heading mt-2">{t('nav.water_lab')}</h1>
          <p className="text-sm text-text-secondary mt-2 max-w-3xl">
            Ajusta química, dilución, sales y pH con una interfaz más cercana a un panel de control que a una calculadora aislada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <span className="system-status-chip">
            <Droplets size={12} /> Origen <span className="text-text-primary">{sourceLabel}</span>
          </span>
          <span className="system-status-chip">
            <Beaker size={12} /> Objetivo <span className="text-text-primary">{targetLabel}</span>
          </span>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all"
          >
            <RotateCcw size={14} /> Reiniciar laboratorio
          </button>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <motion.div {...card(1)}>
          <LabMetricCard label="Volumen total" value={`${totalVolume.toFixed(1)} L`} note="Agua total en proceso" icon={Droplets} accent="#B87333" pattern={LAB_PATTERNS[0]} />
        </motion.div>
        <motion.div {...card(2)}>
          <LabMetricCard label="Mezcla RO" value={`${Math.round(roFraction * 100)}%`} note="Dilución con agua destilada" icon={FlaskConical} accent="#5F7EA6" pattern={LAB_PATTERNS[1]} />
        </motion.div>
        <motion.div {...card(3)}>
          <LabMetricCard label="pH estimado" value={estimatedPH.toFixed(2)} note={`Objetivo ${targetPH.toFixed(2)}`} icon={Activity} accent="#D1A178" pattern={LAB_PATTERNS[2]} />
        </motion.div>
        <motion.div {...card(4)}>
          <LabMetricCard label="Cl / SO₄" value={ratio.toFixed(2)} note={`${Math.round(adjusted.calcium)} ppm Ca ajustado`} icon={Beaker} accent="#4D6DA3" pattern={LAB_PATTERNS[3]} />
        </motion.div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <motion.div {...card(5)} className="xl:col-span-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Droplets size={16} className="text-accent-copper" />
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">1. Perfiles de trabajo</h2>
            </div>
            <div className="grid gap-4">
              <WaterProfileSelector
                label="Agua de origen"
                selectedId={sourceProfileId}
                customIons={customSource}
                onSelectProfile={setSourceProfile}
                onSetCustom={setCustomSource}
              />
              <WaterProfileSelector
                label="Agua objetivo"
                selectedId={targetProfileId}
                customIons={customTarget}
                onSelectProfile={setTargetProfile}
                onSetCustom={setCustomTarget}
              />
            </div>
          </div>
        </motion.div>

        <motion.div {...card(6)} className="xl:col-span-7 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={16} className="text-accent-cobalt" />
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">2. Dilución y visualización</h2>
            </div>
            <div className="grid gap-4">
              <DilutionCalculator />
              <WaterComparisonChart />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <motion.div {...card(7)} className="xl:col-span-7">
          <div className="flex items-center gap-2 mb-3">
            <Beaker size={16} className="text-accent-copper" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">3. Sales de ajuste</h2>
          </div>
          <SaltAdditions />
        </motion.div>

        <motion.div {...card(8)} className="xl:col-span-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-accent-cobalt" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">4. Balance mineral</h2>
          </div>
          <ClSO4Ratio />
        </motion.div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <motion.div {...card(9)} className="xl:col-span-7">
          <div className="flex items-center gap-2 mb-3">
            <Beaker size={16} className="text-accent-copper" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">5. pH del macerado</h2>
          </div>
          <MashPHEstimator />
        </motion.div>

        <motion.div {...card(10)} className="xl:col-span-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={16} className="text-accent-cobalt" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">6. Corrección ácida</h2>
          </div>
          <AcidCalculator />
        </motion.div>
      </section>
    </div>
  )
}