// src/components/academy/vision-panel.tsx — AI Vision Correction panel
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CameraOff, AlertTriangle, Info, XCircle,
  Play, Eye, Zap, ChevronRight,
} from 'lucide-react'
import { VISION_ISSUES, TUTORIALS } from '@/data/tutorials'
import type { VisionIssue, BrewPhase, IssueSeverity } from '@/data/tutorials'
import { useAcademyStore } from '@/stores/academy-store'

const PHASE_OPTIONS: { value: BrewPhase; label: string; emoji: string }[] = [
  { value: 'mash', label: 'Macerado', emoji: '🌾' },
  { value: 'boil', label: 'Hervido', emoji: '🔥' },
  { value: 'fermentation', label: 'Fermentación', emoji: '🧪' },
  { value: 'packaging', label: 'Envasado', emoji: '📦' },
]

const SEVERITY_CONFIG: Record<IssueSeverity, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: '#42A5F5', bg: 'rgba(66,165,245,0.1)' },
  warning: { icon: AlertTriangle, color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
  critical: { icon: XCircle, color: '#EF5350', bg: 'rgba(239,83,80,0.1)' },
}

function IssueCard({ issue, onShowTutorial }: {
  issue: VisionIssue
  onShowTutorial: (tutorialId: string) => void
}) {
  const sev = SEVERITY_CONFIG[issue.severity]
  const SevIcon = sev.icon
  const tutorial = issue.relatedTutorialId
    ? TUTORIALS.find((t) => t.id === issue.relatedTutorialId)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-lg p-3 border"
      style={{ background: sev.bg, borderColor: `${sev.color}30` }}
    >
      <div className="flex items-start gap-2">
        <SevIcon size={16} color={sev.color} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: sev.color }}>
            {issue.severity === 'critical' ? '🚨 CRÍTICO' : issue.severity === 'warning' ? '⚠️ AVISO' : 'ℹ️ INFO'}
          </p>
          <p className="text-sm text-text-primary mt-1">{issue.description}</p>
          <p className="text-xs text-text-secondary mt-1">{issue.correction}</p>

          {/* Avatar quote */}
          <div className="mt-2 p-2 rounded-md bg-accent-purple/[0.08] border border-accent-purple/20">
            <p className="text-[11px] text-accent-purple italic">
              🤖 "{issue.avatarResponse}"
            </p>
          </div>

          {/* Related tutorial link */}
          {tutorial && (
            <button
              onClick={() => onShowTutorial(tutorial.id)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent-amber hover:text-accent-copper transition-colors"
            >
              <Play size={12} />
              Ver: {tutorial.title}
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function VisionPanel() {
  const {
    visionEnabled, setVisionEnabled,
    activeCoachPhase, startCoachSession, endCoachSession,
  } = useAcademyStore()

  const [selectedPhase, setSelectedPhase] = useState<BrewPhase>('mash')
  const [demoIssues, setDemoIssues] = useState<VisionIssue[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  const handleStartSession = () => {
    startCoachSession(selectedPhase)
    setVisionEnabled(true)
    setDemoIssues([])
  }

  const handleStopSession = () => {
    endCoachSession()
    setVisionEnabled(false)
    setDemoIssues([])
    setAnalyzing(false)
  }

  const handleSimulateAnalysis = () => {
    setAnalyzing(true)
    // Simulate AI analysis — pick 2-3 issues for current phase
    setTimeout(() => {
      const phaseIssues = VISION_ISSUES.filter(
        (i) => i.phase === (activeCoachPhase ?? selectedPhase),
      )
      const picked = phaseIssues.slice(0, Math.min(3, phaseIssues.length))
      setDemoIssues(picked)
      setAnalyzing(false)
    }, 2000)
  }

  const handleShowTutorial = (_tutorialId: string) => {
    // In production: scroll/navigate to tutorial, open embedded player
    // For now: could emit event or navigate
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-xl p-5 border border-white/[0.07]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/15 flex items-center justify-center">
              <Eye size={20} className="text-accent-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Corrección Visual con IA
              </h3>
              <p className="text-xs text-text-secondary">
                Analiza tu elaboración en tiempo real
              </p>
            </div>
          </div>
          {activeCoachPhase ? (
            <button
              onClick={handleStopSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
            >
              <CameraOff size={14} />
              Detener
            </button>
          ) : null}
        </div>

        {/* Phase selector (when not in session) */}
        {!activeCoachPhase && (
          <>
            <p className="text-xs text-text-tertiary mb-3">
              Selecciona la fase de elaboración para iniciar la corrección IA:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {PHASE_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPhase(p.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedPhase === p.value
                      ? 'border-accent-amber/40 bg-accent-amber/[0.08]'
                      : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-xl block mb-1">{p.emoji}</span>
                  <span className={`text-xs font-medium ${
                    selectedPhase === p.value ? 'text-accent-amber' : 'text-text-secondary'
                  }`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={handleStartSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-bg-deep transition-colors"
              style={{ background: 'linear-gradient(135deg, #9C6ADE, #F5A623)' }}
            >
              <Camera size={16} />
              Iniciar sesión de coaching
            </button>
          </>
        )}

        {/* Active session */}
        {activeCoachPhase && (
          <div className="space-y-3">
            {/* Camera feed placeholder */}
            <div className="relative aspect-video bg-bg-deep rounded-lg border border-white/[0.05] overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <Camera size={32} className="text-text-tertiary mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-text-tertiary">
                  Cámara — {PHASE_OPTIONS.find((p) => p.value === activeCoachPhase)?.label}
                </p>
                <p className="text-[10px] text-text-tertiary mt-1">
                  Conecta tu cámara NeoStills HW o usa la cámara del móvil
                </p>
              </div>
              {/* Status overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-medium text-green-400">EN VIVO</span>
              </div>
              {/* Phase badge */}
              <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-bg-secondary/80 border border-white/[0.1]">
                <span className="text-[10px] text-text-secondary">
                  {PHASE_OPTIONS.find((p) => p.value === activeCoachPhase)?.emoji}{' '}
                  {PHASE_OPTIONS.find((p) => p.value === activeCoachPhase)?.label}
                </span>
              </div>
            </div>

            {/* Analyze button */}
            <button
              onClick={handleSimulateAnalysis}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-purple/15 text-accent-purple border border-accent-purple/20 hover:bg-accent-purple/25 transition-colors disabled:opacity-50"
            >
              <Zap size={14} className={analyzing ? 'animate-spin' : ''} />
              {analyzing ? 'Analizando...' : 'Analizar frame actual'}
            </button>
          </div>
        )}
      </div>

      {/* Detected issues */}
      <AnimatePresence>
        {demoIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-2"
          >
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-accent-amber" />
              Problemas detectados ({demoIssues.length})
            </h4>
            {demoIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onShowTutorial={handleShowTutorial}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vision issues reference list */}
      {!activeCoachPhase && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.07]">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            🧠 Base de conocimiento IA ({VISION_ISSUES.length} patrones)
          </h4>
          <div className="grid gap-2">
            {VISION_ISSUES.slice(0, 4).map((issue) => {
              const sev = SEVERITY_CONFIG[issue.severity]
              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: sev.color }}
                  />
                  <span className="text-xs text-text-secondary flex-1 truncate">
                    {issue.description}
                  </span>
                  <span className="text-[10px] text-text-tertiary capitalize">
                    {issue.phase}
                  </span>
                </div>
              )
            })}
            <p className="text-[11px] text-text-tertiary text-center pt-1">
              +{VISION_ISSUES.length - 4} patrones más detectables por IA
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
