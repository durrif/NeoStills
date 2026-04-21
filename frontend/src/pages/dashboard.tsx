import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  Package,
  Beaker,
  FlaskConical,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Thermometer,
  Droplets,
  ArrowRight,
  Bot,
  Clock,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  ShoppingCart,
  Cpu,
  Sparkles,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useInventory, useInventoryAlerts } from '@/hooks/use-inventory'
import { useBrewSessions } from '@/hooks/use-brewing'
import { useActiveFermentations, useLatestISpindelReading } from '@/hooks/use-fermentation'
import { cn, daysUntilExpiry, formatDate } from '@/lib/utils'

const card = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const, delay: i * 0.06 },
})

const SPARK_PATTERNS = [
  [0.54, 0.62, 0.58, 0.66, 0.64, 0.7, 0.68],
  [0.32, 0.48, 0.44, 0.58, 0.52, 0.62, 0.74],
  [0.62, 0.58, 0.72, 0.66, 0.7, 0.78, 0.75],
  [0.4, 0.45, 0.43, 0.5, 0.56, 0.55, 0.61],
  [0.68, 0.64, 0.72, 0.76, 0.7, 0.8, 0.84],
] as const

const buildSparkline = (pattern: readonly number[], base: number) => {
  const amplitude = Math.max(base, 1.6)
  return pattern.map((value, index) => ({
    x: index,
    v: Number((value * amplitude).toFixed(2)),
  }))
}

function AiThinkingOrb() {
  return (
    <div className="orb-monitor shrink-0" aria-hidden="true">
      <div className="orb-monitor__ring" />
      <div className="orb-monitor__core" />
      <div className="orb-monitor__electron" />
    </div>
  )
}

