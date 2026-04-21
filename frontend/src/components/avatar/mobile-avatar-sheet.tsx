// frontend/src/components/avatar/mobile-avatar-sheet.tsx — NeoStills v4 FASE 1
// Mobile bottom sheet variant of the avatar (replaces floating overlay on mobile)
import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Mic, Volume2, VolumeX, Sparkles, Send } from 'lucide-react'
import { useAvatarStore } from '@/stores/avatar-store'
import { startChromaKeyLoop } from '@/lib/chroma-key'

export function MobileAvatarSheet() {
  const { config, phase, currentMessage, dismiss, isGenerating } = useAvatarStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const dragControls = useDragControls()

  const isVisible = phase !== 'hidden'

  const startProcessing = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    cleanupRef.current?.()
    cleanupRef.current = startChromaKeyLoop(video, canvas)
  }, [])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

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
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="md:hidden fixed inset-0 z-[997] bg-black/50"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) dismiss()
            }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[998] max-h-[75dvh] rounded-t-2xl glass-card border-t border-white/[0.08] overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent-purple" />
                <span className="text-sm font-semibold text-text-primary">El Genio Destilador</span>
              </div>
              <button
                onClick={dismiss}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={14} className="text-text-secondary" />
              </button>
            </div>

            {/* Avatar head + message */}
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Mini avatar head */}
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/10 bg-bg-tertiary">
                {config.videoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      onCanPlay={startProcessing}
                      loop
                      muted
                      playsInline
                      autoPlay
                      className="absolute opacity-0 pointer-events-none"
                      style={{ width: 1, height: 1 }}
                      aria-hidden="true"
                    />
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </>
                ) : config.imageUrl ? (
                  <img
                    src={config.imageUrl}
                    alt="Avatar"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-amber-900/30">
                    <Sparkles size={20} className="text-accent-purple" />
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                      <Sparkles size={14} className="text-accent-purple" />
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Speech bubble */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {currentMessage ? (
                    <motion.div
                      key="message"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                    >
                      <p className="text-sm text-text-primary leading-relaxed">
                        {currentMessage}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                    >
                      <p className="text-sm text-text-tertiary italic">
                        ¿En qué puedo ayudarte, maestro destilador?
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06]">
              <button
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Voice input"
              >
                <Mic size={18} className="text-text-secondary" />
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Escribe tu pregunta..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-purple/50"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 flex items-center justify-center transition-colors"
                  aria-label="Send"
                >
                  <Send size={14} className="text-accent-purple" />
                </button>
              </div>

              <button
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label={config.voiceEnabled ? 'Mute' : 'Unmute'}
              >
                {config.voiceEnabled ? (
                  <Volume2 size={18} className="text-text-secondary" />
                ) : (
                  <VolumeX size={18} className="text-text-secondary" />
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
