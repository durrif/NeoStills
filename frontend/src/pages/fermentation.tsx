// frontend/src/pages/fermentation.tsx — NeoStills v3 Fermentation Digital Twin
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical, Thermometer, Droplets, Plus, Activity,
  AlertTriangle, TrendingDown, Calendar, Wifi, WifiOff,
  Battery, Clock, ChevronRight,
} from 'lucide-react'

import { useUIStore } from '@/stores/ui-store'
import { useBrewSessions, useFermentationData } from '@/hooks/use-brewing'
import {
  useActiveFermentations,
  useLatestISpindelReading,
  useFermentationWebSocket,
} from '@/hooks/use-fermentation'
import { GravityChart } from '@/components/brewing/gravity-chart'
import {
  FermenterTwin,
  FermenterStatusIcon,
  type FermenterTwinData,
  type FermenterStatus,
} from '@/components/fermentation/fermenter-twin'
import { FERMENTER_CATALOG, type FermenterSpec } from '@/data/fermenters'
import { AddFermentationModal } from '@/components/fermentation/add-fermentation-modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BrewSession, ISpindelReading } from '@/lib/types'

/* ── Helpers ───────────────────────────────────────────────────── */
function daysBetween(from: string, to?: string): number {
  const d1 = new Date(from)
  const d2 = to ? new Date(to) : new Date()
  return Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000))
}

function inferStatus(session: BrewSession, reading?: ISpindelReading | null): FermenterStatus {
  if (!reading) return 'idle'
  if (session.phase === 'fermenting') {
    if (reading.temperature && (reading.temperature < 14 || reading.temperature > 28)) return 'attention'
    return 'active'
  }
  if (session.phase === 'aging') return 'healthy'
  return 'idle'
}

/* ── Fermenter Selector (empty state) ──────────────────────────── */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-accent-amber/10 flex items-center justify-center">
        <FlaskConical size={40} className="text-accent-amber/60" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-display font-semibold text-text-primary">
          Sin fermentaciones activas
        </h2>
        <p className="text-sm text-text-secondary max-w-md">
          Inicia un lote desde la página de elaboración y avanza hasta la fase de fermentación
          para ver el monitor digital aquí.
        </p>
      </div>
      <Button
        size="sm"
        className="bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/20 mt-2"
      >
        <Plus size={14} className="mr-1.5" />
        Ir a Elaboración
      </Button>
    </motion.div>
  )
}

