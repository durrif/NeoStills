// frontend/src/pages/brewing.tsx — NeoStills v3 Brew Day Command Center
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FlaskConical, PlayCircle, Thermometer, Droplet,
  ChevronRight, Clock, Zap, ListChecks,
} from 'lucide-react'
import { toast } from 'sonner'

import { useUIStore } from '@/stores/ui-store'
import { useBrewStore } from '@/stores/brew-store'
import {
  useBrewSessions,
  useActiveSession,
  useAdvancePhase,
  useCreateSession,
  useRecipes,
} from '@/hooks/use-brewing'
import { useStartBrewFromRecipe, useRecipe } from '@/hooks/use-recipes'
import { BrewTimeline, type BrewPhase as TimelinePhase } from '@/components/brewing/brew-timeline'
import { DualTimer } from '@/components/brewing/dual-timer'
import { KanbanTimeline, BREW_PHASES } from '@/components/brewing/kanban-timeline'
import { HopSchedule, HopAlertBanner, type HopAddition } from '@/components/brewing/hop-schedule'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NewBatchModal } from '@/components/brewing/new-batch-modal'
import type { BrewSession, BrewPhase, Recipe, RecipeIngredient } from '@/lib/types'

/* ── Utilities ─────────────────────────────────────────────────── */
function phaseIndex(phase: BrewPhase): number {
  const order: BrewPhase[] = ['planned', 'mashing', 'fermenting', 'stripping_run', 'spirit_run', 'cuts_collection', 'aging', 'bottling', 'completed']
  return order.indexOf(phase)
}

function nextPhase(phase: BrewPhase): BrewPhase | undefined {
  const order: BrewPhase[] = ['planned', 'mashing', 'fermenting', 'stripping_run', 'spirit_run', 'cuts_collection', 'aging', 'bottling', 'completed']
  const idx = order.indexOf(phase)
  return idx < order.length - 1 ? order[idx + 1] : undefined
}

function buildHopSchedule(recipe?: Recipe | null): HopAddition[] {
  if (!recipe?.hops) return []
  return (recipe.hops as RecipeIngredient[])
    .filter(h => h.use === 'boil' || !h.use)
    .map(h => ({
      name: h.name,
      amount_g: h.amount_g ?? (h.amount_kg ? h.amount_kg * 1000 : 0),
      time_min: h.time_min ?? 60,
      alpha_pct: h.alpha_pct,
      ibu_contribution: undefined,
      added: false,
      notified: false,
    }))
    .sort((a, b) => b.time_min - a.time_min)
}

