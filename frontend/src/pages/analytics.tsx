// src/pages/analytics.tsx — NeoStills v4 Analytics Dashboard with Recharts
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, Beaker, Package,
  DollarSign,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

// ---- Mock data ----

const mockKpis = [
  { key: 'batches', value: 12, prev: 9, icon: Beaker, color: '#F5A623' },
  { key: 'efficiency', value: 72.5, prev: 70.1, icon: TrendingUp, color: '#7CB342', suffix: '%' },
  { key: 'cost_per_liter', value: 1.85, prev: 2.10, icon: DollarSign, color: '#42A5F5', prefix: '€', invert: true },
  { key: 'ingredients_used', value: 48.2, prev: 42.0, icon: Package, color: '#D4723C', suffix: ' kg' },
]

const efficiencyTrend = [
  { month: 'Oct', efficiency: 68, batches: 2 },
  { month: 'Nov', efficiency: 71, batches: 1 },
  { month: 'Dic', efficiency: 69, batches: 2 },
  { month: 'Ene', efficiency: 72, batches: 2 },
  { month: 'Feb', efficiency: 74, batches: 1 },
  { month: 'Mar', efficiency: 73, batches: 3 },
]

const costTrend = [
  { month: 'Oct', cost: 2.20 },
  { month: 'Nov', cost: 2.05 },
  { month: 'Dic', cost: 2.15 },
  { month: 'Ene', cost: 1.95 },
  { month: 'Feb', cost: 1.90 },
  { month: 'Mar', cost: 1.85 },
]

const styleDistribution = [
  { name: 'Whiskey', value: 5, color: '#B87333' },
  { name: 'Ron', value: 3, color: '#D4723C' },
  { name: 'Gin', value: 2, color: '#22E6FF' },
  { name: 'Vodka', value: 2, color: '#A3FAFF' },
  { name: 'Brandy', value: 1, color: '#7CB342' },
  { name: 'Licor', value: 1, color: '#C7A951' },
]

const ingredientUsage = [
  { name: 'Malta base', kg: 28 },
  { name: 'Maíz laminado', kg: 8 },
  { name: 'Centeno', kg: 4 },
  { name: 'Enebro', kg: 1.2 },
  { name: 'Coriandro', kg: 0.9 },
  { name: 'Cáscara cítrica', kg: 0.8 },
  { name: 'Levadura destilería', kg: 0.3 },
  { name: 'Trigo', kg: 5 },
]

const fermentationPerformance = [
  { batch: 'Wash #8', og: 1.065, fg: 1.012, attenuation: 81.5, days: 12 },
  { batch: 'Maíz #5', og: 1.052, fg: 1.014, attenuation: 73.1, days: 14 },
  { batch: 'Ron #3', og: 1.058, fg: 1.016, attenuation: 72.4, days: 18 },
  { batch: 'Base gin #2', og: 1.048, fg: 1.010, attenuation: 79.2, days: 10 },
  { batch: 'Whiskey #9', og: 1.068, fg: 1.011, attenuation: 83.8, days: 11 },
]

const seasonalData = [
  { month: 'Ene', liters: 40 },
  { month: 'Feb', liters: 20 },
  { month: 'Mar', liters: 60 },
  { month: 'Abr', liters: 38 },
  { month: 'May', liters: 19 },
  { month: 'Jun', liters: 57 },
  { month: 'Jul', liters: 35 },
  { month: 'Ago', liters: 25 },
  { month: 'Sep', liters: 45 },
  { month: 'Oct', liters: 50 },
  { month: 'Nov', liters: 30 },
  { month: 'Dic', liters: 42 },
]

const radarData = [
  { metric: 'Eficiencia', value: 73 },
  { metric: 'Consistencia', value: 68 },
  { metric: 'Variedad', value: 82 },
  { metric: 'Costo', value: 75 },
  { metric: 'Frecuencia', value: 60 },
  { metric: 'Calidad', value: 85 },
]

