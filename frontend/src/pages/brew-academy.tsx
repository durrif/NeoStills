// frontend/src/pages/brew-academy.tsx — NeoStills v4 FASE 8
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  GraduationCap, Search, BookmarkCheck, BarChart3,
  Eye, Timer as TimerIcon,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useAcademyStore } from '@/stores/academy-store'
import { TUTORIALS, CATEGORY_META } from '@/data/tutorials'
import type { TutorialCategory } from '@/data/tutorials'
import TutorialCard from '@/components/academy/tutorial-card'
import VisionPanel from '@/components/academy/vision-panel'
import BrewCoach from '@/components/academy/brew-coach'

const ALL_CATEGORIES: (TutorialCategory | 'all')[] = [
  'all', 'basics', 'mashing', 'boil', 'fermentation',
  'packaging', 'advanced', 'troubleshooting',
]

export default function BrewAcademyPage() {
  const { t } = useTranslation('common')
  const setActivePage = useUIStore((s) => s.setActivePage)
  const {
    activeCategory, searchQuery, watchHistory, bookmarks,
    setCategory, setSearch,
  } = useAcademyStore()

  useEffect(() => { setActivePage('brew_academy') }, [setActivePage])

  // Filter tutorials
  const filteredTutorials = useMemo(() => {
    let list = TUTORIALS
    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    return list
  }, [activeCategory, searchQuery])

  const watchedCount = watchHistory.length
  const bookmarkCount = bookmarks.length
  const totalDuration = TUTORIALS.reduce((s, t) => s + t.duration, 0)
  const watchedDuration = watchHistory.reduce((s, w) => {
    const tut = TUTORIALS.find((t) => t.id === w.tutorialId)
    return s + (tut?.duration ?? 0)
  }, 0)
  const progressPct = totalDuration > 0 ? (watchedDuration / totalDuration) * 100 : 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <GraduationCap className="text-accent-purple" size={28} />
            {t('nav.brew_academy')}
          </h1>
          <p className="page-header__subtitle">
            Tutoriales, corrección visual IA y coaching en tiempo real
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: GraduationCap,
            label: 'Tutoriales',
            value: `${TUTORIALS.length}`,
            sub: `${filteredTutorials.length} visibles`,
            color: '#9C6ADE',
          },
          {
            icon: Eye,
            label: 'Vistos',
            value: `${watchedCount}`,
            sub: `${Math.round(progressPct)}% completado`,
            color: '#7CB342',
          },
          {
            icon: BookmarkCheck,
            label: 'Guardados',
            value: `${bookmarkCount}`,
            sub: 'marcadores',
            color: '#F5A623',
          },
          {
            icon: BarChart3,
            label: 'Duración total',
            value: `${Math.round(totalDuration / 60)}`,
            sub: 'minutos de contenido',
            color: '#42A5F5',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-3 border border-white/[0.07] flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${stat.color}15` }}
            >
              <stat.icon size={18} color={stat.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary font-display leading-none">
                {stat.value}
              </div>
              <div className="text-[10px] text-text-tertiary">{stat.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass-card rounded-xl p-3 border border-white/[0.07]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-text-secondary">Progreso general</span>
          <span className="text-xs text-text-tertiary font-mono">
            {watchedCount}/{TUTORIALS.length} completados
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #9C6ADE, #F5A623)' }}
          />
        </div>
      </div>

      {/* Main layout: Tutorials (left) + Tools (right) */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Tutorial Library */}
        <div className="space-y-4">
          {/* Search + Category filters */}
          <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="text"
                placeholder="Buscar tutoriales..."
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] 
                  text-sm text-text-primary placeholder:text-text-tertiary 
                  focus:outline-none focus:border-accent-purple/40 transition-colors"
              />
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const isAll = cat === 'all'
                const meta = isAll ? null : CATEGORY_META[cat]
                const count = isAll
                  ? TUTORIALS.length
                  : TUTORIALS.filter((t) => t.category === cat).length
                const isActive = activeCategory === cat

                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                        : 'bg-white/[0.04] text-text-secondary border border-transparent hover:bg-white/[0.06]'
                    }`}
                  >
                    {isAll ? '📋' : meta?.emoji}
                    <span>{isAll ? 'Todos' : meta?.label}</span>
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tutorial grid */}
          {filteredTutorials.length > 0 ? (
            <div className="grid gap-3">
              {filteredTutorials.map((tutorial, i) => (
                <motion.div
                  key={tutorial.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <TutorialCard tutorial={tutorial} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center border border-white/[0.07]">
              <Search size={32} className="text-text-tertiary mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-secondary">
                No se encontraron tutoriales para "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearch('')
                  setCategory('all')
                }}
                className="mt-2 text-xs text-accent-purple hover:text-accent-amber transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Right: Vision AI + Brew Coach */}
        <div className="space-y-4">
          {/* AI Vision Panel */}
          <VisionPanel />

          {/* Brew Coach Mode */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TimerIcon size={12} className="text-accent-hop" />
              Modo Coach de Proceso
            </h3>
            <BrewCoach />
          </div>
        </div>
      </div>
    </div>
  )
}
