// frontend/src/components/layout/app-shell.tsx — NeoStills v4
import { type ReactNode, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouterState } from '@tanstack/react-router'
import { useUIStore } from '@/stores/ui-store'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'
import { AiPanel } from '@/components/ai/ai-panel'
import { CommandPalette } from './command-palette'
import { NotificationCenter } from './notification-center'
import { BarrelTrigger } from '@/components/avatar/barrel-trigger'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineBanner } from '@/components/pwa/offline-banner'
import { usePageTitle } from '@/hooks/use-page-title'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

const ambientClasses: Record<string, string> = {
  idle: 'ambient-idle',
  planned: 'ambient-planned',
  mashing: 'ambient-mashing',
  boiling: 'ambient-boiling',
  fermenting: 'ambient-fermenting',
  conditioning: 'ambient-conditioning',
}

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
}

export function AppShell({ children }: AppShellProps) {
  const { aiPanelOpen, brewPhase } = useUIStore()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  // Dynamic page title
  const pageId = currentPath === '/' ? 'dashboard' : currentPath.slice(1)
  usePageTitle(pageId)

  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Keyboard shortcut: Cmd/Ctrl + K → command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const openCmdPalette = useCallback(() => setCmdPaletteOpen(true), [])
  const closeCmdPalette = useCallback(() => setCmdPaletteOpen(false), [])
  const openNotif = useCallback(() => setNotifOpen(true), [])
  const closeNotif = useCallback(() => setNotifOpen(false), [])

  const ambientClass = ambientClasses[brewPhase] ?? 'ambient-idle'

  return (
    <div className={cn('system-shell flex h-dvh overflow-hidden bg-bg-primary', ambientClass)}>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-accent-amber focus:text-bg-primary focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>

      <div className="system-background system-background--main" />
      <div className="system-background system-background--schematic" />
      <div className="system-background system-background--vignette" />

      {/* Ambient background overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-1000"
        style={{ background: 'radial-gradient(ellipse at top right, var(--ambient-color, transparent), transparent 70%)' }}
      />

      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        <InstallPrompt />
        <OfflineBanner />
        <Header
          onOpenCommandPalette={openCmdPalette}
          onOpenNotifications={openNotif}
        />

        <main id="main-content" className="flex-1 overflow-y-auto pb-20 md:pb-0" role="main">
          <motion.div
            key={currentPath}
            {...pageTransition}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* AI Agent — full-screen overlay */}
      <AnimatePresence>
        {aiPanelOpen && <AiPanel />}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette open={cmdPaletteOpen} onClose={closeCmdPalette} />

      {/* Notification Center */}
      <NotificationCenter open={notifOpen} onClose={closeNotif} />

      {/* AI trigger */}
      <BarrelTrigger />

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
