// src/pages/ai-chat.tsx — NeoStills v4 Dedicated AI Chat Page
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Trash2, MessageSquare, Sparkles,
  Package, Beaker, FlaskConical, ShoppingCart, BarChart3,
  Archive, ChevronLeft, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { MessageBubble } from '@/components/ai/message-bubble'
import type { AIMessage } from '@/lib/types'

// ---- Conversation type (local) ----
interface LocalConversation {
  id: string
  title: string
  contextPage: string
  messages: AIMessage[]
  createdAt: string
}

// ---- Context picker ----
const CONTEXT_OPTIONS = [
  { key: 'dashboard', icon: BarChart3, color: '#8B9BB4' },
  { key: 'inventory', icon: Package, color: '#F5A623' },
  { key: 'brewing', icon: Beaker, color: '#D4723C' },
  { key: 'fermentation', icon: FlaskConical, color: '#42A5F5' },
  { key: 'recipes', icon: Sparkles, color: '#7CB342' },
  { key: 'shop', icon: ShoppingCart, color: '#AB47BC' },
  { key: 'keezer', icon: Archive, color: '#22E6FF' },
] as const

// ---- Quick actions per context ----
function useQuickActions(context: string) {
  const { t } = useTranslation('ai')
  const key = ['inventory', 'brewing', 'fermentation', 'shop'].includes(context) ? context : 'default'
  const actions = t(`quick_actions.${key}`, { returnObjects: true }) as string[]
  return Array.isArray(actions) ? actions : []
}

