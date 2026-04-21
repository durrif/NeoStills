import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  type LucideIcon,
  Package,
  Beaker,
  FlaskConical,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Thermometer,
  Droplets,
  ArrowRight,
  Clock,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  ShoppingCart,
  Cpu,
  Sparkles,
  Wifi,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
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

/* ── Copper pot still SVG illustration (inline, for KPI cards) ── */
function StillIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Pot body */}
      <ellipse cx="38" cy="60" rx="28" ry="22" fill="#B87333" fillOpacity="0.18" stroke="#B87333" strokeWidth="1.5" strokeOpacity="0.55" />
      <path d="M10 60 Q10 85 38 85 Q66 85 66 60" fill="#9B6220" fillOpacity="0.22" stroke="#9B6220" strokeWidth="1" strokeOpacity="0.4" />
      {/* Rivet bands */}
      <ellipse cx="38" cy="52" rx="28" ry="4" stroke="#D4A060" strokeWidth="0.8" strokeOpacity="0.45" fill="none" />
      <ellipse cx="38" cy="68" rx="28" ry="4" stroke="#D4A060" strokeWidth="0.8" strokeOpacity="0.4" fill="none" />
      {/* Helmet */}
      <path d="M28 40 Q38 28 48 40" stroke="#D4A060" strokeWidth="1.4" strokeOpacity="0.6" fill="none" />
      <ellipse cx="38" cy="40" rx="10" ry="4" fill="#B87333" fillOpacity="0.25" stroke="#B87333" strokeWidth="1" strokeOpacity="0.5" />
      {/* Swan neck */}
      <path d="M38 36 Q38 22 50 18" stroke="#B87333" strokeWidth="1.8" strokeOpacity="0.55" strokeLinecap="round" fill="none" />
      {/* Lyne arm */}
      <path d="M50 18 Q62 16 66 24" stroke="#B87333" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
      {/* Condenser coil */}
      <path d="M66 24 Q74 26 72 32 Q70 38 74 40 Q78 44 72 48" stroke="#B87333" strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" fill="none" />
      {/* Base */}
      <rect x="18" y="84" width="40" height="4" rx="2" fill="#9B6220" fillOpacity="0.35" />
      {/* Heat glow */}
      <ellipse cx="38" cy="88" rx="18" ry="3" fill="#FF6A00" fillOpacity="0.12" />
    </svg>
  )
}

