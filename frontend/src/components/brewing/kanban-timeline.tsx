// src/components/brewing/kanban-timeline.tsx — NeoStills v2 Distillation Kanban
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type LucideIcon,
  Check, ThermometerSun, FlaskConical, Flame,
  Timer, ChevronRight, Droplets, Package, Beaker
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrewPhase } from '@/lib/types'

/* ── Distillation phases ──────────────────────────────────────── */
export interface PhaseConfig {
  key: BrewPhase
  label: string
  icon: LucideIcon
}

export const BREW_PHASES: PhaseConfig[] = [
  { key: 'mashing',        label: 'Preparación del wash', icon: ThermometerSun, color: 'text-amber-400',  bgColor: 'bg-amber-400/10',  defaultMinutes: 90,  defaultTempC: 64 },
  { key: 'fermenting',     label: 'Fermentación',         icon: FlaskConical,   color: 'text-green-400',  bgColor: 'bg-green-400/10',  defaultMinutes: 0 },
  { key: 'stripping_run',  label: 'Stripping run',        icon: Flame,          color: 'text-orange-400', bgColor: 'bg-orange-400/10', defaultMinutes: 180, defaultTempC: 85,
    safetyNote: '⚠️ Ventilación obligatoria' },
  { key: 'spirit_run',     label: 'Spirit run',           icon: Flame,          color: 'text-red-400',    bgColor: 'bg-red-400/10',    defaultMinutes: 240, defaultTempC: 78,
    safetyNote: '⚠️ Descartar cabezas' },
  { key: 'cuts_collection',label: 'Separación cortes',    icon: Beaker,         color: 'text-violet-400', bgColor: 'bg-violet-400/10', defaultMinutes: 30 },
  { key: 'aging',          label: 'Crianza',              icon: Droplets,       color: 'text-yellow-600', bgColor: 'bg-yellow-600/10', defaultMinutes: 0 },
  { key: 'bottling',       label: 'Embotellado',          icon: Package,        color: 'text-blue-400',   bgColor: 'bg-blue-400/10',   defaultMinutes: 60 },
]

const PHASE_KEYS = BREW_PHASES.map(p => p.key)

/* ── Helpers ────────────────────────────────────────────────────── */
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ── Phase Card ─────────────────────────────────────────────────── */
interface PhaseCardProps {
  phase: PhaseConfig
  status: 'done' | 'active' | 'next' | 'future'
  elapsed?: number              // seconds elapsed in this phase
  onAdvance?: () => void
  children?: React.ReactNode    // hop schedule nested inside boil
}

