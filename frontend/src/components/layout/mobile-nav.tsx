// frontend/src/components/layout/mobile-nav.tsx — NeoStills v4
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Beaker, FlaskConical, Package,
  MoreHorizontal, BookOpen, Droplets, Archive, ShoppingCart,
  Users, GraduationCap, Settings, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const primaryItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.overview' },
  { to: '/brewing', icon: Beaker, labelKey: 'nav.brew_day' },
  { to: '/fermentation', icon: FlaskConical, labelKey: 'nav.fermentation' },
  { to: '/inventory', icon: Package, labelKey: 'nav.inventory' },
]

const moreItems = [
  { to: '/recipes', icon: BookOpen, labelKey: 'nav.recipes' },
  { to: '/water-lab', icon: Droplets, labelKey: 'nav.water_lab' },
  { to: '/keezer', icon: Archive, labelKey: 'nav.keezer' },
  { to: '/procurement', icon: ShoppingCart, labelKey: 'nav.procurement' },
  { to: '/pool-buying', icon: Users, labelKey: 'nav.pool_buying' },
  { to: '/brew-academy', icon: GraduationCap, labelKey: 'nav.brew_academy' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function MobileNav() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [moreOpen, setMoreOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const isActive = (to: string) =>
    to === '/' ? currentPath === '/' : currentPath.startsWith(to)

  // Is any "More" page active?
  const isMoreActive = moreItems.some((item) => isActive(item.to))

  // Close on route change
  useEffect(() => {
    setMoreOpen(false)
  }, [currentPath])

  // Close on outside click
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen])

  return (
    <>
      {/* More menu sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed bottom-14 left-0 right-0 z-50 bg-bg-secondary/98 backdrop-blur-xl border-t border-accent-cobalt/20 rounded-t-2xl safe-area-pb"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Más opciones
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 px-3 pb-3">
                {moreItems.map(({ to, icon: Icon, labelKey }) => (
                  <button
                    key={to}
                    onClick={() => {
                      navigate({ to })
                      setMoreOpen(false)
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-colors',
                      isActive(to)
                        ? 'bg-[linear-gradient(180deg,rgba(184,115,51,0.18)_0%,rgba(184,115,51,0.08)_100%)] text-accent-copper border border-accent-copper/20'
                        : 'text-text-tertiary hover:bg-white/[0.04] hover:text-text-secondary border border-transparent',
                    )}
                  >
                    <Icon size={22} />
                    <span className="text-2xs font-medium leading-tight text-center">
                      {t(labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary/95 backdrop-blur-xl border-t border-accent-cobalt/16 safe-area-pb"
        aria-label={t('nav.mobile_navigation', 'Mobile navigation')}
      >
        <div className="flex items-stretch justify-around h-14">
          {primaryItems.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 text-text-tertiary transition-colors',
                isActive(to) && 'text-accent-copper',
              )}
            >
              <Icon size={20} />
              <span className="text-2xs font-medium">{t(labelKey)}</span>
            </Link>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 text-text-tertiary transition-colors',
              (moreOpen || isMoreActive) && 'text-accent-copper',
            )}
            aria-label={t('nav.more', 'Más')}
          >
            <MoreHorizontal size={20} />
            <span className="text-2xs font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