/* ── Barrel SVG illustration ──────────────────────────────────── */
function BarrelIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Barrel body */}
      <ellipse cx="60" cy="40" rx="46" ry="28" fill="#7B5B3A" fillOpacity="0.3" stroke="#B87333" strokeWidth="1.4" strokeOpacity="0.6" />
      {/* Bulge */}
      <path d="M14 40 Q14 68 60 68 Q106 68 106 40" fill="#6B4C2A" fillOpacity="0.2" stroke="#9B6220" strokeWidth="1" strokeOpacity="0.4" />
      {/* Stave lines */}
      {[20,32,44,56,68,80,92,104].map((x, i) => (
        <line key={i} x1={x} y1="16" x2={x} y2="64" stroke="#9B6220" strokeOpacity="0.25" strokeWidth="0.6" />
      ))}
      {/* Metal bands */}
      <ellipse cx="60" cy="40" rx="46" ry="28" fill="none" stroke="#C7A951" strokeWidth="2" strokeOpacity="0.5" />
      <ellipse cx="60" cy="26" rx="38" ry="16" fill="none" stroke="#C7A951" strokeWidth="1.4" strokeOpacity="0.4" />
      <ellipse cx="60" cy="54" rx="38" ry="16" fill="none" stroke="#C7A951" strokeWidth="1.4" strokeOpacity="0.4" />
      {/* End caps */}
      <ellipse cx="14" cy="40" rx="6" ry="28" fill="#9B6220" fillOpacity="0.35" stroke="#B87333" strokeWidth="1" strokeOpacity="0.5" />
      <ellipse cx="106" cy="40" rx="6" ry="28" fill="#9B6220" fillOpacity="0.35" stroke="#B87333" strokeWidth="1" strokeOpacity="0.5" />
      {/* Bung */}
      <circle cx="60" cy="14" r="4" fill="#C7A951" fillOpacity="0.6" stroke="#B87333" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  )
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
        <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive={false} />
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
            <div className="mt-2 text-xl font-display font-semibold text-text-primary tabular-nums">{gravity?.toFixed(3) ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-accent-cobalt/16 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              <Thermometer size={11} /> TEMP
            </div>
            <div className="mt-2 text-xl font-display font-semibold live-value tabular-nums">
              {temperature?.toFixed(1) ?? '—'}{temperature ? '°C' : ''}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── KPI summary card with still illustration ─────────────────── */
interface MetricCardProps {
  to: '/' | '/inventory' | '/brewing' | '/fermentation' | '/keezer' | '/devices'
  label: string
  value: number | string
  note: string
  icon: LucideIcon
  pattern: readonly number[]
  sparkColor: string
  glow?: boolean
  live?: boolean
}

function DashboardMetricCard({ to, label, value, note, icon: Icon, pattern, sparkColor, glow = false, live = false }: MetricCardProps) {
  const spark = typeof value === 'number' ? buildSparkline(pattern, value) : buildSparkline(pattern, 4)
  const gradientFill = live ? 'rgba(34,230,255,0.45)' : 'rgba(184,115,51,0.42)'
  const trendId = `metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <Link to={to}>
      <div className={cn('metric-card h-full relative overflow-hidden', glow && 'metric-card--active')}>
        {/* Still illustration — top-right decorative */}
        <StillIllustration className="absolute right-0 top-0 w-20 h-24 opacity-40 pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">{label}</p>
            <div className="mt-3 flex items-end gap-3">
              <span className={cn('metric-value text-[2.35rem] leading-none', live && 'live-value')}>{value}</span>
              <span className={cn('text-xs font-medium pb-1', live ? 'text-accent-info' : 'text-accent-copper')}>{note}</span>
            </div>
          </div>
          <div className={cn(
            'w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0',
            live ? 'border-accent-info/22 bg-accent-info/10' : 'border-accent-copper/18 bg-accent-copper/10',
          )}>
            <Icon size={16} className={cn(live ? 'text-accent-info' : 'text-accent-copper')} />
          </div>
        </div>

        <div className="relative z-10 mt-4 rounded-xl border border-accent-cobalt/14 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Sparklines</span>
            <span className={cn('text-[10px] font-medium flex items-center gap-1', live ? 'live-value' : 'text-text-secondary')}>
              {live && <span className="w-1.5 h-1.5 rounded-full bg-accent-info inline-block animate-pulse" />}
              {live ? 'LIVE' : '7d'}
            </span>
          </div>
          <div className="h-9">
            <MicroTrend id={trendId} data={spark} stroke={sparkColor} fill={gradientFill} />
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── IoT card with sensors online ─────────────────────────────── */
function IotStatusCard() {
  return (
    <Link to="/devices">
      <div className="metric-card metric-card--active h-full relative overflow-hidden">
        <StillIllustration className="absolute right-0 top-0 w-20 h-24 opacity-30 pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">IoT</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[2.35rem] font-display font-semibold live-value leading-none tabular-nums">12/12</span>
              <span className="text-xs text-status-online font-medium">Online</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-2xl border border-accent-info/22 bg-accent-info/10 flex items-center justify-center shrink-0">
            <Cpu size={16} className="text-accent-info" />
          </div>
        </div>
        <div className="relative z-10 mt-4 rounded-xl border border-accent-cobalt/14 bg-white/[0.02] px-3 py-2.5 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-status-online inline-block animate-pulse" />
            Sensores Online
          </p>
          {[
            { label: 'Temp. columna', value: '92°C', warn: true },
            { label: 'Presión L4', value: '1.8 bar', warn: false },
            { label: 'Flujo', value: '18 L/h', warn: false },
          ].map(({ label, value, warn }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{label}</span>
              <span className={cn('font-mono', warn ? 'text-accent-danger' : 'live-value')}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

/* ── Activity bar chart ────────────────────────────────────────── */
const ACTIVITY_DATA = [
  { name: 'L', destilacion: 65, fermentacion: 30, maduracion: 20 },
  { name: 'M', destilacion: 90, fermentacion: 55, maduracion: 15 },
  { name: 'X', destilacion: 110, fermentacion: 40, maduracion: 25 },
  { name: 'J', destilacion: 145, fermentacion: 70, maduracion: 30 },
  { name: 'V', destilacion: 130, fermentacion: 85, maduracion: 45 },
  { name: 'S', destilacion: 160, fermentacion: 60, maduracion: 50 },
  { name: 'D', destilacion: 140, fermentacion: 90, maduracion: 55 },
]

function ActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={ACTIVITY_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#6B7A8D', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6B7A8D', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1A1816', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#F0EBE1' }}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Legend
          iconType="circle"
          iconSize={6}
          wrapperStyle={{ fontSize: 10, color: '#9CA3AF', paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
        />
        <Bar dataKey="destilacion" name="Destilación" fill="#B87333" radius={[3, 3, 0, 0]} />
        <Bar dataKey="fermentacion" name="Fermentación" fill="#22E6FF" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
        <Bar dataKey="maduracion" name="Maduración" fill="#C7A951" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Barrel IoT panel ─────────────────────────────────────────── */
function BarrelsPanel({ sessions }: { sessions: Array<{ id: number | string; name: string; phase: string; created_at?: string }> }) {
  const aging = sessions.filter(s => s.phase === 'aging' || s.phase === 'bottling' || s.phase === 'completed')

  const maturationItems = aging.length > 0
    ? aging.slice(0, 4).map((s, i) => ({
        label: s.name.length > 18 ? s.name.slice(0, 18) + '…' : s.name,
        pct: Math.min(95, 20 + i * 18 + Math.floor(Math.random() * 10)),
      }))
    : [
        { label: 'Barrica L2', pct: 23 },
        { label: 'Barrica L4', pct: 30 },
        { label: 'Barrica R1', pct: 47 },
      ]

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Barrel illustration + IoT overlay */}
      <div className="relative flex items-center justify-center rounded-xl border border-accent-cobalt/12 bg-white/[0.02] py-4 px-3">
        <BarrelIllustration className="w-full max-w-[220px]" />

        {/* IoT sensor tags */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-[#0F0E0D]/80 border border-accent-info/30 rounded-full px-2 py-0.5 text-[10px]">
          <Wifi size={9} className="text-accent-info" />
          <span className="text-accent-info font-mono">IoT Sensor</span>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-[#0F0E0D]/80 border border-accent-copper/30 rounded-full px-2 py-0.5 text-[10px]">
          <Thermometer size={9} className="text-accent-copper" />
          <span className="text-accent-copper font-mono">18.4°C</span>
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-[#0F0E0D]/80 border border-accent-amber/30 rounded-full px-2 py-0.5 text-[10px]">
          <Activity size={9} className="text-accent-amber" />
          <span className="text-accent-amber font-mono">ABV 62%</span>
        </div>
      </div>

      {/* Maturation status bars */}
      <div className="space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Maturation Status</p>
        {maturationItems.map(({ label, pct }) => (
          <div key={label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary truncate">{label}</span>
              <span className="text-accent-copper font-mono ml-2">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B87333] to-[#C7A951] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
        {aging.length === 0 && (
          <p className="text-[11px] text-text-tertiary italic">Sin barricas activas</p>
        )}
      </div>

      <Link to="/keezer" className="mt-auto inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-accent-copper border border-accent-cobalt/18 bg-white/[0.02] hover:bg-bg-hover/70 transition-colors">
        Gestionar barricas <ArrowRight size={11} />
      </Link>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */
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

  const readyToServe = useMemo(() =>
    allSessions.filter(s => s.phase === 'aging' || s.phase === 'bottling' || s.phase === 'completed').length,
  [allSessions])

  const getPhaseLabel = (phase?: string) => {
    const map: Record<string, string> = {
      planning: 'Planificación', mashing: 'Mashing', fermenting: 'Fermentación',
      stripping_run: 'Stripping run', spirit_run: 'Spirit run',
      aging: 'Maduración', bottling: 'Embotellado', completed: 'Completado', aborted: 'Detenido',
    }
    return map[phase ?? ''] ?? phase ?? '—'
  }

  const aiRecommendation = useMemo(() => {
    if (expiringItems.length > 0) {
      const names = expiringItems.slice(0, 3).map(item => item.name).join(', ')
      return { text: `He detectado ${names} con prioridad de rotación. Puedo proponerte un lote de aprovechamiento o un ajuste de receta para usarlos a tiempo.`, primaryAction: 'Crear receta', secondaryAction: 'Recordar después' }
    }
    if (lowStockCount > 0) {
      return { text: `${lowStockCount} ingredientes están por debajo del mínimo. Puedo preparar una compra técnica para granos, botánicos y levaduras según tus lotes activos.`, primaryAction: 'Lista de compra', secondaryAction: 'Después' }
    }
    return { text: 'La operación está estable. Si quieres, preparo un nuevo lote, reviso tu agua de maceración o ajusto el siguiente corte de destilación.', primaryAction: 'Nuevo lote', secondaryAction: 'Explorar recetas' }
  }, [expiringItems, lowStockCount])

  const stats = [
    { icon: Package,      label: 'Inventario',    value: ingredientCount, note: expiringItems.length > 0 ? `${expiringItems.length} críticos` : 'Stock estable', to: '/inventory' as const, pattern: SPARK_PATTERNS[0], sparkColor: '#C79262' },
    { icon: Beaker,       label: 'Lotes activos', value: brewCount, note: brewCount > 0 ? 'En proceso' : 'Sin arranque', to: '/brewing' as const, pattern: SPARK_PATTERNS[1], sparkColor: '#D1A178' },
    { icon: FlaskConical, label: 'Fermentación',  value: fermentingCount, note: fermentingCount > 0 ? 'Telemetría en vivo' : 'Sin actividad', to: '/fermentation' as const, pattern: SPARK_PATTERNS[2], sparkColor: '#22E6FF', glow: true, live: true },
    { icon: CheckCircle2, label: 'Para servir',   value: readyToServe, note: readyToServe > 0 ? 'En maduración' : 'Sin lote final', to: '/keezer' as const, pattern: SPARK_PATTERNS[3], sparkColor: '#B87333' },
  ]

  type Alert = { id: string; type: 'danger' | 'warning' | 'success' | 'info'; icon: LucideIcon; title: string; detail: string }
  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = []
    for (const item of expiringItems.slice(0, 2)) {
      const days = daysUntilExpiry(item.expiry_date ?? '')
      list.push({ id: `exp-${item.id}`, type: days <= 0 ? 'danger' : 'warning', icon: days <= 0 ? AlertCircle : AlertTriangle, title: item.name, detail: days <= 0 ? 'Caducado' : `Caduca en ${days}d` })
    }
    if (lowStockCount > 0) list.push({ id: 'low-stock', type: 'warning', icon: ShoppingCart, title: `${lowStockCount} ingredientes`, detail: 'Stock bajo' })
    if (fermentingCount > 0) list.push({ id: 'ferm-ok', type: 'success', icon: CheckCircle2, title: `${fermentingCount} fermentadores activos`, detail: 'Datos estables' })
    // Demo distillation alerts (when no real alerts)
    if (list.length === 0) {
      list.push({ id: 'temp-col', type: 'warning', icon: AlertTriangle, title: 'Temp Column 3 High: 92°C', detail: 'Revisar' })
      list.push({ id: 'pres-l4', type: 'warning', icon: AlertTriangle, title: 'Pressure Sensor L4 Error', detail: 'Atención' })
      list.push({ id: 'all-good', type: 'info', icon: Info, title: 'Todo en orden', detail: 'Sin alertas críticas' })
    }
    return list
  }, [expiringItems, lowStockCount, fermentingCount])

  const alertSurface: Record<Alert['type'], string> = {
    danger:  'bg-accent-danger/8 border-accent-danger/14',
    warning: 'bg-status-warning/8 border-status-warning/14',
    success: 'bg-status-success/8 border-status-success/16',
    info:    'bg-accent-info/8 border-accent-info/16',
  }
  const alertTone: Record<Alert['type'], string> = {
    danger: 'text-accent-danger', warning: 'text-status-warning', success: 'text-status-online', info: 'live-value',
  }

  const operatorName = user?.full_name?.split(' ')[0] ?? 'Admin'
  const latestBatchDate = allSessions.length > 0 && allSessions[0]?.created_at ? formatDate(allSessions[0]!.created_at) : null

  return (
    <div className="p-4 md:p-6 max-w-[1460px] mx-auto space-y-5">

      {/* ── Hero header ── */}
      <motion.section {...card(0)} className="grid xl:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <p className="system-kicker">SISTEMA OPERATIVO NEOSTILLS // Monitorización Activa</p>
          <h1 className="system-heading mt-2">
            Bienvenido, <span className="system-heading-accent">{operatorName}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-3xl">
            {brewery?.name ?? 'Tu destilería'} · {latestBatchDate ? `Último lote: ${latestBatchDate}` : 'Sin lotes aún'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <span className="system-status-chip">
            <span className="iot-pulse-dot" />
            Sensores activos
            <span className="live-value font-mono">12/12</span>
          </span>
          <Link to="/brewing" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all">
            <Zap size={14} />
            Nuevo lote
          </Link>
        </div>
      </motion.section>

      {/* ── KPI cards (5 + IoT) ── */}
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

      {/* ── AI Genio + Nuevo lote + Centro de alertas ── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* AI Genio Destilador */}
        <motion.div {...card(6)} className="xl:col-span-5 tech-panel glow-border p-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url('/still-schematic-v1.svg')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right -160px bottom -140px', backgroundSize: '640px' }} />
          <div className="relative z-10 flex items-start gap-4">
            <AiThinkingOrb />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="system-kicker !text-[10px] !tracking-[0.18em]">AI CONTROL LAYER</p>
                  <h2 className="text-xl font-display font-semibold text-text-primary mt-1">El Genio Destilador recomienda:</h2>
                </div>
                <span className="system-status-chip px-2.5 py-1"><Sparkles size={12} className="text-accent-copper" />Analizando</span>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed max-w-xl">{aiRecommendation.text}</p>

              {/* Mini analysis chart */}
              <div className="mt-4 rounded-xl border border-accent-cobalt/16 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
                  <span>Análisis de proceso</span>
                  <span className="live-value">LIVE</span>
                </div>
                <div className="grid grid-cols-5 gap-1 items-end h-12">
                  {[32, 52, 44, 64, 72].map((h, i) => (
                    <div key={i} className="rounded-sm" style={{ height: h, background: i === 4 ? 'rgba(34,230,255,0.8)' : 'rgba(184,115,51,0.55)' }} />
                  ))}
                </div>
                <div className="mt-2 space-y-1 text-[10px]">
                  {[['Fojos', '5.5%'], ['Hearts', '62.4%'], ['Colas', '0.8%'], ['Lean', '0.8%']].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-text-secondary">
                      <span>{k}</span><span className="font-mono text-text-primary">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button onClick={openAiPanel} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all">
                  {aiRecommendation.primaryAction}
                </button>
                <button className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary border border-accent-cobalt/24 bg-white/[0.02] hover:bg-bg-hover/70 transition-colors">
                  {aiRecommendation.secondaryAction}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Nuevo lote */}
        <motion.div {...card(7)} className="xl:col-span-3 tech-panel p-5 flex flex-col justify-between gap-5">
          <div>
            <p className="system-kicker !text-[10px]">PROCESS CONTROL</p>
            <h2 className="text-xl font-display font-semibold text-text-primary mt-1">Nuevo lote</h2>
            <p className="text-sm text-text-secondary mt-3 leading-relaxed">Arranca un nuevo proceso con checklist de producción y control de fases ya precargados.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Mashing', 'Cuts', 'Aging'].map((item, i) => (
              <div key={item} className="rounded-xl border border-accent-cobalt/16 bg-white/[0.02] px-2 py-3 text-center">
                <div className={cn('mx-auto mb-1.5 h-2.5 w-2.5 rounded-full', i === 1 ? 'bg-accent-info shadow-[0_0_10px_rgba(34,230,255,0.5)]' : 'bg-accent-copper/80')} />
                <p className="text-[10px] text-text-secondary uppercase tracking-[0.14em]">{item}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="system-status-chip"><span className="iot-pulse-dot" />Modo listo</span>
            <Link to="/brewing" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-bg-deep bg-copper-gradient border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all">
              Nuevo lote
            </Link>
          </div>
        </motion.div>

        {/* Centro de alertas */}
        <motion.div {...card(8)} className="xl:col-span-4 tech-panel tech-panel--active p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-accent-danger/24 bg-accent-danger/10 flex items-center justify-center">
                <AlertTriangle size={17} className="text-accent-danger" />
              </div>
              <div>
                <p className="system-kicker !text-[10px]">ALERT MATRIX</p>
                <h2 className="text-lg font-display font-semibold text-text-primary mt-0.5">Centro de alertas</h2>
              </div>
            </div>
            <Link to="/inventory" className="text-xs text-accent-copper hover:text-text-primary transition-colors">Ver todo</Link>
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className={cn('rounded-xl border px-3.5 py-2.5 flex items-center gap-3', alertSurface[alert.type])}>
                <alert.icon size={15} className={alertTone[alert.type]} />
                <p className="text-sm text-text-primary flex-1 truncate">{alert.title}</p>
                <span className={cn('text-xs whitespace-nowrap', alertTone[alert.type])}>{alert.detail}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Fermentación en vivo (if any) ── */}
      {activeFerms.length > 0 && (
        <motion.section {...card(9)} className="tech-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-accent-info/24 bg-accent-info/10 flex items-center justify-center">
                <Activity size={17} className="text-accent-info" />
              </div>
              <div>
                <p className="system-kicker !text-[10px]">IOT MONITOR</p>
                <h2 className="text-lg font-display font-semibold text-text-primary mt-0.5">Fermentación en vivo</h2>
              </div>
            </div>
            <Link to="/fermentation" className="text-xs text-accent-copper hover:text-text-primary flex items-center gap-1">
              Ver todo <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {activeFerms.map(f => <FermenterMini key={f.id} session={f} />)}
          </div>
        </motion.section>
      )}

      {/* ── Activity chart + Barrels ── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* Activity bar chart */}
        <motion.div {...card(10)} className="xl:col-span-7 tech-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-accent-copper/22 bg-accent-copper/10 flex items-center justify-center">
                <Activity size={17} className="text-accent-copper" />
              </div>
              <div>
                <p className="system-kicker !text-[10px]">ACTIVITY LOG</p>
                <h2 className="text-lg font-display font-semibold text-text-primary mt-0.5">Actividad</h2>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-text-tertiary">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#B87333] inline-block" />Destilación</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22E6FF] inline-block" />Fermentación</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C7A951] inline-block" />Maduración</span>
            </div>
          </div>
          <ActivityChart />
        </motion.div>

        {/* Barrels IoT panel */}
        <motion.div {...card(11)} className="xl:col-span-5 tech-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-accent-copper/22 bg-accent-copper/10 flex items-center justify-center">
                <Calendar size={17} className="text-accent-copper" />
              </div>
              <div>
                <p className="system-kicker !text-[10px]">AGING ROOM</p>
                <h2 className="text-lg font-display font-semibold text-text-primary mt-0.5">Barrels</h2>
              </div>
            </div>
          </div>
          <BarrelsPanel sessions={allSessions} />
        </motion.div>
      </section>

    </div>
  )
}
