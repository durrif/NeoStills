// frontend/src/components/layout/command-palette.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Beaker, FlaskConical, BookOpen,
  Package, ShoppingCart, Cpu, Archive, BarChart3, Bot, Settings,
  ArrowRight,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  category: string
  icon: React.ElementType
  action: () => void
  keywords?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'nav-overview', label: t('nav.overview'), category: 'nav', icon: LayoutDashboard, action: () => void navigate({ to: '/' }), keywords: 'dashboard home inicio' },
    { id: 'nav-brew', label: t('nav.brew_day'), category: 'nav', icon: Beaker, action: () => void navigate({ to: '/brewing' }), keywords: 'destilacion mash wash spirit run stripping' },
    { id: 'nav-ferm', label: t('nav.fermentation'), category: 'nav', icon: FlaskConical, action: () => void navigate({ to: '/fermentation' }), keywords: 'fermentación fermenter ispindel' },
    { id: 'nav-recipes', label: t('nav.recipes'), category: 'nav', icon: BookOpen, action: () => void navigate({ to: '/recipes' }), keywords: 'recetas recipe ipa stout' },
    { id: 'nav-inv', label: t('nav.inventory'), category: 'nav', icon: Package, action: () => void navigate({ to: '/inventory' }), keywords: 'inventario stock ingredientes' },
    { id: 'nav-proc', label: t('nav.procurement'), category: 'nav', icon: ShoppingCart, action: () => void navigate({ to: '/procurement' }), keywords: 'compras granos botanicos proveedores' },
    { id: 'nav-devices', label: t('nav.devices'), category: 'nav', icon: Cpu, action: () => void navigate({ to: '/devices' }), keywords: 'alambique still condensador sensor iot' },
    { id: 'nav-keezer', label: t('nav.keezer'), category: 'nav', icon: Archive, action: () => void navigate({ to: '/keezer' }), keywords: 'aging barrel barrica maduracion storage' },
    { id: 'nav-analytics', label: t('nav.analytics'), category: 'nav', icon: BarChart3, action: () => void navigate({ to: '/analytics' }), keywords: 'estadísticas analytics' },
    { id: 'nav-ai', label: t('nav.ai_assistant'), category: 'nav', icon: Bot, action: () => { onClose(); import('@/stores/ui-store').then(m => m.useUIStore.getState().openAiPanel()) }, keywords: 'ai genio destilador chat cortes recetas' },
    { id: 'nav-settings', label: t('nav.settings'), category: 'nav', icon: Settings, action: () => void navigate({ to: '/settings' }), keywords: 'ajustes configuración' },
  ], [t, navigate, onClose])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.keywords?.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    )
  }, [query, commands])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length])

  const runSelected = useCallback(() => {
    const item = filtered[selectedIndex]
    if (item) {
      item.action()
      onClose()
    }
  }, [filtered, selectedIndex, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runSelected()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="cmd-palette-backdrop"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="cmd-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
          >
            <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
              <Search size={18} className="text-text-tertiary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('actions.search') + '... (⌘K)'}
                className="cmd-palette-input"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search commands"
              />
            </div>
            <div ref={listRef} className="max-h-72 overflow-y-auto py-1.5 no-scrollbar">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-text-tertiary py-6">
                  {t('status.empty')}
                </p>
              )}
              {filtered.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    className={`cmd-result ${idx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => { item.action(); onClose() }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Icon size={16} className="shrink-0 text-text-tertiary" />
                    <span className="flex-1">{item.label}</span>
                    <span className="cmd-result-badge">{item.category}</span>
                    {idx === selectedIndex && (
                      <ArrowRight size={14} className="text-accent-amber" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.06] text-2xs text-text-tertiary">
              <span><span className="kbd">↑↓</span> navegar</span>
              <span><span className="kbd">↵</span> abrir</span>
              <span><span className="kbd">esc</span> cerrar</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