const supplierComparison = [
  { name: 'La Tienda del Destilador', avg_cost: 4.20, orders: 8, rating: 4.5, color: '#F5A623' },
  { name: 'Alcoholnía', avg_cost: 4.80, orders: 5, rating: 4.2, color: '#D4723C' },
  { name: 'Cocinista', avg_cost: 5.10, orders: 3, rating: 4.0, color: '#42A5F5' },
  { name: 'The Spirit Times', avg_cost: 4.50, orders: 6, rating: 4.3, color: '#7CB342' },
  { name: 'Castle Malting', avg_cost: 5.60, orders: 2, rating: 3.8, color: '#AB47BC' },
]

const brewingHeatmap = [
  { month: 'Ene', w1: 0, w2: 1, w3: 0, w4: 1 },
  { month: 'Feb', w1: 0, w2: 0, w3: 1, w4: 0 },
  { month: 'Mar', w1: 1, w2: 1, w3: 0, w4: 1 },
  { month: 'Abr', w1: 0, w2: 1, w3: 0, w4: 0 },
  { month: 'May', w1: 0, w2: 0, w3: 1, w4: 0 },
  { month: 'Jun', w1: 1, w2: 0, w3: 1, w4: 1 },
  { month: 'Jul', w1: 0, w2: 1, w3: 0, w4: 0 },
  { month: 'Ago', w1: 0, w2: 0, w3: 0, w4: 1 },
  { month: 'Sep', w1: 1, w2: 0, w3: 1, w4: 0 },
  { month: 'Oct', w1: 1, w2: 1, w3: 0, w4: 1 },
  { month: 'Nov', w1: 0, w2: 1, w3: 0, w4: 0 },
  { month: 'Dic', w1: 1, w2: 0, w3: 0, w4: 1 },
]

// ---- Components ----

function KpiCard({ kpi, i }: { kpi: typeof mockKpis[0]; i: number }) {
  const { t } = useTranslation('analytics')
  const diff = kpi.value - kpi.prev
  const pct = kpi.prev !== 0 ? Math.abs((diff / kpi.prev) * 100) : 0
  const isUp = diff > 0
  const isGood = kpi.invert ? !isUp : isUp

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: i * 0.06 }}
      className="glass-card rounded-[14px] p-4"
    >
      <div className="flex justify-between items-start mb-2.5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: `${kpi.color}12` }}
        >
          <kpi.icon size={18} color={kpi.color} />
        </div>
        <div className={cn(
          'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold',
          pct < 0.5 ? 'bg-[#8B9BB4]/[0.12] text-[#8B9BB4]'
            : isGood ? 'bg-[#7CB342]/[0.12] text-[#7CB342]'
            : 'bg-[#EF5350]/[0.12] text-[#EF5350]',
        )}>
          {pct < 0.5 ? <Minus size={11} /> : isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {pct < 0.5 ? '0%' : `${pct.toFixed(1)}%`}
        </div>
      </div>
      <div className="text-[26px] font-bold text-[#E8E0D4] font-display leading-tight">
        {kpi.prefix}{typeof kpi.value === 'number' && kpi.value % 1 !== 0 ? kpi.value.toFixed(1) : kpi.value}{kpi.suffix}
      </div>
      <div className="text-[11px] text-[#8B9BB4] mt-1">
        {t(`kpi.${kpi.key}`, kpi.key)}
      </div>
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111820] border border-white/10 rounded-lg px-3 py-2 text-xs">
      <div className="text-[#8B9BB4] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[#E8E0D4] font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, children, delay = 0 }: {
  title: string; children: React.ReactNode; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card rounded-2xl p-4 md:p-5"
    >
      <h3 className="text-[13px] font-semibold text-[#E8E0D4] font-display mb-4">
        {title}
      </h3>
      {children}
    </motion.div>
  )
}

// ---- Main page ----