// ---- Main Page ----
export default function AiChatPage() {
  const { t } = useTranslation(['common', 'ai'])
  const { setActivePage } = useUIStore()
  const isMobile = useIsMobile()

  const [conversations, setConversations] = useState<LocalConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [contextPage, setContextPage] = useState('dashboard')
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [showHistory, setShowHistory] = useState(() => window.innerWidth >= 768)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cancelStreamRef = useRef<(() => void) | null>(null)
  const streamBufferRef = useRef('')

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null
  const messages = activeConv?.messages ?? []
  const quickActions = useQuickActions(contextPage)

  useEffect(() => { setActivePage('ai-chat') }, [setActivePage])

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamBuffer])

  // Focus input when switching conversations
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConvId])

  const createConversation = useCallback((firstMessage?: string) => {
    const id = crypto.randomUUID()
    const welcome: AIMessage = {
      id: 'welcome',
      role: 'assistant',
      content: t('ai:welcome'),
      created_at: new Date().toISOString(),
    }
    const conv: LocalConversation = {
      id,
      title: firstMessage?.slice(0, 40) || t('ai:new_chat', 'Nueva conversación'),
      contextPage,
      messages: [welcome],
      createdAt: new Date().toISOString(),
    }
    setConversations(prev => [conv, ...prev])
    setActiveConvId(id)
    return id
  }, [contextPage, t])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return

    let convId = activeConvId
    if (!convId) {
      convId = createConversation(text.trim())
    }

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    }

    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: [...c.messages, userMsg], title: c.messages.length <= 1 ? text.trim().slice(0, 40) : c.title }
        : c
    ))

    setInput('')
    setIsStreaming(true)
    setStreamBuffer('')
    streamBufferRef.current = ''

    cancelStreamRef.current = api.streamChat(
      null, // server-side conversation management
      text.trim(),
      contextPage,
      (token) => {
        streamBufferRef.current += token
        setStreamBuffer(prev => prev + token)
      },
      (_newConvId) => {
        const finalContent = streamBufferRef.current
        setConversations(prev => prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, {
                  id: crypto.randomUUID(),
                  role: 'assistant' as const,
                  content: finalContent || t('ai:errors.no_response'),
                  created_at: new Date().toISOString(),
                }],
              }
            : c
        ))
        setIsStreaming(false)
        setStreamBuffer('')
      },
      (err) => {
        setConversations(prev => prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, {
                  id: crypto.randomUUID(),
                  role: 'assistant' as const,
                  content: `⚠️ ${err}`,
                  created_at: new Date().toISOString(),
                }],
              }
            : c
        ))
        setIsStreaming(false)
        setStreamBuffer('')
      }
    )
  }, [activeConvId, contextPage, createConversation, isStreaming, t])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleNewChat = () => {
    if (cancelStreamRef.current) cancelStreamRef.current()
    setIsStreaming(false)
    setStreamBuffer('')
    setActiveConvId(null)
  }

  const handleDeleteConv = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) setActiveConvId(null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation history sidebar — drawer on mobile, panel on desktop */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
            />
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? 280 : 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'bg-white/[0.02] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0',
                isMobile && 'fixed left-0 top-0 bottom-0 z-50 !w-[280px]',
              )}
            >
              {/* History header */}
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#E8E0D4]">
                  {t('ai:chat_history', 'Historial')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChat}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-none cursor-pointer bg-accent-amber/[0.12] text-accent-amber hover:bg-accent-amber/20 transition-colors"
                  >
                    <Plus size={13} className="inline align-middle mr-1" />
                    {t('ai:new_chat', 'Nueva')}
                  </button>
                  {isMobile && (
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1 text-[#5A6B80] hover:text-text-primary transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Context picker */}
              <div className="px-3 py-2 flex flex-wrap gap-1">
                {CONTEXT_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = contextPage === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setContextPage(opt.key)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[10px] font-medium border-none cursor-pointer flex items-center gap-1 transition-all',
                        active
                          ? 'text-white'
                          : 'bg-white/[0.04] text-[#8B9BB4] hover:bg-white/[0.08]',
                      )}
                      style={active ? { background: `${opt.color}18`, color: opt.color } : undefined}
                      title={t(`ai:context.${opt.key}`, opt.key)}
                    >
                      <Icon size={11} />
                      {opt.key.slice(0, 4)}
                    </button>
                  )
                })}
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto px-2 py-1">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 px-3 text-[#5A6B80] text-xs">
                    <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
                    {t('ai:no_conversations', 'Sin conversaciones aún')}
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => { setActiveConvId(conv.id); if (isMobile) setShowHistory(false) }}
                      className={cn(
                        'px-3 py-2.5 rounded-[10px] mb-1 cursor-pointer flex items-center justify-between transition-all border',
                        activeConvId === conv.id
                          ? 'bg-accent-amber/[0.08] border-accent-amber/15'
                          : 'border-transparent hover:bg-white/[0.03]',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#E8E0D4] truncate">
                          {conv.title}
                        </div>
                        <div className="text-[10px] text-[#5A6B80] mt-0.5">
                          {conv.messages.length - 1} msgs · {conv.contextPage}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteConv(conv.id) }}
                        className="p-1 rounded-md border-none cursor-pointer bg-transparent text-[#5A6B80] opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-4 md:px-5 py-3 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg border-none cursor-pointer bg-white/[0.05] text-[#8B9BB4] hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={16} className={cn('transition-transform duration-200', !showHistory && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-amber/15 flex items-center justify-center">
              <Sparkles size={16} className="text-accent-amber" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold text-[#E8E0D4] font-display">
                {t('ai:assistant_name')}
              </h1>
              <span
                className="text-[10px] font-medium"
                style={{ color: CONTEXT_OPTIONS.find(o => o.key === contextPage)?.color ?? '#8B9BB4' }}
              >
                {t(`ai:context.${contextPage}`, contextPage)}
              </span>
            </div>
          </div>
          {activeConv && (
            <div className="hidden sm:block ml-auto text-xs text-[#5A6B80] italic truncate max-w-[200px]">
              {activeConv.title}
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3">
          {/* Welcome state (no active conversation) */}
          {!activeConv && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-14 h-14 rounded-full bg-accent-amber/15 flex items-center justify-center">
                  <Sparkles size={28} className="text-accent-amber" />
                </div>
              </motion.div>
              <h2 className="text-xl font-bold text-[#E8E0D4] font-display">
                {t('ai:assistant_name')}
              </h2>
              <p className="text-[13px] text-[#8B9BB4] text-center max-w-[400px] leading-relaxed">
                {t('ai:welcome')}
              </p>

              {/* Quick action pills */}
              <div className="flex flex-wrap gap-2 justify-center max-w-[500px] mt-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="px-4 py-2 rounded-full text-xs border border-accent-amber/20 bg-accent-amber/[0.06] text-[#E8E0D4] cursor-pointer hover:bg-accent-amber/[0.12] hover:border-accent-amber/40 transition-all"
                  >
                    <Sparkles size={12} className="inline align-middle mr-1.5 text-accent-amber" />
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation messages */}
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Streaming */}
          {isStreaming && streamBuffer && (
            <MessageBubble
              message={{ id: 'streaming', role: 'assistant', content: streamBuffer, created_at: '' }}
              isStreaming
            />
          )}
          {isStreaming && !streamBuffer && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-accent-amber/15 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-accent-amber" />
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-3.5 py-2 flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-accent-amber inline-block"
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 md:px-6 pb-4 md:pb-5 pt-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-end gap-2.5 rounded-[14px] bg-white/[0.03] border border-white/[0.08] px-3.5 py-2.5 focus-within:border-accent-amber/30 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai:placeholder', 'Pregúntame cualquier cosa sobre tu destilería...')}
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#E8E0D4] resize-none max-h-[120px] overflow-y-auto leading-relaxed placeholder:text-[#5A6B80]"
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className={cn(
                'p-2 rounded-[10px] border-none cursor-pointer shrink-0 transition-all',
                input.trim() && !isStreaming
                  ? 'bg-gradient-to-br from-accent-amber to-accent-copper text-bg-primary'
                  : 'bg-white/[0.05] text-[#5A6B80] cursor-not-allowed',
              )}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-[#5A6B80] text-center mt-1.5">
            {t('ai:input_hint', 'Enter → send · Shift+Enter → new line')}
          </p>
        </div>
      </div>
    </div>
  )
}
