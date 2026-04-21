// frontend/src/components/ai/ai-panel.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, X, Volume2, VolumeX } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useAvatarStore } from '@/stores/avatar-store'
import { startChromaKeyLoop } from '@/lib/chroma-key'
import { useInventory, useInventoryAlerts } from '@/hooks/use-inventory'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { MessageBubble } from './message-bubble'
import { QuickActions } from './quick-actions'
import { ContextBadge } from './context-badge'
import type { AIMessage } from '@/lib/types'

/** Map avatar preset voice IDs to TTS voice identifiers.
 * 'comandante-lara' → Replicate XTTS-v2 voice cloning (backend decides)
 * Others → Together AI Cartesia Sonic preset voices */
const VOICE_MAP: Record<string, string> = {
  david_own:           'comandante-lara',                   // Voz clonada del Comandante Lara (Replicate XTTS-v2)
  warm_male_es:        'spanish-speaking storyteller man',  // Voz cálida masculina (ES)
  energetic_female_es: 'young spanish-speaking woman',      // Voz enérgica femenina (ES)
  deep_male_en:        'nonfiction man',                    // Deep warm male (EN)
  friendly_female_en:  'friendly sidekick',                 // Friendly female (EN)
}
const DEFAULT_VOICE = 'spanish narrator man'

