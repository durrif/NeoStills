// src/components/academy/brew-coach.tsx — Mobile Brew Coach mode
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CameraOff, Timer, Mic, MicOff,
  ChevronDown, X, Play, Pause, AlertTriangle,
  Volume2, Vibrate,
} from 'lucide-react'
import { useAcademyStore } from '@/stores/academy-store'
import type { BrewPhase } from '@/data/tutorials'

const PHASE_LABELS: Record<BrewPhase, { label: string; emoji: string; color: string }> = {
  mash: { label: 'Macerado', emoji: '🌾', color: '#F5A623' },
  boil: { label: 'Hervido', emoji: '🔥', color: '#EF5350' },
  fermentation: { label: 'Fermentación', emoji: '🧪', color: '#7CB342' },
  packaging: { label: 'Envasado', emoji: '📦', color: '#D4723C' },
}

/** Demo hop additions for brew coach timer */
const DEMO_HOP_SCHEDULE = [
  { time: 3600, name: 'Magnum 15g', type: 'Bittering' },
  { time: 900, name: 'Cascade 20g', type: 'Flavor' },
  { time: 300, name: 'Citra 30g', type: 'Aroma' },
  { time: 0, name: 'Galaxy 25g', type: 'Flame-out' },
]

export default function BrewCoach() {
  const { activeCoachPhase, startCoachSession, endCoachSession } = useAcademyStore()
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(3600) // 60 min default
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [selectingPhase, setSelectingPhase] = useState(!activeCoachPhase)
  const [alerts, setAlerts] = useState<string[]>([])

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return
    const interval = setInterval(() => {
      setTimerSeconds((s) => {
        const next = s - 1
        // Check hop schedule alerts
        const hop = DEMO_HOP_SCHEDULE.find((h) => h.time === next)
        if (hop) {
          setAlerts((a) => [...a, `🌿 ¡Adición de lúpulo! ${hop.name} (${hop.type})`])
          // Haptic (if supported)
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        }
        if (next <= 0) setTimerRunning(false)
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, timerSeconds])

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }, [])

  const handleStartPhase = (phase: BrewPhase) => {
    startCoachSession(phase)
    setSelectingPhase(false)
    setTimerSeconds(phase === 'boil' ? 3600 : phase === 'mash' ? 3600 : 0)
    setAlerts([])
  }

  const handleEnd = () => {
    endCoachSession()
    setTimerRunning(false)
    setCameraOn(false)
    setMicOn(false)
    setSelectingPhase(true)
    setAlerts([])
  }

  const dismissAlert = (idx: number) => {
    setAlerts((a) => a.filter((_, i) => i !== idx))
  }

  // Phase selector
  if (selectingPhase || !activeCoachPhase) {
    return (
      <div className="glass-card rounded-xl p-5 border border-white/[0.07]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent-hop/15 flex items-center justify-center">
            <Timer size={20} className="text-accent-hop" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Modo Coach de Proceso
            </h3>
            <p className="text-xs text-text-secondary">
              Temporizador grande, hitos de proceso, cámara PiP y voz
            </p>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mb-3">
          Modo diseñado para usar con manos libres durante el proceso. 
          Selecciona la fase para empezar:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(PHASE_LABELS) as [BrewPhase, typeof PHASE_LABELS.mash][]).map(
            ([phase, meta]) => (
              <button
                key={phase}
                onClick={() => handleStartPhase(phase)}
                className="p-4 rounded-lg border border-white/[0.07] bg-white/[0.02] 
                  hover:bg-white/[0.05] hover:border-white/[0.12] transition-all text-center"
              >
                <span className="text-2xl block mb-1">{meta.emoji}</span>
                <span className="text-sm font-medium text-text-primary">{meta.label}</span>
              </button>
            ),
          )}
        </div>
      </div>
    )
  }

  const phase = PHASE_LABELS[activeCoachPhase]

  return (
    <div className="space-y-3">
      {/* Full-screen-like timer card */}
      <div
        className="glass-card rounded-xl p-6 border text-center relative overflow-hidden"
        style={{ borderColor: `${phase.color}30` }}
      >
        {/* Phase badge + close */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: `${phase.color}15` }}
          >
            <span className="text-sm">{phase.emoji}</span>
            <span className="text-xs font-semibold" style={{ color: phase.color }}>
              {phase.label}
            </span>
          </div>
          <button
            onClick={handleEnd}
            className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Giant countdown */}
        <div className="py-6">
          <div
            className="text-6xl sm:text-7xl font-bold tracking-tight"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: timerSeconds < 60 ? '#EF5350' : '#E8E0D4',
            }}
          >
            {formatTime(timerSeconds)}
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            {timerRunning ? 'En curso' : timerSeconds > 0 ? 'Pausado' : 'Finalizado'}
          </p>
        </div>

        {/* Timer controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-bg-deep transition-transform active:scale-95"
            style={{ background: `linear-gradient(135deg, ${phase.color}, ${phase.color}CC)` }}
          >
            {timerRunning ? <Pause size={16} /> : <Play size={16} />}
            {timerRunning ? 'Pausar' : 'Iniciar'}
          </button>
          {/* Quick time presets */}
          <div className="flex gap-1.5">
            {[60, 15, 5].map((min) => (
              <button
                key={min}
                onClick={() => {
                  setTimerSeconds(min * 60)
                  setTimerRunning(false)
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-mono text-text-secondary bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                {min}m
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming hop additions */}
        {(activeCoachPhase === 'boil') && (
          <div className="mt-4 pt-4 border-t border-white/[0.07]">
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Próximos hitos
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEMO_HOP_SCHEDULE.filter((h) => h.time <= timerSeconds).map((hop) => (
                <div
                  key={hop.time}
                  className={`px-2 py-1 rounded-md text-xs ${
                    Math.abs(hop.time - timerSeconds) < 30
                      ? 'bg-accent-amber/15 text-accent-amber font-semibold animate-pulse'
                      : 'bg-white/[0.04] text-text-secondary'
                  }`}
                >
                  {formatTime(hop.time)} — {hop.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls strip: Camera, Mic, Sound */}
      <div className="glass-card rounded-xl p-3 border border-white/[0.07] flex items-center justify-around">
        <button
          onClick={() => setCameraOn(!cameraOn)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            cameraOn ? 'bg-accent-info/15 text-accent-info' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
          <span className="text-[10px]">Cámara</span>
        </button>
        <button
          onClick={() => setMicOn(!micOn)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            micOn ? 'bg-green-500/15 text-green-400' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          <span className="text-[10px]">Voz</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-text-tertiary hover:text-text-secondary transition-colors">
          <Volume2 size={18} />
          <span className="text-[10px]">Audio</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-text-tertiary hover:text-text-secondary transition-colors">
          <Vibrate size={18} />
          <span className="text-[10px]">Vibrar</span>
        </button>
      </div>

      {/* Camera PiP placeholder */}
      <AnimatePresence>
        {cameraOn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card rounded-xl border border-white/[0.07] overflow-hidden"
          >
            <div className="aspect-video bg-bg-deep flex items-center justify-center relative">
              <Camera size={24} className="text-text-tertiary animate-pulse" />
              <p className="absolute bottom-2 left-3 text-[10px] text-text-tertiary">
                Cámara PiP — NeoStills HW / móvil
              </p>
              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] text-green-400">LIVE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert notifications */}
      <AnimatePresence>
        {alerts.map((alert, i) => (
          <motion.div
            key={`${alert}-${i}`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/20"
          >
            <AlertTriangle size={14} className="text-accent-amber flex-shrink-0" />
            <span className="text-xs text-text-primary flex-1">{alert}</span>
            <button
              onClick={() => dismissAlert(i)}
              className="text-text-tertiary hover:text-text-secondary p-1"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
