// src/pages/keezer.tsx — NeoStills v3 Keezer Digital Twin + Flow Monitoring
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Thermometer, Gauge, Droplets, AlertTriangle,
  Settings, Plus, GlassWater, TrendingDown,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useKeezerStore } from '@/stores/keezer-store'
import { useIsMobile } from '@/hooks/use-mobile'
import KeezerTwin from '@/components/keezer/keezer-twin'
import TapDetail from '@/components/keezer/tap-detail'
import KeezerConfigWizard from '@/components/keezer/config-wizard'
import PourModal from '@/components/keezer/pour-modal'
import ConsumptionChart from '@/components/keezer/consumption-chart'
import { KEG_MAP } from '@/data/kegs'
import { cn } from '@/lib/utils'
import type { TapConfig } from '@/data/kegs'

// ---- Keg quick-stat card ----

function KegQuickCard({ tap, selected, onClick, onPour }: {
  tap: TapConfig
  selected: boolean
  onClick: () => void
  onPour: () => void
}) {
  const { t } = useTranslation('devices')
  const pct = tap.liters_total > 0 ? tap.liters_remaining / tap.liters_total : 0
  const isEmpty = tap.status === 'empty'
  const keg = KEG_MAP.get(tap.keg_type_id ?? '')

  const levelColor =
    pct > 0.5 ? '#7CB342' :
    pct > 0.2 ? '#F5A623' :
    pct > 0 ? '#EF5350' :
    '#3A4A5C'

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full text-left rounded-[14px] p-4 cursor-pointer transition-all border',
        selected
          ? 'bg-accent-amber/[0.08] border-accent-amber/30'
          : 'bg-white/[0.03] border-white/[0.07]',
      )}
    >
      {/* Top: Tap number + alert */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center',
            isEmpty ? 'bg-[#5A6B80]/15' : 'bg-accent-amber/[0.12]',
          )}>
            <span className={cn(
              'text-[11px] font-bold',
              isEmpty ? 'text-[#5A6B80]' : 'text-accent-amber',
            )}>
              {tap.id}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-[#5A6B80] uppercase tracking-wider">
            LINEA {tap.id}
          </span>
        </div>
        {pct > 0 && pct < 0.2 && (
          <AlertTriangle size={14} color="#EF5350" />
        )}
      </div>

      {/* Beer name or empty */}
      <div className="text-sm font-semibold text-[#E8E0D4] font-display mb-1 truncate">
        {tap.beer_name || t('empty_keg')}
      </div>

      {isEmpty ? (
        <div className="text-[11px] text-[#5A6B80]">
          {keg?.name || '—'}
        </div>
      ) : (
        <>
          <div className="text-[11px] text-[#8B9BB4] mb-2">
            {tap.style} · {tap.abv}%
          </div>

          {/* Level bar */}
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: levelColor }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#8B9BB4] font-mono">
              {tap.liters_remaining.toFixed(1)}L
            </span>
            <span className="text-[11px] text-[#5A6B80] flex items-center gap-0.5">
              <Thermometer size={11} />
              {tap.temperature.toFixed(1)}°
            </span>
            <span className="text-[11px] text-[#5A6B80] flex items-center gap-0.5">
              <Gauge size={11} />
              {tap.pressure_bar.toFixed(1)}bar
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onPour() }}
              className="ml-auto bg-accent-cyan/12 border-none rounded-md px-2 py-0.5 text-accent-cyan text-[10px] font-semibold cursor-pointer hover:bg-accent-cyan/20 transition-colors"
            >
              Servicio
            </button>
          </div>
        </>
      )}
    </motion.button>
  )
}

// ---- Summary Stats Strip ----