/* ── Detail Panel ──────────────────────────────────────────────── */
function DetailPanel({ session, fermenter }: { session: BrewSession; fermenter: FermenterSpec }) {
  const { data: points = [], isLoading } = useFermentationData(session.id)
  const [liveReading, setLiveReading] = useState<ISpindelReading | null>(null)

  // Wire iSpindel WebSocket for live updates
  const handleLiveReading = useCallback((reading: ISpindelReading) => {
    setLiveReading(reading)
  }, [])
  useFermentationWebSocket(Number(session.id), handleLiveReading)

  const lastPoint = points[points.length - 1]
  // Prefer live reading over last recorded point
  const currentGravity = liveReading?.gravity ?? lastPoint?.gravity
  const currentTemp = liveReading?.temperature ?? lastPoint?.temperature
  const days = session.fermentation_start ? daysBetween(session.fermentation_start) : session.wash_date ? daysBetween(session.wash_date) : 0

  const predictedFG = session.planned_fg ?? (session.planned_og ? session.planned_og * 0.75 : null)
  const estDaysLeft = predictedFG && currentGravity
    ? Math.max(0, Math.round(((currentGravity - predictedFG) / 0.002) * 1))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Session info header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-text-primary">{session.name}</h2>
          <p className="text-xs text-text-secondary">
            {fermenter.name} · {fermenter.brand} · {fermenter.capacity_liters}L
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-amber/15 text-accent-amber border border-accent-amber/20">
          {session.phase}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: Calendar,
            label: 'Día',
            value: `${days}`,
            sub: session.phase === 'fermenting' ? `de ~${estDaysLeft ? days + estDaysLeft : '?'}` : undefined,
            color: 'text-accent-amber',
          },
          {
            icon: Droplets,
            label: 'Densidad',
            value: currentGravity ? currentGravity.toFixed(3) : '—',
            sub: liveReading ? '🔴 LIVE' : 'SG',
            color: 'text-amber-400',
          },
          {
            icon: Thermometer,
            label: 'Temperatura',
            value: currentTemp?.toFixed(1) ?? '—',
            sub: '°C',
            color: 'text-blue-400',
          },
          {
            icon: TrendingDown,
            label: 'ABV estimada',
            value: session.actual_og && currentGravity
              ? ((session.actual_og - currentGravity) * 131.25).toFixed(1)
              : '—',
            sub: '%',
            color: 'text-accent-hop',
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="glass-card rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] mb-2">
              <Icon className={cn('h-3 w-3', color)} />
              {label}
            </div>
            <p className={cn('text-2xl font-mono font-bold', color)}>
              {value}
              {sub && <span className="text-xs ml-1 text-text-muted">{sub}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* AI Analysis placeholder */}
      {(lastPoint || liveReading) && (
        <div className="glass-card rounded-xl border border-accent-hop/15 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent-hop" />
            <span className="text-xs font-semibold text-accent-hop uppercase tracking-wider">
              Análisis AI
            </span>
            {liveReading && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-accent-hop">
                <Wifi size={10} />
                iSpindel en vivo
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {currentGravity && currentGravity > 1.020
              ? 'La fermentación está activa. La densidad desciende a buen ritmo. Mantén la temperatura estable.'
              : currentGravity && currentGravity > 1.010
              ? 'Fermentación avanzada. Considera un descanso de diacetilo subiendo 2°C durante 48h.'
              : 'La densidad está cerca del objetivo. Toma una lectura manual para confirmar FG.'}
            {predictedFG && (
              <span className="block mt-1 text-text-tertiary text-xs">
                FG predicha: {predictedFG.toFixed(3)} · Estimado {estDaysLeft ?? '?'} días restantes
              </span>
            )}
          </p>
        </div>
      )}

      {/* Gravity Chart */}
      <div className="glass-card rounded-xl border border-white/10 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
          <TrendingDown size={14} className="text-accent-amber" />
          Evolución de densidad y temperatura
        </h3>
        {isLoading ? (
          <div className="h-60 animate-pulse bg-bg-elevated rounded-lg" />
        ) : points.length === 0 ? (
          <p className="text-text-muted text-sm py-12 text-center">
            Sin datos todavía. Conecta tu iSpindel o añade puntos manualmente.
          </p>
        ) : (
          <GravityChart data={points} height={280} />
        )}
      </div>
    </motion.div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function FermentationPage() {
  const { setActivePage } = useUIStore()
  useEffect(() => setActivePage('fermentation'), [setActivePage])

  const { data: sessions = [], isLoading } = useBrewSessions('fermenting')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const activeId = selectedId ?? sessions[0]?.id ?? null
  const selectedSession = sessions.find((s: BrewSession) => s.id === activeId)

  // Build digital twin data for each fermenting session
  const twinsData: FermenterTwinData[] = sessions.map((s: BrewSession, i: number) => {
    const fermenter = FERMENTER_CATALOG[i % FERMENTER_CATALOG.length]!
    const days = s.fermentation_start ? daysBetween(s.fermentation_start) : s.wash_date ? daysBetween(s.wash_date) : 0
    return {
      fermenter,
      beerName: s.name,
      style: s.notes ?? undefined,
      dayNumber: days,
      totalDays: 14,
      currentGravity: s.actual_og ? s.actual_og - (days * 0.003) : undefined,
      originalGravity: s.actual_og ?? undefined,
      finalGravity: s.planned_fg ?? (s.actual_og ? s.actual_og * 0.75 : undefined),
      temperature: 19.5 + Math.random() * 2 - 1,
      targetTemp: 20,
      deviceOnline: true,
      deviceBattery: 78 - i * 10,
      deviceRssi: -45 - i * 8,
      lastSync: new Date(Date.now() - (2 + i * 3) * 60000).toISOString(),
      status: 'active' as FermenterStatus,
    }
  })

  // Add empty fermenter slots
  const usedFermenters = twinsData.length
  const emptySlots: FermenterTwinData[] = FERMENTER_CATALOG
    .slice(usedFermenters, usedFermenters + Math.max(0, 3 - usedFermenters))
    .map(f => ({
      fermenter: f,
      status: 'idle' as FermenterStatus,
    }))

  const allTwins = [...twinsData, ...emptySlots]
  const selectedFermenter = selectedId
    ? FERMENTER_CATALOG[sessions.findIndex((s: BrewSession) => s.id === selectedId) % FERMENTER_CATALOG.length] ?? null
    : sessions.length > 0
    ? FERMENTER_CATALOG[0] ?? null
    : null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold amber-text">Fermentación</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {sessions.length > 0
              ? `${sessions.length} lote${sessions.length > 1 ? 's' : ''} en fermentación`
              : 'Monitor digital de fermentación'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/20"
        >
          <Plus size={14} className="mr-1.5" />
          Añadir manual
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl h-48 animate-pulse bg-bg-elevated" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
          {/* Left: Fermenter grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <FlaskConical size={12} />
              Fermentadores activos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {allTwins.map((twin, i) => (
                <FermenterTwin
                  key={twin.beerName ?? twin.fermenter.id}
                  data={twin}
                  selected={
                    twin.beerName
                      ? sessions[i]?.id === activeId
                      : false
                  }
                  onClick={() => {
                    if (i < sessions.length && sessions[i]) {
                      setSelectedId(sessions[i]!.id)
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div>
            {selectedSession && selectedFermenter ? (
              <DetailPanel session={selectedSession} fermenter={selectedFermenter} />
            ) : (
              <div className="glass-card rounded-xl border border-white/10 p-8 flex items-center justify-center">
                <p className="text-text-tertiary text-sm">
                  Selecciona un fermentador para ver los detalles
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Manual Reading Modal */}
      <AddFermentationModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        session={selectedSession}
      />
    </div>
  )
}