export default function AnalyticsPage() {
  const { t } = useTranslation(['common', 'analytics'])
  const { setActivePage } = useUIStore()
  const [timeRange, setTimeRange] = useState('6m')

  useEffect(() => { setActivePage('analytics') }, [setActivePage])

  return (
    <div className="p-4 md:px-6 max-w-[1200px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#E8E0D4] font-display">
            📊 {t('nav.analytics')}
          </h1>
          <p className="text-[13px] text-[#8B9BB4] mt-1">
            {t('analytics:subtitle')}
          </p>
        </div>
        <div className="flex gap-1">
          {(['6m', '12m', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-all',
                timeRange === range
                  ? 'bg-accent-amber/15 text-accent-amber'
                  : 'bg-white/[0.05] text-[#8B9BB4] hover:bg-white/[0.08]',
              )}
            >
              {range === '6m' ? t('analytics:last_6m') : range === '12m' ? t('analytics:last_12m') : t('analytics:all_time')}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {mockKpis.map((kpi, i) => (
          <KpiCard key={kpi.key} kpi={kpi} i={i} />
        ))}
      </div>

      {/* Charts row 1: Efficiency trend + Cost trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('analytics:efficiency_trend', 'Tendencia de eficiencia')} delay={0.15}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={efficiencyTrend}>
              <defs>
                <linearGradient id="gradEff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7CB342" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7CB342" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#5A6B80', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 85]} tick={{ fill: '#5A6B80', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="efficiency" stroke="#7CB342" strokeWidth={2}
                fill="url(#gradEff)" name={t('analytics:kpi.efficiency', 'Eficiencia')} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('analytics:cost_trend', 'Coste por litro')} delay={0.2}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={costTrend}>
              <defs>
                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#42A5F5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#42A5F5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#5A6B80', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[1.5, 2.5]} tick={{ fill: '#5A6B80', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="cost" stroke="#42A5F5" strokeWidth={2}
                fill="url(#gradCost)" name="€/L" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2: Style donut + Ingredient usage bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('analytics:style_distribution', 'Distribución de estilos')} delay={0.25}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200} className="sm:!w-1/2">
              <PieChart>
                <Pie
                  data={styleDistribution}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  dataKey="value"
                  stroke="none"
                  animationBegin={300} animationDuration={800}
                >
                  {styleDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 w-full">
              {styleDistribution.map(s => (
                <div key={s.name} className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{
                      background: s.color,
                      border: s.color === '#FFF8E7' || s.color === '#2C1810'
                        ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    }}
                  />
                  <span className="text-xs text-[#E8E0D4] flex-1">{s.name}</span>
                  <span className="text-xs font-semibold text-accent-amber font-mono">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title={t('analytics:ingredient_usage', 'Uso de ingredientes (kg)')} delay={0.3}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ingredientUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#5A6B80', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80}
                tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="kg" fill="#D4723C" radius={[0, 4, 4, 0]} barSize={14} name="kg" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 3: Fermentation table + Seasonal bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('analytics:fermentation_comparison', 'Rendimiento de fermentación')} delay={0.35}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {[t('analytics:table.batch', 'Batch'), 'OG', 'FG', t('analytics:table.attenuation', 'Att.'), t('analytics:table.days', 'Days')].map(h => (
                    <th key={h} className="text-left px-2 py-1.5 text-[#5A6B80] font-semibold text-[10px] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fermentationPerformance.map((row, i) => (
                  <tr key={i} className={cn(
                    'border-b border-white/[0.03]',
                    i % 2 === 0 && 'bg-white/[0.01]',
                  )}>
                    <td className="px-2 py-2 text-[#E8E0D4] font-medium">{row.batch}</td>
                    <td className="px-2 py-2 text-accent-amber font-mono">{row.og.toFixed(3)}</td>
                    <td className="px-2 py-2 text-accent-copper font-mono">{row.fg.toFixed(3)}</td>
                    <td className="px-2 py-2">
                      <span className={cn(
                        'px-2 py-0.5 rounded-[10px] text-[11px] font-semibold',
                        row.attenuation > 80 ? 'bg-[#7CB342]/[0.12] text-[#7CB342]'
                          : row.attenuation > 70 ? 'bg-accent-amber/[0.12] text-accent-amber'
                          : 'bg-[#EF5350]/[0.12] text-[#EF5350]',
                      )}>
                        {row.attenuation.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-2 py-2 text-[#8B9BB4] font-mono">{row.days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title={t('analytics:seasonal_patterns', 'Patrón estacional (litros/mes)')} delay={0.4}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#5A6B80', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A6B80', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="liters" radius={[4, 4, 0, 0]} barSize={20} name={t('analytics:liters', 'Litros')}>
                {seasonalData.map((entry, i) => (
                  <Cell key={i} fill={entry.liters > 45 ? '#F5A623' : entry.liters > 30 ? '#D4723C' : '#5A6B80'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* NEW: Charts row 4: Supplier cost comparison + Monthly brewing heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supplier Cost Comparison */}
        <ChartCard title={t('analytics:supplier_comparison', 'Comparativa de proveedores')} delay={0.45}>
          <div className="space-y-3">
            {supplierComparison.map((supplier) => {
              const maxCost = Math.max(...supplierComparison.map(s => s.avg_cost))
              const pct = (supplier.avg_cost / maxCost) * 100
              return (
                <div key={supplier.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#E8E0D4] truncate flex-1 mr-2">{supplier.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[#8B9BB4]">{supplier.orders} pedidos</span>
                      <span className="text-xs font-semibold font-mono" style={{ color: supplier.color }}>
                        €{supplier.avg_cost.toFixed(2)}/kg
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: supplier.color }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-[#5A6B80] text-right mt-2">
              {t('analytics:lower_is_better', 'Menor coste = mejor valor')}
            </p>
          </div>
        </ChartCard>

        {/* Monthly Brewing Heatmap */}
        <ChartCard title={t('analytics:brewing_heatmap', 'Frecuencia de elaboración')} delay={0.5}>
          <div className="overflow-x-auto">
            <div className="min-w-[280px]">
              {/* Column headers */}
              <div className="flex mb-1">
                <div className="w-10 shrink-0" />
                {['S1', 'S2', 'S3', 'S4'].map(w => (
                  <div key={w} className="flex-1 text-center text-[10px] text-[#5A6B80] font-medium">
                    {w}
                  </div>
                ))}
              </div>
              {/* Heatmap rows */}
              {brewingHeatmap.map((row) => (
                <div key={row.month} className="flex items-center gap-1 mb-1">
                  <span className="w-10 shrink-0 text-[10px] text-[#8B9BB4] font-medium">
                    {row.month}
                  </span>
                  {[row.w1, row.w2, row.w3, row.w4].map((val, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 h-5 rounded-sm transition-colors',
                        val > 0 ? 'bg-accent-amber/40' : 'bg-white/[0.04]',
                      )}
                      title={val > 0 ? `${row.month} S${i + 1}: ${val} lote(s)` : ''}
                    />
                  ))}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-end gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-white/[0.04]" />
                  <span className="text-[10px] text-[#5A6B80]">{t('analytics:no_brew', 'Sin producción')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-accent-amber/40" />
                  <span className="text-[10px] text-[#5A6B80]">{t('analytics:brewed', 'Producción')}</span>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Brewery Radar Score */}
      <ChartCard title={t('analytics:brewery_score', 'Perfil de tu destilería')} delay={0.55}>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <ResponsiveContainer width={280} height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#8B9BB4', fontSize: 11 }} />
              <Radar name={t('analytics:score', 'Score')} dataKey="value"
                stroke="#F5A623" fill="#F5A623" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex-1 min-w-[200px]">
            <div className="text-5xl font-extrabold text-accent-amber font-display leading-none">
              {Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length)}
            </div>
            <div className="text-[13px] text-[#8B9BB4] mt-1">
              {t('analytics:overall_score', 'Puntuación general')}
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {[...radarData]
                .sort((a, b) => b.value - a.value)
                .slice(0, 3)
                .map(d => (
                  <div key={d.metric} className="flex items-center gap-2 text-xs">
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      d.value > 75 ? 'bg-[#7CB342]' : 'bg-accent-amber',
                    )} />
                    <span className="text-[#E8E0D4]">{d.metric}</span>
                    <span className="ml-auto text-accent-amber font-mono font-semibold">
                      {d.value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
