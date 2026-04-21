// frontend/src/components/avatar/genie-avatar.tsx — NeoStills v4 FASE 1
// The main AI avatar ("El Genio Destilador") with chroma-key video, speech bubble, and genie effects
import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { useAvatarStore } from '@/stores/avatar-store'
import { startChromaKeyLoop } from '@/lib/chroma-key'
import { cn } from '@/lib/utils'

const phaseVariants = {
  hidden: {
    opacity: 0,
    scale: 0,
    y: 100,
    skewX: 15,
    transition: { duration: 0.3 },
  },
  summoning: {
    opacity: 1,
    scale: 1.05,
    y: -10,
    skewX: 0,
    transition: { duration: 0.7, type: 'spring' as const, damping: 12 },
  },
  active: {
    opacity: 1,
    scale: 1,
    y: 0,
    skewX: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  navigating: {
    opacity: 1,
    scale: 0.9,
    y: 0,
    skewX: 0,
    transition: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  dismissing: {
    opacity: 0,
    scale: 0,
    y: 80,
    rotate: 10,
    transition: { duration: 0.6, ease: 'easeIn' as const },
  },
}

const glowByPhase: Record<string, string> = {
  summoning: 'drop-shadow(0 0 30px rgba(156, 106, 222, 0.5))',
  active: 'drop-shadow(0 0 15px rgba(245, 166, 35, 0.3))',
  dismissing: 'drop-shadow(0 0 40px rgba(156, 106, 222, 0.8))',
  navigating: 'drop-shadow(0 0 20px rgba(156, 106, 222, 0.4))',
}

export function GenieAvatar() {
  const { config, phase, currentMessage, dismiss, isGenerating } = useAvatarStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const isVisible = phase !== 'hidden'

  // Start chroma-key processing when video is playing
  const startProcessing = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    // Cleanup previous loop
    cleanupRef.current?.()
    cleanupRef.current = startChromaKeyLoop(video, canvas)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  // Migrate legacy Replicate URLs to local assets
  useEffect(() => {
    if (config.imageUrl?.includes('replicate.delivery')) {
      useAvatarStore.getState().setConfig({ imageUrl: '/assets/avatar/david-avatar.jpeg' })
    }
    if (config.videoUrl?.includes('replicate.delivery')) {
      useAvatarStore.getState().setConfig({ videoUrl: '/assets/avatar/david-video.mp4' })
    }
  }, [])

  // Handle video source changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !config.videoUrl) return

    video.src = config.videoUrl
    video.load()
  }, [config.videoUrl])

  if (!config.enabled) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={phaseVariants}
          initial="hidden"
          animate={phase}
          exit="dismissing"
          className={cn(
            'genie-avatar fixed z-[998] w-[280px] md:w-[300px]',
            'bottom-24 right-4 md:bottom-20 md:right-[120px]'
          )}
          style={{
            transformOrigin: 'bottom right',
            filter: glowByPhase[phase] ?? 'none',
          }}
        >
          {/* Avatar card — glass morphism */}
          <div className="relative rounded-2xl overflow-hidden glass-card border border-white/[0.08]">
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close avatar"
            >
              <X size={14} className="text-text-secondary" />
            </button>

            {/* Avatar visual — canvas with chroma key processed video */}
            <div className="relative w-full aspect-square bg-transparent overflow-hidden">
              {config.videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    onCanPlay={startProcessing}
                    loop
                    muted
                    playsInline
                    autoPlay
                    className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                    aria-hidden="true"
                  />
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : config.imageUrl ? (
                <img
                  src={config.imageUrl}
                  alt="Avatar del Genio Destilador"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                // Fallback: magic gradient placeholder
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-amber-900/30">
                  <Sparkles size={48} className="text-accent-purple animate-pulse" />
                </div>
              )}

              {/* Generating indicator */}
              {isGenerating && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles size={24} className="text-accent-purple" />
                    </motion.div>
                    <span className="text-xs text-text-secondary">Generando...</span>
                  </div>
                </div>
              )}

              {/* Magic gradient overlay at bottom for text readability */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-secondary/90 to-transparent" />
            </div>

            {/* Speech bubble */}
            <AnimatePresence mode="wait">
              {currentMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 py-3 border-t border-white/[0.06]"
                >
                  <p className="text-sm text-text-primary leading-relaxed">
                    {currentMessage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.06]">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-text-secondary transition-colors"
                aria-label={config.voiceEnabled ? 'Mute voice' : 'Enable voice'}
              >
                {config.voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span>{config.voiceEnabled ? 'Voz' : 'Mudo'}</span>
              </button>

              <div className="flex-1" />

              <span className="text-[10px] text-text-tertiary font-mono tracking-wide uppercase">
                {phase === 'summoning' ? '✨ Invocando...' : 'El Genio Destilador'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