export function AiPanel() {
  const { t } = useTranslation(['common', 'ai'])
  const { closeAiPanel, activePage } = useUIStore()
  const { config, setConfig } = useAvatarStore()

  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cancelStreamRef = useRef<(() => void) | null>(null)

  // Fetch brewery context data for AI
  const { data: inventoryData } = useInventory({ page_size: 200 })
  const { expiring, lowStock } = useInventoryAlerts()

  /** Build context_data object from live brewery data */
  const buildContextData = useCallback((): Record<string, unknown> | null => {
    const ctx: Record<string, unknown> = {}

    // Inventory summary
    if (inventoryData?.items?.length) {
      const byCategory: Record<string, Array<{ name: string; qty: string; expiry?: string }>> = {}
      for (const item of inventoryData.items) {
        const cat = item.category || 'otros'
        if (!byCategory[cat]) byCategory[cat] = []
        byCategory[cat].push({
          name: item.name,
          qty: `${item.quantity} ${item.unit}`,
          ...(item.expiry_date ? { expiry: item.expiry_date } : {}),
        })
      }
      ctx.inventario = byCategory
      ctx.total_ingredientes = inventoryData.items.length
    }

    // Expiring items
    if (expiring.data?.length) {
      ctx.ingredientes_caducando = expiring.data.map(i => ({
        name: i.name,
        category: i.category,
        qty: `${i.quantity} ${i.unit}`,
        expiry: i.expiry_date,
      }))
    }

    // Low stock items
    if (lowStock.data?.length) {
      ctx.stock_bajo = lowStock.data.map(i => ({
        name: i.name,
        category: i.category,
        qty: `${i.quantity} ${i.unit}`,
        min_stock: i.min_stock,
      }))
    }

    return Object.keys(ctx).length > 0 ? ctx : null
  }, [inventoryData, expiring.data, lowStock.data])

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: t('ai:welcome'),
        created_at: new Date().toISOString(),
      }])
    }
  }, [t, messages.length])

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamBuffer])

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAiPanel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeAiPanel])

  // Auto-enable voice on first open
  const voiceInitDone = useRef(false)
  useEffect(() => {
    if (!voiceInitDone.current && !config.voiceEnabled && config.presetVoice === null && config.voiceModelId === null) {
      setConfig({ voiceEnabled: true })
      voiceInitDone.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio element ref for backend TTS playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioBlobUrl = useRef<string | null>(null)

  // Resolve edge-tts voice name from avatar preset config
  const resolvedVoice = config.presetVoice ? (VOICE_MAP[config.presetVoice] ?? DEFAULT_VOICE) : DEFAULT_VOICE

  /** Speak text using backend edge-tts — fetches audio from /api/v1/ai/tts */
  const speakText = useCallback(async (text: string) => {
    if (!config.voiceEnabled) return

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioBlobUrl.current) {
      URL.revokeObjectURL(audioBlobUrl.current)
      audioBlobUrl.current = null
    }

    try {
      console.log('[TTS] Fetching audio from backend, voice:', resolvedVoice, 'text length:', text.length)
      const blobUrl = await api.fetchTTSAudio(text, resolvedVoice)
      audioBlobUrl.current = blobUrl

      const audio = new Audio(blobUrl)
      audioRef.current = audio
      audio.onplay = () => setIsSpeaking(true)
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(blobUrl)
        audioBlobUrl.current = null
      }
      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error:', e)
        setIsSpeaking(false)
      }
      await audio.play()
      console.log('[TTS] Playing audio')
    } catch (err) {
      console.error('[TTS] Failed to fetch/play audio:', err)
      setIsSpeaking(false)
    }
  }, [config.voiceEnabled, resolvedVoice])

  const toggleVoice = useCallback(() => {
    const newVal = !config.voiceEnabled
    setConfig({ voiceEnabled: newVal })
    if (!newVal) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsSpeaking(false)
    } else {
      // Test TTS when enabling — use avatar's configured voice
      api.fetchTTSAudio('Voz activada', resolvedVoice).then(blobUrl => {
        const audio = new Audio(blobUrl)
        audio.onplay = () => setIsSpeaking(true)
        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(blobUrl)
        }
        audio.play().catch(e => console.error('[TTS] Test play error:', e))
      }).catch(e => console.error('[TTS] Test fetch error:', e))
    }
  }, [config.voiceEnabled, setConfig, resolvedVoice])

  const streamBufferRef = useRef('')

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return
    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)
    setStreamBuffer('')
    streamBufferRef.current = ''

    cancelStreamRef.current = api.streamChat(
      conversationId,
      text.trim(),
      activePage,
      (token) => {
        streamBufferRef.current += token
        setStreamBuffer(prev => prev + token)
      },
      (newConvId) => {
        setConversationId(newConvId)
        const finalContent = streamBufferRef.current
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: finalContent || t('ai:errors.no_response'),
          created_at: new Date().toISOString(),
        }])
        setIsStreaming(false)
        setStreamBuffer('')
        // Speak the response
        if (finalContent) speakText(finalContent)
      },
      (err) => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ ${err}`,
          created_at: new Date().toISOString(),
        }])
        setIsStreaming(false)
        setStreamBuffer('')
      },
      buildContextData()
    )
  }, [isStreaming, conversationId, activePage, t, speakText, buildContextData])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleNewChat = () => {
    if (cancelStreamRef.current) cancelStreamRef.current()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setIsSpeaking(false)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: t('ai:welcome'),
      created_at: new Date().toISOString(),
    }])
    setConversationId(null)
    setIsStreaming(false)
    setStreamBuffer('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={t('ai:assistant_name')}
    >
      {/* Dark blurred backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent-purple/10 blur-[120px]"
          animate={isSpeaking || isStreaming ? { scale: [1, 1.15, 1], opacity: [0.1, 0.18, 0.1] } : {}}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="absolute bottom-[30%] left-[30%] w-[300px] h-[300px] rounded-full bg-accent-amber/5 blur-[100px]" />
      </div>

      {/* Content layer */}
      <div className="relative flex flex-col h-full">
        {/* Top bar — name, status, controls */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 pt-3 md:pt-4 pb-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base md:text-lg font-display font-semibold text-text-primary">{t('ai:assistant_name')}</h2>
            <div className={cn(
              'w-2 h-2 rounded-full',
              isSpeaking ? 'bg-accent-purple animate-pulse' :
              isStreaming ? 'bg-accent-amber animate-pulse' :
              'bg-emerald-500'
            )} />
            {isSpeaking && (
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <motion.span
                    key={i}
                    className="w-0.5 bg-accent-purple rounded-full"
                    animate={{ height: ['3px', '12px', '3px'] }}
                    transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
                  />
                ))}
              </div>
            )}
            {isStreaming && !isSpeaking && (
              <span className="text-xs text-accent-amber animate-pulse">{t('common:ai.thinking')}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <ContextBadge page={activePage} />
            <button
              onClick={toggleVoice}
              className={cn(
                'p-2 rounded-full transition-all',
                config.voiceEnabled
                  ? 'bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30'
                  : 'bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.1]'
              )}
              title={config.voiceEnabled ? 'Silenciar voz' : 'Activar voz'}
            >
              {config.voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-full bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.1] transition-all"
              title="Nueva conversación"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={closeAiPanel}
              className="p-2 rounded-full bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.1] transition-all"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Avatar hero — centered, large, half-body */}
        <div className="flex-shrink-0">
          <AvatarHero isSpeaking={isSpeaking} isStreaming={isStreaming} />
        </div>

        {/* Messages — scrollable centered column */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-3 no-scrollbar">
          <div className="max-w-2xl mx-auto space-y-3">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {isStreaming && streamBuffer && (
              <MessageBubble
                message={{ id: 'streaming', role: 'assistant', content: streamBuffer, created_at: '' }}
                isStreaming
              />
            )}
            {isStreaming && !streamBuffer && (
              <div className="flex gap-2 items-center">
                <span className="text-xl">🤖</span>
                <div className="glass-card rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-accent-amber"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Quick actions */}
        {messages.length <= 1 && (
          <div className="flex-shrink-0 px-4 md:px-8">
            <div className="max-w-2xl mx-auto">
              <QuickActions page={activePage} onSelect={sendMessage} />
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex-shrink-0 px-4 md:px-8 pb-4 md:pb-6 pt-2">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.1] px-4 py-2.5 backdrop-blur-sm focus-within:ring-1 focus-within:ring-accent-amber/50 transition-all shadow-lg">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('ai.placeholder')}
                rows={1}
                disabled={isStreaming}
                aria-label={t('ai.placeholder')}
                className={cn(
                  'flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50',
                  'resize-none focus:outline-none max-h-32 overflow-y-auto no-scrollbar'
                )}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement
                  el.style.height = 'auto'
                  el.style.height = `${el.scrollHeight}px`
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'p-2 rounded-xl transition-all shrink-0',
                  input.trim() && !isStreaming
                    ? 'bg-amber-gradient text-bg-primary hover:shadow-glow'
                    : 'text-text-secondary/40 cursor-not-allowed'
                )}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-text-secondary/40 mt-1.5 text-center">{t('ai:input_hint', 'Enter para enviar · Shift+Enter nueva línea · Esc para cerrar')}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Large avatar hero for the distillery assistant */
function AvatarHero({ isSpeaking, isStreaming }: { isSpeaking: boolean; isStreaming: boolean }) {
  const { t } = useTranslation('ai')
  const { config } = useAvatarStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [chromaOk, setChromaOk] = useState(true)
  const isAnimated = isSpeaking || isStreaming

  const startProcessing = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    cleanupRef.current?.()

    const testCtx = canvas.getContext('2d', { willReadFrequently: true })
    if (testCtx && video.videoWidth > 0) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      testCtx.drawImage(video, 0, 0)
      try {
        testCtx.getImageData(0, 0, 1, 1)
        cleanupRef.current = startChromaKeyLoop(video, canvas)
        setChromaOk(true)
      } catch {
        setChromaOk(false)
      }
    } else {
      cleanupRef.current = startChromaKeyLoop(video, canvas)
    }
  }, [])

  useEffect(() => {
    return () => { cleanupRef.current?.() }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !config.videoUrl) return
    video.src = config.videoUrl
    video.load()
  }, [config.videoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = isAnimated ? 1.2 : 0.6
  }, [isAnimated])

  const hasVideo = !!config.videoUrl
  const hasImage = !!config.imageUrl

  return (
    <div className="relative flex items-end justify-center h-[28vh] md:h-[35vh] overflow-hidden">
      {/* Magical glow */}
      <div className={cn(
        'absolute inset-0 transition-opacity duration-700',
        isAnimated ? 'opacity-100' : 'opacity-40'
      )}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 md:w-80 md:h-80 rounded-full bg-accent-purple/20 blur-[60px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-32 h-32 md:w-48 md:h-48 rounded-full bg-accent-amber/10 blur-[40px]" />
      </div>

      {/* Avatar figure */}
      <div className="relative h-full flex items-end justify-center">
        {hasVideo ? (
          <div className={cn(
            'relative w-52 h-56 md:w-72 md:h-80 lg:w-80 lg:h-[22rem] transition-transform duration-500',
            isAnimated ? 'scale-105' : 'scale-100'
          )}>
            <video
              ref={videoRef}
              onCanPlay={startProcessing}
              crossOrigin="anonymous"
              loop
              muted
              playsInline
              autoPlay
              className={cn(
                'w-full h-full object-cover object-top',
                chromaOk ? 'absolute inset-0 opacity-0 pointer-events-none' : ''
              )}
              aria-hidden={chromaOk}
            />
            {chromaOk && (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover object-top"
              />
            )}
          </div>
        ) : hasImage ? (
          <div className={cn(
            'relative w-48 h-56 md:w-64 md:h-72 lg:w-72 lg:h-80 transition-transform duration-500',
            isAnimated ? 'scale-105' : 'scale-100'
          )}>
            <img
              src={config.imageUrl!}
              alt={t('ai:assistant_name')}
              className="w-full h-full object-cover object-top rounded-t-3xl"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center pb-8">
            <motion.span
              className="text-7xl md:text-8xl lg:text-9xl"
              animate={isAnimated ? {
                y: [0, -10, 0],
                scale: [1, 1.12, 1],
              } : {
                y: [0, -5, 0],
              }}
              transition={{ duration: isAnimated ? 0.8 : 3, repeat: Infinity }}
            >
              🧞
            </motion.span>
          </div>
        )}
      </div>

      {/* Speaking pulse rings */}
      {isAnimated && (
        <>
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-16 md:w-56 md:h-20 rounded-full border border-accent-purple/30"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-16 md:w-56 md:h-20 rounded-full border border-accent-amber/20"
            animate={{ scale: [1, 1.7], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}

      {/* Gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/85 to-transparent" />
    </div>
  )
}
