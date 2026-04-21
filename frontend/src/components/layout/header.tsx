// frontend/src/components/layout/header.tsx — NeoStills v3
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Search, Bell, Globe, ChevronDown, ChevronRight, User, Settings, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

// Breadcrumb helpers
const routeLabels: Record<string, string> = {
  '/': 'nav.overview',
  '/brewing': 'nav.brew_day',
  '/fermentation': 'nav.fermentation',
  '/recipes': 'nav.recipes',
  '/inventory': 'nav.inventory',
  '/procurement': 'nav.procurement',
  '/suppliers': 'nav.suppliers',
  '/devices': 'nav.devices',
  '/keezer': 'nav.keezer',
  '/analytics': 'nav.analytics',
  '/settings': 'nav.settings',
}

interface HeaderProps {
  onOpenCommandPalette: () => void
  onOpenNotifications: () => void
}

export function Header({ onOpenCommandPalette, onOpenNotifications }: HeaderProps) {
  const { t } = useTranslation('common')
  const { user, brewery, logout } = useAuthStore()
  const { language, setLanguage, unreadCount } = useUIStore()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    void navigate({ to: '/login' })
  }

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es')
  }

  // Build breadcrumb from path
  const breadcrumbLabel = routeLabels[currentPath]

  return (
    <header className="shrink-0" role="banner">
      {/* Top bar */}
      <div className="h-14 flex items-center gap-4 px-4 md:px-6 bg-bg-secondary/70 backdrop-blur-xl border-b border-accent-cobalt/20">
        {/* Logo (mobile only) */}
        <Logo size="sm" showText={false} className="md:hidden shrink-0" />

        {/* Search trigger — opens command palette */}
        <button
          onClick={onOpenCommandPalette}
          className="flex-1 max-w-md"
          aria-label={t('actions.search')}
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary/70 border border-accent-cobalt/20 hover:border-accent-cobalt/40 transition-colors cursor-pointer backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <Search size={15} className="text-text-tertiary" />
            <span className="text-sm text-text-tertiary flex-1 text-left">{t('actions.search')}...</span>
            <span className="kbd hidden sm:inline">⌘K</span>
          </div>
        </button>

        <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-full border border-accent-cobalt/25 bg-bg-card/60 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span className="iot-pulse-dot" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Sensores online</span>
          <span className="text-sm font-mono live-value">12/12</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Language */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium text-text-tertiary hover:text-text-primary hover:bg-bg-hover/70 border border-transparent hover:border-accent-cobalt/20 transition-all"
            title={t('settings.language')}
            aria-label={t('settings.language')}
          >
            <Globe size={16} />
            <span className="hidden sm:inline uppercase text-xs">{language}</span>
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-hover/70 border border-transparent hover:border-accent-cobalt/20 transition-all"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-accent-danger text-white rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User menu (desktop only — avatar in sidebar) */}
          <div className="relative hidden md:block" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl border border-transparent hover:border-accent-cobalt/20 hover:bg-bg-hover/70 transition-all"
              aria-label="User menu"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-7 h-7 rounded-full bg-accent-amber/20 border border-accent-amber/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-accent-amber">
                  {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </div>
              <ChevronDown size={14} className={cn('text-text-tertiary transition-transform', userMenuOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full mt-2 w-52 glass-card rounded-2xl shadow-elevated z-50 py-1 overflow-hidden border border-accent-cobalt/20"
                >
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-medium text-text-primary">{user?.full_name}</p>
                    <p className="text-xs text-text-secondary">{user?.email}</p>
                    {brewery && <p className="text-2xs text-text-tertiary mt-1">{brewery.name}</p>}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { void navigate({ to: '/settings' }); setUserMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all"
                    >
                      <Settings size={15} /> {t('nav.settings')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-accent-danger hover:bg-bg-hover transition-all"
                    >
                      <LogOut size={15} /> {t('auth.logout')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Breadcrumb bar */}
      {breadcrumbLabel && currentPath !== '/' && (
        <div className="px-4 md:px-6 py-2 bg-bg-primary/45 backdrop-blur-md border-b border-accent-cobalt/10">
          <nav className="breadcrumb" aria-label="breadcrumb">
            <a href="/" onClick={(e) => { e.preventDefault(); void navigate({ to: '/' }) }}>
              {t('nav.overview')}
            </a>
            <ChevronRight size={12} />
            <span className="breadcrumb-current">{t(breadcrumbLabel)}</span>
          </nav>
        </div>
      )}
    </header>
  )
}