function MicroTrend({ id, data, stroke, fill }: { id: string; data: Array<{ x: number; v: number }>; stroke: string; fill: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.38} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.8}
          fill={`url(#${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function FermenterMini({ session }: { session: { id: number; brew_session_name: string; started_at: string } }) {
  const { data: reading } = useLatestISpindelReading(session.id)
  const daysSinceStart = Math.max(1, Math.round((Date.now() - new Date(session.started_at).getTime()) / 86_400_000))

  const gravity = (reading as unknown as { gravity?: number })?.gravity
  const temperature = (reading as unknown as { temperature?: number })?.temperature

  return (
    <Link to="/fermentation" className="block">
      <div className="tech-panel rounded-2xl p-4 border border-accent-cobalt/18 hover:border-accent-info/24 transition-all h-full">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <p className="system-kicker !text-[9px] !tracking-[0.18em]">LIVE FERMENTATION</p>
            <p className="text-sm text-text-primary font-medium truncate mt-1">{session.brew_session_name}</p>
          </div>
          <span className="system-status-chip px-2.5 py-1 text-[10px]">
            <span className="iot-pulse-dot" />
            Día {daysSinceStart}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-accent-cobalt/16 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              <Droplets size={11} /> SG
            </div>
            <div className="mt-2 text-xl font-display font-semibold text-text-primary tabular-nums">
              {gravity?.toFixed(3) ?? '—'}
            </div>
          </div>
          <div className="rounded-xl border border-accent-cobalt/16 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              <Thermometer size={11} /> TEMP
            </div>
            <div className="mt-2 text-xl font-display font-semibold live-value tabular-nums">
              {temperature?.toFixed(1) ?? '—'}
              {temperature ? '°C' : ''}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

interface MetricCardProps {
  to: '/' | '/inventory' | '/brewing' | '/fermentation' | '/keezer' | '/devices'
  label: string
  value: number | string
  note: string
  icon: React.ElementType
  pattern: readonly number[]
  sparkColor: string
  glow?: boolean
  live?: boolean
}

function DashboardMetricCard({
  to,
  label,
  value,
  note,
  icon: Icon,
  pattern,
  sparkColor,
  glow = false,
  live = false,
}: MetricCardProps) {
  const spark = typeof value === 'number' ? buildSparkline(pattern, value) : buildSparkline(pattern, 4)
  const gradientFill = live ? 'rgba(34,230,255,0.45)' : 'rgba(184,115,51,0.42)'
  const trendId = `metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <Link to={to}>
      <div className={cn('metric-card h-full', glow && 'metric-card--active')}>
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">{label}</p>
            <div className="mt-3 flex items-end gap-3">
              <span className={cn('metric-value text-[2.35rem] leading-none', live && 'live-value')}>{value}</span>
              <span className={cn('text-xs font-medium pb-1', live ? 'text-accent-info' : 'text-accent-copper')}>
                {note}
              </span>
            </div>
          </div>

          <div
            className={cn(
              'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0',
              live ? 'border-accent-info/22 bg-accent-info/10' : 'border-accent-copper/18 bg-accent-copper/10',
            )}
          >
            <Icon size={18} className={cn(live ? 'text-accent-info' : 'text-accent-copper')} />
          </div>
        </div>

        <div className="relative z-10 mt-5 rounded-xl border border-accent-cobalt/14 bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Últimos 7 días</span>
            <span className={cn('text-[10px] font-medium', live ? 'live-value' : 'text-text-secondary')}>Sparkline</span>
          </div>
          <div className="h-10">
            <MicroTrend id={trendId} data={spark} stroke={sparkColor} fill={gradientFill} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function IotStatusCard() {
  const metrics = [
    { label: 'Temp. columna', value: '92.4°C' },
    { label: 'Presión', value: '1.8 bar' },
    { label: 'Flujo', value: '18.2 L/h' },
  ]

  return (
    <Link to="/devices">
      <div className="metric-card metric-card--active h-full">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">IoT</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[2.35rem] font-display font-semibold live-value leading-none tabular-nums">12/12</span>
              <span className="text-xs text-status-online font-medium">Sensores online</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl border border-accent-info/22 bg-accent-info/10 flex items-center justify-center shrink-0">
            <Cpu size={18} className="text-accent-info" />
          </div>
        </div>

        <div className="relative z-10 mt-5 space-y-2.5 rounded-xl border border-accent-cobalt/14 bg-white/[0.02] px-3 py-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-text-secondary">{metric.label}</span>
              <span className="live-value font-mono">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation(['common', 'inventory', 'brewing'])
  const { user, brewery } = useAuthStore()
  const { setActivePage, openAiPanel } = useUIStore()

  useEffect(() => {
    setActivePage('dashboard')
  }, [setActivePage])

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

  const getPhaseLabel = (phase?: string) => {
    switch (phase) {
      case 'planning':
        return t('dashboard.stage_planning', 'Planificación')
      case 'mashing':
        return t('dashboard.stage_mashing', 'Mashing')
      case 'fermenting':
        return t('dashboard.stage_fermenting', 'Fermentación')
      case 'stripping_run':
        return t('dashboard.stage_stripping', 'Stripping run')
      case 'spirit_run':
        return t('dashboard.stage_spirit', 'Spirit run')
      case 'aging':
        return t('dashboard.stage_aging', 'Maduración')
      case 'bottling':
        return t('dashboard.stage_bottling', 'Embotellado')
      case 'completed':
        return t('dashboard.stage_completed', 'Completado')
      case 'aborted':
        return t('dashboard.stage_aborted', 'Detenido')
      default:
        return phase ?? '—'
    }
  }

  const readyToServe = useMemo(() => {
    return allSessions.filter((session) => session.phase === 'aging' || session.phase === 'bottling' || session.phase === 'completed').length
  }, [allSessions])

  const aiRecommendation = useMemo(() => {
    if (expiringItems.length > 0) {
      const names = expiringItems.slice(0, 3).map((item) => item.name).join(', ')
      return {
        text: t('dashboard.ai_expiring_suggestion', {
          ingredients: names,
          defaultValue: `He detectado ${names} con prioridad de rotación. Puedo proponerte un lote de aprovechamiento o un ajuste de receta para usarlos a tiempo.`,
        }),
        primaryAction: t('dashboard.ai_create_recipe', 'Crear receta'),
        secondaryAction: t('dashboard.ai_later', 'Recordar después'),
      }
    }

    if (lowStockCount > 0) {
      return {
        text: t('dashboard.ai_low_stock_suggestion', {
          count: lowStockCount,
          defaultValue: `${lowStockCount} ingredientes están por debajo del mínimo. Puedo preparar una compra técnica para granos, botánicos y levaduras según tus lotes activos.`,
        }),
        primaryAction: t('dashboard.ai_shop', 'Lista de compra'),
        secondaryAction: t('dashboard.ai_later', 'Después'),
      }
    }

    return {
      text: t('dashboard.ai_default', 'La operación está estable. Si quieres, preparo un nuevo lote, reviso tu agua de maceración o ajusto el siguiente corte de destilación.'),
      primaryAction: t('dashboard.ai_new_brew', 'Nuevo lote'),
      secondaryAction: t('dashboard.ai_explore', 'Explorar recetas'),
    }
  }, [expiringItems, lowStockCount, t])

  const stats = [
    {
      icon: Package,
      label: t('nav.inventory'),
      value: ingredientCount,
      note: expiringItems.length > 0 ? `${expiringItems.length} críticos` : 'Stock estable',
      to: '/inventory' as const,
      pattern: SPARK_PATTERNS[0],
      sparkColor: '#C79262',
    },
    {
      icon: Beaker,
      label: t('dashboard.active_brews', 'Lotes activos'),
      value: brewCount,
      note: brewCount > 0 ? 'Proceso abierto' : 'Sin arranque',
      to: '/brewing' as const,
      pattern: SPARK_PATTERNS[1],
      sparkColor: '#D1A178',
    },
    {
      icon: FlaskConical,
      label: t('nav.fermentation'),
      value: fermentingCount,
      note: fermentingCount > 0 ? 'Telemetría en vivo' : 'Sin actividad',
      to: '/fermentation' as const,
      pattern: SPARK_PATTERNS[2],
      sparkColor: '#22E6FF',
      glow: true,
      live: true,
    },
    {
      icon: CheckCircle2,
      label: t('dashboard.ready_to_serve', 'Para embotellar'),
      value: readyToServe,
      note: readyToServe > 0 ? 'En maduración' : 'Sin lote final',
      to: '/keezer' as const,
      pattern: SPARK_PATTERNS[3],
      sparkColor: '#B87333',
    },
  ]

  type Alert = {
    id: string
    type: 'danger' | 'warning' | 'success' | 'info'
    icon: React.ElementType
    title: string
    detail: string
  }

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

  const alertTone: Record<Alert['type'], string> = {
    danger: 'text-accent-danger',
    warning: 'text-status-warning',
    success: 'text-status-online',
    info: 'live-value',
  }

  const alertSurface: Record<Alert['type'], string> = {
    danger: 'bg-accent-danger/8 border-accent-danger/14',
    warning: 'bg-status-warning/8 border-status-warning/14',
    success: 'bg-status-success/8 border-status-success/16',
    info: 'bg-accent-info/8 border-accent-info/16',
  }

  const operatorName = user?.full_name?.split(' ')[0] ?? 'Admin'
  const latestBatchDate = allSessions.length > 0 && allSessions[0]?.created_at ? formatDate(allSessions[0]!.created_at) : null

  return (
    <div className="p-4 md:p-6 max-w-[1460px] mx-auto space-y-5">
      <motion.section {...card(0)} className="grid xl:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <p className="system-kicker">SISTEMA OPERATIVO NEOSTILLS // Monitorización Activa</p>
          <h1 className="system-heading mt-2">
            Bienvenido, <span className="system-heading-accent">{operatorName}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-2 max-w-3xl">
            {brewery?.name ?? t('dashboard.your_brewery', 'Tu destilería')} · {latestBatchDate ? `Último lote: ${latestBatchDate}` : t('dashboard.no_brews_yet', 'Sin lotes aún')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <span className="system-status-chip">
            <span className="iot-pulse-dot" />
            Sensores activos
            <span className="live-value font-mono">12/12</span>
          </span>

          {latestBatchDate && (
            <span className="system-status-chip">
              <Clock size={12} />
              Último parte
              <span className="text-text-primary">{latestBatchDate}</span>
            </span>
          )}

          <Link
            to="/brewing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all"
          >
            <Zap size={14} />
            Nuevo lote
          </Link>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} {...card(index + 1)}>
            <DashboardMetricCard {...stat} />
          </motion.div>
        ))}
        <motion.div {...card(5)}>
          <IotStatusCard />
        </motion.div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <motion.div {...card(6)} className="xl:col-span-5 tech-panel glow-border p-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "url('/still-schematic-v1.svg')",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right -160px bottom -140px',
              backgroundSize: '640px',
            }}
          />

          <div className="relative z-10 flex items-start gap-4">
            <AiThinkingOrb />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="system-kicker !text-[10px] !tracking-[0.18em]">AI CONTROL LAYER</p>
                  <h2 className="text-xl font-display font-semibold text-text-primary mt-1">
                    El Genio Destilador recomienda
                  </h2>
                </div>
                <span className="system-status-chip px-2.5 py-1">
                  <Sparkles size={12} className="text-accent-copper" />
                  Analizando
                </span>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
                {aiRecommendation.text}
              </p>

              <div className="flex flex-wrap gap-2 mt-4 mb-5">
                <span className="system-status-chip">
                  <Package size={12} /> Inventario
                </span>
                <span className="system-status-chip">
                  <FlaskConical size={12} className="text-accent-info" /> Fermentación
                </span>
                <span className="system-status-chip">
                  <Calendar size={12} /> Aging
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={openAiPanel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all"
                >
                  {aiRecommendation.primaryAction}
                </button>
                <button className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary border border-accent-cobalt/24 bg-white/[0.02] hover:bg-bg-hover/70 hover:text-text-primary transition-colors">
                  {aiRecommendation.secondaryAction}
                </button>
              </div>
            </div>

            <div className="hidden lg:flex w-[208px] shrink-0 rounded-2xl border border-accent-cobalt/16 bg-white/[0.03] p-3 flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                <span>Análisis</span>
                <span className="live-value">LIVE</span>
              </div>
              <div className="grid grid-cols-5 gap-1 items-end h-16">
                {[32, 48, 42, 58, 66].map((height, index) => (
                  <div key={index} className="rounded-full bg-[linear-gradient(180deg,rgba(34,230,255,0.88)_0%,rgba(77,109,163,0.28)_100%)]" style={{ height }} />
                ))}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-text-secondary"><span>Fondos</span><span className="text-text-primary">Aprobado</span></div>
                <div className="flex items-center justify-between text-text-secondary"><span>Fermentación</span><span className="live-value">92%</span></div>
                <div className="flex items-center justify-between text-text-secondary"><span>Aging</span><span className="text-accent-copper">Listo</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div {...card(7)} className="xl:col-span-3 tech-panel p-5">
          <div className="relative z-10 h-full flex flex-col justify-between gap-5">
            <div>
              <p className="system-kicker !text-[10px] !tracking-[0.18em]">PROCESS CONTROL</p>
              <h2 className="text-xl font-display font-semibold text-text-primary mt-1">
                Activar siguiente lote
              </h2>
              <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                Arranca un nuevo proceso con la configuración más reciente, control de agua y checklist de producción ya precargados.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['Mashing', 'Cuts', 'Aging'].map((item, index) => (
                <div key={item} className="rounded-xl border border-accent-cobalt/16 bg-white/[0.02] px-3 py-3 text-center">
                  <div className={cn('mx-auto mb-2 h-2.5 w-2.5 rounded-full', index === 1 ? 'bg-accent-info shadow-[0_0_12px_rgba(34,230,255,0.55)]' : 'bg-accent-copper/80')} />
                  <p className="text-[11px] text-text-secondary uppercase tracking-[0.16em]">{item}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="system-status-chip">
                <span className="iot-pulse-dot" />
                Modo listo
              </span>
              <Link
                to="/brewing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all"
              >
                Nuevo lote
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div {...card(8)} className="xl:col-span-4 tech-panel tech-panel--active p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-accent-info/24 bg-accent-info/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-accent-info" />
              </div>
              <div>
                <p className="system-kicker !text-[10px] !tracking-[0.18em]">ALERT MATRIX</p>
                <h2 className="text-xl font-display font-semibold text-text-primary mt-1">Centro de alertas</h2>
              </div>
            </div>
            <Link to="/inventory" className="text-xs text-accent-copper hover:text-text-primary transition-colors">
              {t('actions.view_all')}
            </Link>
          </div>

          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={cn('rounded-xl border px-3.5 py-3 flex items-center gap-3', alertSurface[alert.type])}>
                <alert.icon size={16} className={alertTone[alert.type]} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{alert.title}</p>
                </div>
                <span className={cn('text-xs whitespace-nowrap', alertTone[alert.type])}>{alert.detail}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {activeFerms.length > 0 && (
        <motion.section {...card(9)} className="tech-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-accent-info/24 bg-accent-info/10 flex items-center justify-center">
                <Activity size={18} className="text-accent-info" />
              </div>
              <div>
                <p className="system-kicker !text-[10px] !tracking-[0.18em]">IOT MONITOR</p>
                <h2 className="text-xl font-display font-semibold text-text-primary mt-1">Fermentación en vivo</h2>
              </div>
            </div>
            <Link to="/fermentation" className="text-xs text-accent-copper hover:text-text-primary transition-colors flex items-center gap-1">
              {t('actions.view_all')} <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {activeFerms.map((fermentation) => (
              <FermenterMini key={fermentation.id} session={fermentation} />
            ))}
          </div>
        </motion.section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <motion.div {...card(10)} className="xl:col-span-7 tech-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-accent-copper/22 bg-accent-copper/10 flex items-center justify-center">
                <Clock size={18} className="text-accent-copper" />
              </div>
              <div>
                <p className="system-kicker !text-[10px] !tracking-[0.18em]">ACTIVITY LOG</p>
                <h2 className="text-xl font-display font-semibold text-text-primary mt-1">Actividad reciente</h2>
              </div>
            </div>
            {brewCount > 0 && (
              <Link to="/brewing" className="text-xs text-accent-copper hover:text-text-primary transition-colors">
                {t('actions.view_all')}
              </Link>
            )}
          </div>

          {brewCount > 0 ? (
            <div className="space-y-2">
              {allSessions.slice(0, 6).map((session, index) => (
                <div key={session.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-accent-cobalt/12 bg-white/[0.02] hover:border-accent-cobalt/22 transition-colors">
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        session.phase === 'fermenting' ? 'bg-accent-info shadow-[0_0_12px_rgba(34,230,255,0.55)]' :
                        session.phase === 'completed' ? 'bg-status-online' :
                        session.phase === 'stripping_run' || session.phase === 'mashing' ? 'bg-accent-copper' :
                        session.phase === 'aborted' ? 'bg-accent-danger' :
                        'bg-text-tertiary',
                      )}
                    />
                    {index < Math.min(allSessions.length, 6) - 1 && <div className="w-px h-7 bg-accent-cobalt/18 mt-1" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{session.name}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{session.created_at ? formatDate(session.created_at) : ''}</p>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap',
                      session.phase === 'fermenting' ? 'border-accent-info/16 bg-accent-info/10 text-accent-info' :
                      session.phase === 'completed' ? 'border-status-success/16 bg-status-success/10 text-status-online' :
                      session.phase === 'aborted' ? 'border-accent-danger/16 bg-accent-danger/10 text-accent-danger' :
                      'border-accent-cobalt/14 bg-white/[0.03] text-text-secondary',
                    )}
                  >
                    {getPhaseLabel(session.phase)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-text-tertiary">
              <Beaker size={30} className="mb-3 opacity-25" />
              <p className="text-sm">{t('dashboard.no_brews_yet', 'Sin lotes aún')}</p>
              <Link to="/brewing" className="text-xs text-accent-copper mt-2 hover:text-text-primary transition-colors">
                {t('dashboard.start_first', 'Empieza tu primer lote')} →
              </Link>
            </div>
          )}
        </motion.div>

        <motion.div {...card(11)} className="xl:col-span-5 tech-panel p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl border border-accent-copper/22 bg-accent-copper/10 flex items-center justify-center">
              <Calendar size={18} className="text-accent-copper" />
            </div>
            <div>
              <p className="system-kicker !text-[10px] !tracking-[0.18em]">AGING ROOM</p>
              <h2 className="text-xl font-display font-semibold text-text-primary mt-1">Barricas en maduración</h2>
            </div>
          </div>

          {readyToServe > 0 ? (
            <div className="space-y-3">
              {allSessions
                .filter((session) => session.phase === 'aging' || session.phase === 'bottling' || session.phase === 'completed')
                .slice(0, 4)
                .map((session, index) => (
                  <div key={session.id} className="flex items-center gap-3 rounded-xl border border-accent-cobalt/12 bg-white/[0.02] px-3.5 py-3">
                    <div className="w-9 h-16 rounded-[14px] border border-accent-copper/20 bg-bg-hover/60 p-1 flex flex-col-reverse overflow-hidden">
                      <div
                        className="w-full rounded-full bg-[linear-gradient(180deg,rgba(244,213,184,0.9)_0%,rgba(184,115,51,0.7)_100%)]"
                        style={{ height: `${Math.min(100, 38 + index * 15)}%` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{session.name}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{getPhaseLabel(session.phase)}</p>
                    </div>
                    <ChevronRight size={14} className="text-text-tertiary" />
                  </div>
                ))}

              <Link
                to="/keezer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm text-accent-copper border border-accent-cobalt/18 bg-white/[0.02] hover:bg-bg-hover/70 hover:text-text-primary transition-colors"
              >
                Gestionar aging <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-text-tertiary">
              <Calendar size={30} className="mb-3 opacity-25" />
              <p className="text-sm text-center">{t('dashboard.no_ready', 'Sin lotes listos para servir')}</p>
              <Link to="/brewing" className="text-xs text-accent-copper mt-2 hover:text-text-primary transition-colors">
                Nuevo lote →
              </Link>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}