function PhaseCard({ phase, status, elapsed = 0, onAdvance, children }: PhaseCardProps) {
  const { t } = useTranslation('brewing')
  const Icon = phase.icon
  const durationSec = phase.defaultMinutes * 60
  const remaining = Math.max(0, durationSec - elapsed)
  const progress = durationSec > 0 ? Math.min(100, (elapsed / durationSec) * 100) : 0
  const isDone = status === 'done'
  const isActive = status === 'active'
  const isNext = status === 'next'

  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isActive) activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [isActive])

  return (
    <motion.div
      ref={isActive ? activeRef : undefined}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'shrink-0 rounded-xl border transition-all relative overflow-hidden',
        isActive ? 'w-64 md:w-72 border-accent-amber/50 glow-border' : 'w-48 md:w-52',
        isDone && 'border-accent-hop/30 bg-accent-hop/5',
        isActive && 'bg-bg-tertiary',
        isNext && 'border-accent-amber/20 bg-bg-secondary cursor-pointer hover:border-accent-amber/40',
        !isDone && !isActive && !isNext && 'border-white/[0.06] bg-bg-secondary opacity-50',
      )}
      onClick={() => isNext && onAdvance?.()}
    >
      {/* Progress bar at bottom */}
      {isActive && durationSec > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-accent-amber/30 w-full">
          <motion.div
            className="h-full bg-accent-amber"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', phase.bgColor)}>
              {isDone ? (
                <Check size={16} className="text-accent-hop" />
              ) : (
                <Icon size={16} className={phase.color} />
              )}
            </div>
            <div>
              <p className={cn(
                'text-sm font-semibold',
                isActive ? 'text-text-primary' : isDone ? 'text-text-secondary' : 'text-text-tertiary'
              )}>
                {t(`phases.${phase.key}`)}
              </p>
            </div>
          </div>
          {isDone && <Check size={14} className="text-accent-hop" />}
          {isNext && <ChevronRight size={14} className="text-accent-amber" />}
        </div>

        {/* Timer (active phase) */}
        {isActive && durationSec > 0 && (
          <div className="flex items-center justify-center py-2">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={remaining === 0 ? '#7CB342' : '#F5A623'}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-bold text-text-primary tabular-nums">
                  {fmtTime(remaining)}
                </span>
                {remaining === 0 && <span className="text-[9px] text-accent-hop font-medium">LISTO</span>}
              </div>
            </div>
          </div>
        )}

        {/* Temperature target */}
        {(isActive || isDone) && phase.defaultTempC && (
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <ThermometerSun size={12} />
            <span>Objetivo: <span className="text-text-secondary font-mono">{phase.defaultTempC}°C</span></span>
          </div>
        )}

        {/* Duration info (non-active) */}
        {!isActive && phase.defaultMinutes > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Timer size={12} />
            <span>{phase.defaultMinutes} min</span>
          </div>
        )}

        {/* Status label */}
        <div className="pt-1">
          {isDone && (
            <span className="text-[10px] font-medium text-accent-hop bg-accent-hop/10 px-2 py-0.5 rounded-full">
              COMPLETADO ✓
            </span>
          )}
          {isActive && (
            <span className="text-[10px] font-medium text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded-full animate-pulse">
              ACTIVO 🔥
            </span>
          )}
          {isNext && (
            <span className="text-[10px] font-medium text-accent-amber/70 bg-accent-amber/5 px-2 py-0.5 rounded-full">
              SIGUIENTE →
            </span>
          )}
        </div>

        {/* Nested children (hop schedule in boil) */}
        {isActive && children && (
          <div className="mt-2 border-t border-white/[0.06] pt-3">
            {children}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Main Kanban Timeline ───────────────────────────────────────── */
interface KanbanTimelineProps {
  currentPhase: BrewPhase
  elapsed: number                  // seconds elapsed in current phase
  onAdvance: (nextPhase: BrewPhase) => void
  hopSchedule?: React.ReactNode   // rendered inside boil card
}

export function KanbanTimeline({ currentPhase, elapsed, onAdvance, hopSchedule }: KanbanTimelineProps) {
  const currentIdx = PHASE_KEYS.indexOf(currentPhase)

  return (
    <div className="relative">
      {/* Scroll container */}
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-bg-hover px-1">
        {BREW_PHASES.map((phase, idx) => {
          let status: 'done' | 'active' | 'next' | 'future'
          if (idx < currentIdx) status = 'done'
          else if (idx === currentIdx) status = 'active'
          else if (idx === currentIdx + 1) status = 'next'
          else status = 'future'

          const nextPhase = idx === currentIdx + 1 ? phase.key : undefined

          return (
            <PhaseCard
              key={phase.key}
              phase={phase}
              status={status}
              elapsed={status === 'active' ? elapsed : 0}
              onAdvance={nextPhase ? () => onAdvance(nextPhase) : undefined}
            >
              {phase.key === 'stripping_run' && status === 'active' ? hopSchedule : undefined}
            </PhaseCard>
          )
        })}
      </div>

      {/* Phase connector arrows */}
      <div className="hidden md:flex absolute top-1/2 left-0 right-0 -translate-y-1/2 justify-between px-10 pointer-events-none">
        {BREW_PHASES.slice(1).map((_, i) => (
          <ChevronRight
            key={i}
            size={16}
            className={cn(
              'text-white/10',
              i < currentIdx && 'text-accent-hop/40',
              i === currentIdx && 'text-accent-amber/60'
            )}
          />
        ))}
      </div>
    </div>
  )
}