function StatsStrip({ taps }: { taps: TapConfig[] }) {
  const { t } = useTranslation('devices')

  const active = taps.filter(t => t.status === 'active')
  const totalLiters = active.reduce((s, t) => s + t.liters_remaining, 0)
  const avgTemp = active.length > 0
    ? active.reduce((s, t) => s + t.temperature, 0) / active.length
    : 0
  const totalServings = taps.reduce((s, t) => s + t.serving_count, 0)
  const lowCount = active.filter(t => t.liters_remaining / t.liters_total < 0.2).length

  const stats = [
    { icon: Archive, label: t('active_kegs'), value: active.length, unit: `/ ${taps.length}`, color: '#22E6FF' },
    { icon: Droplets, label: t('total_volume', 'Volumen total'), value: totalLiters.toFixed(1), unit: 'L', color: '#42A5F5' },
    { icon: Thermometer, label: t('avg_temp', 'Temp. media'), value: avgTemp.toFixed(1), unit: '°C', color: '#7CB342' },
    { icon: GlassWater, label: t('total_servings', 'Servicios'), value: totalServings, unit: '', color: '#D4723C' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass-card rounded-xl p-3 flex items-center gap-2.5"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${s.color}12` }}
          >
            <s.icon size={16} color={s.color} />
          </div>
          <div>
            <div className="text-lg font-bold text-[#E8E0D4] font-display leading-tight">
              {s.value}
              <span className="text-[11px] text-[#8B9BB4] ml-0.5">{s.unit}</span>
            </div>
            <div className="text-[10px] text-[#5A6B80]">{s.label}</div>
          </div>
        </motion.div>
      ))}

      {/* Low warning */}
      {lowCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#EF5350]/[0.08] border border-[#EF5350]/20 rounded-xl p-3 flex items-center gap-2.5"
        >
          <AlertTriangle size={16} color="#EF5350" />
          <div>
            <div className="text-[13px] font-semibold text-[#EF5350]">
              {lowCount} {t('low_alert', 'bajo')}
            </div>
            <div className="text-[10px] text-[#EF5350]/60">
              {t('running_low')}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ---- Main Page ----

export default function KeezerPage() {
  const { t } = useTranslation(['common', 'devices'])
  const { setActivePage } = useUIStore()
  const [selectedTap, setSelectedTap] = useState<number | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [pouringTap, setPouringTap] = useState<TapConfig | null>(null)

  const { taps, config } = useKeezerStore()

  const isMobile = useIsMobile()

  useEffect(() => { setActivePage('keezer') }, [setActivePage])

  // Show wizard on first visit if not configured
  useEffect(() => {
    if (!config.configured) setShowWizard(true)
  }, [config.configured])

  const selectedTapData = useMemo(
    () => taps.find(t => t.id === selectedTap) ?? null,
    [taps, selectedTap]
  )

  const handleSelectTap = useCallback((id: number) => {
    setSelectedTap(prev => prev === id ? null : id)
  }, [])

  const handlePour = useCallback((tap: TapConfig) => {
    setPouringTap(tap)
  }, [])

  return (
    <div className="p-4 md:px-6 max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#E8E0D4] font-display flex items-center gap-2">
            <Archive size={22} className="text-accent-cyan" />
            {t('nav.keezer')}
          </h1>
          <p className="text-[13px] text-[#8B9BB4] mt-1">
            {t('devices:keezer_subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWizard(true)}
            className="glass-card rounded-[10px] px-3 py-2 text-[#8B9BB4] cursor-pointer flex items-center gap-1.5 text-xs hover:text-text-primary transition-colors"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">{t('devices:configure', 'Configurar')}</span>
          </button>
          <button className="bg-gradient-to-br from-accent-amber to-accent-copper rounded-[10px] px-3 py-2 text-bg-primary cursor-pointer flex items-center gap-1.5 text-xs font-semibold border-none">
            <Plus size={14} />
            <span className="hidden sm:inline">{t('devices:add_tap', 'Añadir Tap')}</span>
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <StatsStrip taps={taps} />

      {/* Main content: Twin + Detail panel */}
      <div className="flex flex-col md:flex-row gap-5 mt-5 items-start">
        {/* Left: SVG Twin + Quick Cards */}
        <div className="flex-1 min-w-0">
          {/* Hero SVG Twin */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card rounded-2xl p-4 md:p-5 mb-4"
          >
            <div className="flex justify-between items-center mb-2 px-2">
              <h2 className="text-[13px] font-semibold text-[#8B9BB4] uppercase tracking-wider m-0">
                {t('devices:digital_twin', 'Digital Twin')}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-accent-info font-mono">
                <Thermometer size={12} />
                {(taps.reduce((s, t) => s + t.temperature, 0) / (taps.filter(t => t.status !== 'empty').length || 1)).toFixed(1)}°C
              </div>
            </div>

            <KeezerTwin
              taps={taps}
              selectedTap={selectedTap}
              onSelectTap={handleSelectTap}
              keezerTemp={3.1}
              pouringTapId={pouringTap?.id ?? null}
            />

            <p className="text-center text-[11px] text-[#5A6B80] mt-1">
              {t('devices:click_tap', 'Haz clic en un barril para ver los detalles')}
            </p>
          </motion.div>

          {/* Quick cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {taps.map((tap, i) => (
              <motion.div
                key={tap.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
              >
                <KegQuickCard
                  tap={tap}
                  selected={selectedTap === tap.id}
                  onClick={() => handleSelectTap(tap.id)}
                  onPour={() => handlePour(tap)}
                />
              </motion.div>
            ))}
          </div>

          {/* Consumption chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 glass-card rounded-[14px] p-4"
          >
            <h3 className="text-[13px] font-semibold text-[#8B9BB4] uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingDown size={14} className="text-accent-cyan" />
              {t('devices:consumption', 'Consumo')}
            </h3>
            <ConsumptionChart tapId={selectedTap ?? undefined} />
          </motion.div>

          {/* Alerts strip */}
          {taps.some(t => t.status === 'active' && t.liters_remaining / t.liters_total < 0.35) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 bg-accent-amber/[0.06] border border-accent-amber/15 rounded-xl p-3 md:p-4"
            >
              <div className="text-xs font-semibold text-accent-amber mb-1.5">
                💡 {t('devices:suggestions', 'Sugerencias')}
              </div>
              {taps
                .filter(t => t.status === 'active' && t.liters_remaining / t.liters_total < 0.35)
                .map(tap => (
                  <div key={tap.id} className="text-xs text-[#E8E0D4] mb-1 flex items-center gap-1.5">
                    <span className="text-accent-amber">⚠️</span>
                    Línea {tap.id} ({tap.beer_name}): {t('devices:consider_brewing', 'considera reponer')} {tap.style}
                    — {t('devices:estimated', 'quedan')} ~{tap.days_remaining} {t('devices:days', 'días')}
                  </div>
                ))}
            </motion.div>
          )}
        </div>

        {/* Right: Tap Detail Panel — sidebar on desktop, bottom sheet on mobile */}
        {isMobile ? (
          <AnimatePresence>
            {selectedTapData && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/50"
                  onClick={() => setSelectedTap(null)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary rounded-t-2xl max-h-[80dvh] overflow-y-auto safe-area-pb"
                >
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2 mb-1" />
                  <TapDetail
                    tap={selectedTapData}
                    onClose={() => setSelectedTap(null)}
                    onPour={() => handlePour(selectedTapData)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : (
          <div
            className="shrink-0 transition-[width] duration-300 overflow-hidden"
            style={{ width: selectedTap ? 380 : 0 }}
          >
            <TapDetail
              tap={selectedTapData}
              onClose={() => setSelectedTap(null)}
              onPour={selectedTapData ? () => handlePour(selectedTapData) : undefined}
            />
          </div>
        )}
      </div>

      {/* Config Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <KeezerConfigWizard onClose={() => setShowWizard(false)} />
        )}
      </AnimatePresence>

      {/* Pour Modal */}
      <AnimatePresence>
        {pouringTap && (
          <PourModal tap={pouringTap} onClose={() => setPouringTap(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
