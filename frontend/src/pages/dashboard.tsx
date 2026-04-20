// frontend/src/pages/dashboard.tsx — NeoStills v3 Command Center
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  Package, Beaker, FlaskConical, Beer,
  AlertTriangle, Calendar, ChevronRight,
  Thermometer, Droplets, ArrowRight,
  Bot, Clock, Activity, Zap,
  CheckCircle2, AlertCircle, Info, ShoppingCart
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useInventory, useInventoryAlerts } from '@/hooks/use-inventory'
import { useBrewSessions } from '@/hooks/use-brewing'
import { useActiveFermentations, useLatestISpindelReading } from '@/hooks/use-fermentation'
import { cn, daysUntilExpiry, formatDate } from '@/lib/utils'

/* ── animation helpers ──────────────────────────────────────────── */
const card = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const, delay: i * 0.06 },
})

/* ── mini sparkline data (synthetic for KPI trend) ──────────────── */
const synthSparkline = (base: number, n = 7) =>
  Array.from({ length: n }, (_, i) => ({
    v: Math.max(0, base + Math.round((Math.random() - 0.4) * base * 0.3 * (i / n))),
  }))

/* ── FermenterMini component ────────────────────────────────────── */
function FermenterMini({ session }: { session: { id: number; brew_session_name: string; started_at: string } }) {
  const { data: reading } = useLatestISpindelReading(session.id)
  const daysSinceStart = Math.max(1, Math.round((Date.now() - new Date(session.started_at).getTime()) / 86_400_000))

  const gravity = (reading as unknown as { gravity?: number })?.gravity
  const temperature = (reading as unknown as { temperature?: number })?.temperature

  const statusColor = gravity && gravity < 1.015 ? 'bg-accent-hop' :
                      gravity && gravity < 1.030 ? 'bg-accent-amber' : 'bg-accent-info'

  return (
    <Link to="/fermentation" className="block shrink-0">
      <div className="w-44 glass-card rounded-xl p-4 hover:border-accent-amber/30 transition-all group cursor-pointer">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('w-2.5 h-2.5 rounded-full', statusColor)} />
          <span className="text-xs text-text-secondary truncate">{session.brew_session_name}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Droplets size={11} /> SG
            </span>
            <span className="text-sm font-display font-bold text-text-primary tabular-nums">
              {gravity?.toFixed(3) ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Thermometer size={11} /> °C
            </span>
            <span className="text-sm font-display font-bold text-text-primary tabular-nums">
              {temperature?.toFixed(1) ?? '—'}
            </span>
          </div>
          <div className="text-[10px] text-text-tertiary text-right">
            Día {daysSinceStart}
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t } = useTranslation(['common', 'inventory', 'brewing'])
  const { user, brewery } = useAuthStore()
  const { setActivePage, openAiPanel } = useUIStore()

  useEffect(() => { setActivePage('dashboard') }, [setActivePage])

  /* ── data fetching ─────────────────────────────────────────── */
  const { data: inventoryData } = useInventory({ page_size: 200 })
  const { data: brewSessions } = useBrewSessions()
  const { data: fermentingSessions } = useBrewSessions('fermenting')
  const { lowStock, expiring } = useInventoryAlerts()
  const { data: activeFermentations } = useActiveFermentations()

  const ingredientCount = inventoryData?.total ?? 0
  const allSessions = Array.isArray(brewSessions) ? brewSessions : []
  const brewCount = allSessions.length
  const fermentingCount = Array.isArray(fermentingSessions) ? fermentingSessions.length : 0
  const lowStockItems = Array.isArray(lowStock.data) ? lowStock.data : []
  const lowStockCount = lowStockItems.length
  const expiringItems = Array.isArray(expiring.data) ? expiring.data : []
  const activeFerms = Array.isArray(activeFermentations) ? activeFermentations : []

  /* ── Synthetic "ready to serve" count ──────────────────────── */
  const readyToServe = useMemo(() => {
    return allSessions.filter(s => s.phase === 'aging' || s.phase === 'bottling' || s.phase === 'completed').length
  }, [allSessions])

  /* ── AI Recommendation (rule-based, in future: AI endpoint) ── */
  const aiRecommendation = useMemo(() => {
    if (expiringItems.length > 0) {
      const names = expiringItems.slice(0, 3).map(i => i.name).join(', ')
      return {
        text: t('dashboard.ai_expiring_suggestion', {
          ingredients: names,
          defaultValue: `Tienes ${names} a punto de caducar. Perfecto para una sesión de elaboración este fin de semana. ¿Creo una receta?`
        }),
        primaryAction: t('dashboard.ai_create_recipe', 'Crear receta'),
        secondaryAction: t('dashboard.ai_later', 'Recordar después'),
      }
    }
    if (lowStockCount > 0) {
      return {
        text: t('dashboard.ai_low_stock_suggestion', {
          count: lowStockCount,
          defaultValue: `${lowStockCount} ingredientes tienen stock bajo. ¿Quieres que prepare una lista de compra optimizada?`
        }),
        primaryAction: t('dashboard.ai_shop', 'Lista de compra'),
        secondaryAction: t('dashboard.ai_later', 'Después'),
      }
    }
    return {
      text: t('dashboard.ai_default', '¡Tu cervecería está en orden! ¿Empezamos un nuevo lote o exploramos una nueva receta?'),
      primaryAction: t('dashboard.ai_new_brew', 'Nuevo lote'),
      secondaryAction: t('dashboard.ai_explore', 'Explorar recetas'),
    }
  }, [expiringItems, lowStockCount, t])

  /* ── KPI stats ─────────────────────────────────────────────── */
  const stats = [
    {
      icon: Package, label: t('nav.inventory'), value: ingredientCount,
      sub: expiringItems.length > 0 ? `▲${expiringItems.length} ${t('dashboard.expiring_short', 'caducando')}` : undefined,
      subColor: 'text-status-warning',
      color: 'text-accent-amber', bg: 'bg-accent-amber/10', to: '/inventory' as const,
      spark: synthSparkline(ingredientCount), sparkColor: '#F5A623',
    },
    {
      icon: Beaker, label: t('dashboard.active_brews', 'Lotes activos'), value: brewCount,
      sub: allSessions.find(s => s.phase === 'stripping_run' || s.phase === 'mashing')
        ? allSessions.find(s => s.phase === 'stripping_run' || s.phase === 'mashing')!.name
        : undefined,
      subColor: 'text-accent-copper',
      color: 'text-accent-copper', bg: 'bg-accent-copper/10', to: '/brewing' as const,
      spark: synthSparkline(brewCount), sparkColor: '#D4723C',
    },
    {
      icon: FlaskConical, label: t('nav.fermentation'), value: fermentingCount,
      sub: fermentingCount > 0 ? t('dashboard.fermenting_days', 'En curso') : undefined,
      subColor: 'text-accent-info',
      color: 'text-accent-info', bg: 'bg-accent-info/10', to: '/fermentation' as const,
      spark: synthSparkline(fermentingCount), sparkColor: '#42A5F5',
    },
    {
      icon: Beer, label: t('dashboard.ready_to_serve', 'Para servir'), value: readyToServe,
      sub: undefined, subColor: '',
      color: 'text-accent-hop', bg: 'bg-accent-hop/10', to: '/keezer' as const,
      spark: synthSparkline(readyToServe), sparkColor: '#7CB342',
    },
  ]

  /* ── Alerts (unified: expiring + low stock) ────────────────── */
  type Alert = { id: string; type: 'danger' | 'warning' | 'success' | 'info'; icon: React.ElementType; title: string; detail: string }
  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = []
    for (const item of expiringItems.slice(0, 3)) {
      const days = daysUntilExpiry(item.expiry_date ?? '')
      list.push({
        id: `exp-${item.id}`,
        type: days <= 0 ? 'danger' : 'warning',
        icon: days <= 0 ? AlertCircle : AlertTriangle,
        title: item.name,
        detail: days <= 0 ? t('dashboard.expired', 'Caducado') : `${t('dashboard.expires_in', 'Caduca en')} ${days}d`,
      })
    }
    if (lowStockCount > 0) {
      list.push({
        id: 'low-stock',
        type: 'warning',
        icon: ShoppingCart,
        title: t('dashboard.low_stock_alert', { count: lowStockCount, defaultValue: `${lowStockCount} ingredientes` }),
        detail: t('inventory:alerts.low_stock'),
      })
    }
    if (fermentingCount > 0) {
      list.push({
        id: 'ferm-ok',
        type: 'success',
        icon: CheckCircle2,
        title: `${fermentingCount} ${t('dashboard.fermenters_active', 'fermentadores activos')}`,
        detail: t('dashboard.fermenting_stable', 'Datos estables'),
      })
    }
    if (list.length === 0) {
      list.push({
        id: 'all-good',
        type: 'info',
        icon: Info,
        title: t('dashboard.all_good', 'Todo en orden'),
        detail: t('dashboard.no_alerts'),
      })
    }
    return list
  }, [expiringItems, lowStockCount, fermentingCount, t])

  const alertColors: Record<string, string> = {
    danger: 'text-accent-danger',
    warning: 'text-status-warning',
    success: 'text-accent-hop',
    info: 'text-accent-info',
  }
  const alertBgs: Record<string, string> = {
    danger: 'bg-accent-danger/8',
    warning: 'bg-status-warning/8',
    success: 'bg-accent-hop/8',
    info: 'bg-accent-info/8',
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* ── Welcome header ──────────────────────────────────────── */}
      <motion.div {...card(0)} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
            {t('dashboard.welcome', 'Hola')},{' '}
            <span className="bg-gradient-to-r from-accent-amber to-accent-copper bg-clip-text text-transparent">
              {user?.full_name?.split(' ')[0] ?? 'Cervecero'}
            </span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {brewery?.name ?? t('dashboard.your_brewery')} ·{' '}
            {allSessions.length > 0 && allSessions[0]?.created_at
              ? `${t('dashboard.last_brew', 'Último lote')}: ${formatDate(allSessions[0]!.created_at)}`
              : t('dashboard.no_brews_yet', 'Sin lotes aún')
            }
          </p>
        </div>
        <Link
          to="/brewing"
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                     bg-gradient-to-r from-accent-amber to-accent-copper text-bg-primary
                     hover:shadow-glow transition-shadow"
        >
          <Zap size={14} />
          {t('dashboard.quick_brew', 'Nuevo lote')}
        </Link>
      </motion.div>

      {/* ── KPI strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value, sub, subColor, color, bg, to, spark, sparkColor }, i) => (
          <Link key={label} to={to}>
            <motion.div
              {...card(i + 1)}
              className="metric-card group cursor-pointer relative overflow-hidden"
            >
              {/* Background sparkline */}
              <div className="absolute inset-x-0 bottom-0 h-12 opacity-20 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={sparkColor} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone" dataKey="v"
                      stroke={sparkColor} strokeWidth={1.5}
                      fill={`url(#spark-${i})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                    <Icon size={18} className={color} />
                  </div>
                  <ChevronRight size={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-2xl font-display font-bold text-text-primary tabular-nums">{value}</p>
                <p className="text-xs text-text-secondary mt-0.5">{label}</p>
                {sub && <p className={cn('text-[10px] mt-1', subColor)}>{sub}</p>}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* ── Two-column: AI Recommendation + Alerts ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Recommendation Card */}
        <motion.div {...card(5)} className="glass-card rounded-xl p-5 glow-border relative">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-accent-amber/10 flex items-center justify-center">
              <Bot size={18} className="text-accent-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary font-display">
                {t('dashboard.ai_recommends', 'IA recomienda')}
              </h2>
              <p className="text-[10px] text-text-tertiary">{t('dashboard.ai_based_on', 'Basado en tu inventario y hábitos')}</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-5">
            "{aiRecommendation.text}"
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={openAiPanel}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         bg-gradient-to-r from-accent-amber to-accent-copper text-bg-primary
                         hover:shadow-glow transition-shadow"
            >
              {aiRecommendation.primaryAction}
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary
                               border border-white/[0.06] hover:bg-bg-hover transition-colors">
              {aiRecommendation.secondaryAction}
            </button>
          </div>
        </motion.div>

        {/* Alerts Center */}
        <motion.div {...card(6)} className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-status-warning/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-status-warning" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary font-display">
                {t('dashboard.alerts_center', 'Centro de alertas')}
              </h2>
              {(expiringItems.length > 0 || lowStockCount > 0) && (
                <span className="w-5 h-5 rounded-full bg-accent-danger/20 text-accent-danger text-[10px] font-bold flex items-center justify-center">
                  {expiringItems.length + (lowStockCount > 0 ? 1 : 0)}
                </span>
              )}
            </div>
            <Link to="/inventory" className="text-xs text-accent-amber hover:text-accent-copper transition-colors">
              {t('actions.view_all')}
            </Link>
          </div>
          <div className="space-y-1.5">
            {alerts.map(a => (
              <div key={a.id} className={cn(
                'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors',
                alertBgs[a.type]
              )}>
                <a.icon size={15} className={alertColors[a.type]} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary truncate block">{a.title}</span>
                </div>
                <span className={cn('text-xs whitespace-nowrap', alertColors[a.type])}>{a.detail}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Fermentation Live Strip ─────────────────────────────── */}
      {activeFerms.length > 0 && (
        <motion.div {...card(7)} className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent-info/10 flex items-center justify-center">
                <Activity size={18} className="text-accent-info" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary font-display">
                  {t('dashboard.fermentation_monitor', 'Monitor de fermentación')}
                </h2>
                <p className="text-[10px] text-text-tertiary">{t('dashboard.live', 'En vivo')}</p>
              </div>
            </div>
            <Link to="/fermentation" className="text-xs text-accent-amber hover:text-accent-copper transition-colors flex items-center gap-1">
              {t('actions.view_all')} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-bg-hover">
            {activeFerms.map(f => (
              <FermenterMini key={f.id} session={f} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Bottom row: Recent Activity + Keezer ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Activity */}
        <motion.div {...card(8)} className="lg:col-span-3 glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent-copper/10 flex items-center justify-center">
                <Clock size={18} className="text-accent-copper" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary font-display">
                {t('dashboard.recent_activity', 'Actividad reciente')}
              </h2>
            </div>
            {brewCount > 0 && (
              <Link to="/brewing" className="text-xs text-accent-amber hover:text-accent-copper transition-colors">
                {t('actions.view_all')}
              </Link>
            )}
          </div>
          {brewCount > 0 ? (
            <div className="space-y-1">
              {allSessions.slice(0, 6).map((session, i) => (
                <div key={session.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-bg-hover/60 transition-colors group">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      session.phase === 'fermenting' ? 'bg-accent-info' :
                      session.phase === 'completed' ? 'bg-accent-hop' :
                      session.phase === 'stripping_run' || session.phase === 'mashing' ? 'bg-accent-amber' :
                      session.phase === 'aborted' ? 'bg-accent-danger' :
                      'bg-text-tertiary'
                    )} />
                    {i < Math.min(allSessions.length, 6) - 1 && (
                      <div className="w-px h-6 bg-white/[0.06] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary truncate block">{session.name}</span>
                    <span className="text-[10px] text-text-tertiary">
                      {session.created_at ? formatDate(session.created_at) : ''}
                    </span>
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    session.phase === 'fermenting' ? 'bg-accent-info/10 text-accent-info' :
                    session.phase === 'completed' ? 'bg-accent-hop/10 text-accent-hop' :
                    session.phase === 'aborted' ? 'bg-accent-danger/10 text-accent-danger' :
                    'bg-bg-hover text-text-secondary'
                  )}>
                    {session.phase}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-text-tertiary">
              <Beaker size={28} className="mb-2 opacity-20" />
              <p className="text-sm">{t('dashboard.no_brews_yet', 'Sin lotes aún')}</p>
              <Link to="/brewing" className="text-xs text-accent-amber mt-2 hover:text-accent-copper transition-colors">
                {t('dashboard.start_first', 'Empieza tu primer lote')} →
              </Link>
            </div>
          )}
        </motion.div>

        {/* Keezer Status Mini */}
        <motion.div {...card(9)} className="lg:col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-accent-hop/10 flex items-center justify-center">
              <Beer size={18} className="text-accent-hop" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary font-display">
              {t('dashboard.keezer_status', 'Estado del Keezer')}
            </h2>
          </div>

          {readyToServe > 0 ? (
            <div className="space-y-3">
              {allSessions
                .filter(s => s.phase === 'aging' || s.phase === 'bottling' || s.phase === 'completed')
                .slice(0, 4)
                .map((session, idx) => (
                  <div key={session.id} className="flex items-center gap-3">
                    <div className="w-8 h-14 rounded bg-bg-hover/80 border border-white/[0.06] flex flex-col-reverse overflow-hidden relative">
                      <div
                        className="w-full bg-gradient-to-t from-accent-amber/60 to-accent-amber/30 transition-all"
                        style={{ height: `${Math.min(100, 40 + idx * 15)}%` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{session.name}</p>
                      <p className="text-[10px] text-text-tertiary">{session.phase}</p>
                    </div>
                  </div>
                ))
              }
              <Link
                to="/keezer"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs text-accent-amber
                           border border-white/[0.06] hover:bg-bg-hover transition-colors mt-2"
              >
                {t('dashboard.manage_keezer', 'Gestionar Keezer')} <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-text-tertiary">
              <Beer size={28} className="mb-2 opacity-20" />
              <p className="text-sm text-center">{t('dashboard.no_ready', 'Sin lotes listos para servir')}</p>
              <Link to="/brewing" className="text-xs text-accent-amber mt-2 hover:text-accent-copper transition-colors">
                {t('dashboard.quick_brew', 'Nuevo lote')} →
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