/* ── Start New Brew Hero ───────────────────────────────────────── */
function StartBrewHero() {
  const { t, i18n } = useTranslation('common')
  const { data: recipes = [] } = useRecipes()
  const startBrew = useStartBrewFromRecipe()
  const createSession = useCreateSession()
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null)

  const handleQuickStart = () => {
    if (selectedRecipe) {
      startBrew.mutate(selectedRecipe, {
        onSuccess: () => toast.success(t('brew_day.batch_started')),
        onError: () => toast.error(t('brew_day.advance_error')),
      })
    } else {
      createSession.mutate(
        { name: `${t('brew_day.batch_prefix')} ${new Date().toLocaleDateString(i18n.language)}`, phase: 'planned' },
        {
          onSuccess: () => toast.success(t('brew_day.batch_created')),
          onError: () => toast.error(t('brew_day.advance_error')),
        }
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-accent-cyan/20 bg-[radial-gradient(circle_at_top_right,rgba(34,230,255,0.12),transparent_30%),linear-gradient(135deg,rgba(209,161,120,0.08)_0%,rgba(26,26,46,0.94)_38%,rgba(18,23,42,0.98)_100%)] p-8 md:p-12 shadow-elevated"
    >
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-accent-copper" />
            <span className="text-xs font-semibold text-accent-copper uppercase tracking-[0.24em]">
              {t('brew_day.start_hero_badge')}
            </span>
          </div>
          <h2 className="text-3xl font-display font-bold text-text-primary">
            {t('brew_day.start_hero_title')}
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t('brew_day.start_hero_desc')}
          </p>
        </div>

        <div className="space-y-4">
          <select
            value={selectedRecipe ?? ''}
            onChange={(e) => setSelectedRecipe(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
          >
            <option value="">{t('brew_day.no_recipe')}</option>
            {recipes.map((r: Recipe) => (
              <option key={r.id} value={r.id}>{r.name} {r.style ? `(${r.style})` : ''}</option>
            ))}
          </select>

          <Button
            onClick={handleQuickStart}
            disabled={startBrew.isPending || createSession.isPending}
            className="w-full bg-brew-gradient text-[#101522] font-bold py-3 text-base shadow-glow hover:brightness-105"
          >
            <PlayCircle className="h-5 w-5 mr-2" />
            {startBrew.isPending || createSession.isPending ? t('brew_day.starting') : t('brew_day.start_brew')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Session Card (compact, for grid) ──────────────────────────── */
function SessionCard({ session, isActive }: { session: BrewSession; isActive?: boolean }) {
  const { t } = useTranslation('common')
  const advancePhase = useAdvancePhase()

  const handleAdvance = (phase: TimelinePhase) => {
    advancePhase.mutate(
      { sessionId: String(session.id), phase },
      {
        onSuccess: () => toast.success(t('brew_day.phase_to', { phase })),
        onError: () => toast.error(t('brew_day.advance_error')),
      }
    )
  }

  return (
    <div className={cn(
      'glass-card rounded-xl border p-5 space-y-4 transition-colors',
      isActive ? 'border-accent-cyan/30 ring-1 ring-accent-cyan/10' : 'border-white/10'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-text-primary text-sm">{session.name}</h3>
          {session.batch_number && (
            <p className="text-[10px] text-text-tertiary mt-0.5">#{session.batch_number}</p>
          )}
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
          isActive
            ? 'bg-accent-copper/15 text-accent-copper border-accent-copper/30'
            : 'bg-bg-elevated text-text-secondary border-white/10'
        )}>
          {session.phase}
        </span>
      </div>

      <BrewTimeline
        currentPhase={session.phase as TimelinePhase}
        onAdvance={handleAdvance}
        compact
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'OG', value: session.actual_og },
          { label: 'FG', value: session.actual_fg },
          {
            label: 'ABV',
            value: session.actual_og && session.actual_fg
              ? `${((session.actual_og - session.actual_fg) * 131.25).toFixed(1)}%`
              : '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-elevated rounded-lg p-2">
            <p className="text-[10px] text-text-muted">{label}</p>
            <p className="text-sm font-mono font-semibold text-text-primary">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Active Brew Panel ─────────────────────────────────────────── */
function ActiveBrewPanel({ session }: { session: BrewSession }) {
  const { t } = useTranslation('common')
  const advancePhase = useAdvancePhase()
  const { timer } = useBrewStore()
  const [hops, setHops] = useState<HopAddition[]>([])

  // Fetch recipe to build hop schedule from real data
  const recipeId = session.recipe_id ? Number(session.recipe_id) : null
  const { data: recipe } = useRecipe(recipeId)

  // Build hop schedule from recipe, fall back to demo hops
  useEffect(() => {
    const recipeHops = buildHopSchedule(recipe)
    if (recipeHops.length > 0) {
      setHops(recipeHops)
    } else if (hops.length === 0) {
      setHops([
        { name: 'Magnum', amount_g: 25, time_min: 60, alpha_pct: 12.5, added: false, notified: false },
        { name: 'Cascade', amount_g: 20, time_min: 15, alpha_pct: 5.5, added: false, notified: false },
        { name: 'Citra', amount_g: 30, time_min: 5, alpha_pct: 12.0, added: false, notified: false },
        { name: 'Citra', amount_g: 40, time_min: 0, alpha_pct: 12.0, added: false, notified: false },
      ])
    }
  }, [recipe]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkHopAdded = useCallback((index: number) => {
    setHops(prev => prev.map((h, i) => i === index ? { ...h, added: true } : h))
    toast.success(t('brew_day.hop_added'))
  }, [])

  const handlePhaseAdvance = (phase: TimelinePhase) => {
    advancePhase.mutate(
      { sessionId: String(session.id), phase },
      {
        onSuccess: () => toast.success(t('brew_day.advanced_to', { phase })),
        onError: () => toast.error(t('brew_day.advance_error')),
      }
    )
  }

  const next = nextPhase(session.phase as BrewPhase)
  const isDistillPhase = session.phase === 'stripping_run' || session.phase === 'spirit_run'
  const boilElapsedSec = isDistillPhase ? timer.stepSeconds : 0

  return (
    <div className="space-y-4">
      {/* Phase title + advance button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-copper/15 flex items-center justify-center">
            <Zap className="h-5 w-5 text-accent-copper" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">{session.name}</h2>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Clock size={10} />
              {t('brew_day.total_time')}: {Math.floor(timer.totalSeconds / 60)}:{String(timer.totalSeconds % 60).padStart(2, '0')}
            </p>
          </div>
        </div>
        {next && next !== 'completed' && (
          <Button
            size="sm"
            onClick={() => handlePhaseAdvance(next as TimelinePhase)}
            disabled={advancePhase.isPending}
            className="bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/16"
          >
            <ChevronRight size={14} className="mr-1" />
            → {next}
          </Button>
        )}
      </div>

      {/* Kanban Timeline */}
      <KanbanTimeline
        currentPhase={session.phase as BrewPhase}
        elapsed={timer.stepSeconds}
        onAdvance={handlePhaseAdvance}
      />

      {/* Hop Alert Banner (during boil) */}
      {isDistillPhase && (
        <HopAlertBanner
          hops={hops}
          boilElapsedSec={boilElapsedSec}
          boilTotalMin={60}
        />
      )}

      {/* Two‐column: Timer + Hop Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DualTimer mashDurationMinutes={60} boilDurationMinutes={60} />

        {isDistillPhase ? (
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <HopSchedule
              hops={hops}
              boilElapsedSec={boilElapsedSec}
              boilTotalMin={60}
              onMarkAdded={handleMarkHopAdded}
            />
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-white/10 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <ListChecks size={14} />
              {t('brew_day.phase_notes')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                  <Thermometer size={10} /> {t('brew_day.temperature')}
                </p>
                <p className="text-lg font-mono font-bold text-text-primary mt-1">
                  {session.phase === 'mashing' ? '67°C' : session.phase === 'stripping_run' ? '78°C' : session.phase === 'spirit_run' ? '65°C' : '—'}
                </p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                  <Droplet size={10} /> {t('brew_day.target_og')}
                </p>
                <p className="text-lg font-mono font-bold text-text-primary mt-1">
                  {session.planned_og ?? '—'}
                </p>
              </div>
            </div>
            {session.notes && (
              <p className="text-xs text-text-tertiary bg-bg-primary/50 rounded-lg p-3">
                {session.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function BrewingPage() {
  const { t } = useTranslation('common')
  const { setActivePage } = useUIStore()
  useEffect(() => setActivePage('brewing'), [setActivePage])

  const { data: sessions = [], isLoading } = useBrewSessions()
  const { data: activeSession } = useActiveSession()
  const [showNewBatch, setShowNewBatch] = useState(false)

  // Split active vs history
  const historySessions = useMemo(
    () => sessions.filter((s: BrewSession) => !activeSession || s.id !== activeSession.id),
    [sessions, activeSession]
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold amber-text">{t('brew_day.title')}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {activeSession ? t('brew_day.subtitle_active', { name: activeSession.name }) : t('brew_day.subtitle_idle')}
          </p>
        </div>
        {activeSession && (
          <Button
            size="sm"
            onClick={() => setShowNewBatch(true)}
            className="bg-brew-gradient text-[#101522] font-semibold shadow-glow hover:brightness-105"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('brew_day.new_batch')}
          </Button>
        )}
      </div>

      {/* Active Brew or Start Hero */}
      {activeSession ? (
        <ActiveBrewPanel session={activeSession} />
      ) : (
        <StartBrewHero />
      )}

      {/* All sessions grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent-cyan" />
          {activeSession ? t('brew_day.other_batches') : t('brew_day.all_batches')} ({historySessions.length})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl h-48 animate-pulse bg-bg-elevated" />
            ))}
          </div>
        ) : historySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 shadow-glow">
              <FlaskConical className="h-8 w-8 text-accent-copper" />
            </div>
            <p className="text-sm text-text-muted">
              {activeSession ? t('brew_day.no_other_batches') : t('brew_day.no_batches_yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {historySessions.map((s: BrewSession) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SessionCard session={s} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Batch Modal */}
      <NewBatchModal open={showNewBatch} onClose={() => setShowNewBatch(false)} />
    </div>
  )
}
