// frontend/src/pages/pool-buying.tsx — NeoStills v4 — Pool Buying (Compra Conjunta)
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MapPin, Plus, Package, Truck, Calendar,
  ChevronDown, ChevronUp, Share2, TrendingDown,
  ShoppingCart, Clock, Star, Sparkles, Search,
  CircleDot, User, Handshake,
} from 'lucide-react'
import { usePoolStore } from '@/stores/pool-store'
import {
  SUPPLIER_DATABASE,
  SUPPLIER_MAP,
  COUNTRY_FLAGS,
  calcTotalWithShipping,
} from '@/data/suppliers'
import type { PoolOrder, PoolItem, PoolParticipant, PoolStatus } from '@/lib/types'

/* ── Seed demo data ─────────────────────────────────────────────────────────── */

const DEMO_PARTICIPANTS: PoolParticipant[] = [
  { id: 'me', name: 'Tú', rating: 4.8, joinedAt: '2026-03-01' },
  { id: 'ana', name: 'Ana', rating: 4.6, joinedAt: '2026-03-02' },
  { id: 'luis', name: 'Luis', rating: 4.4, joinedAt: '2026-03-03' },
  { id: 'pedro', name: 'Pedro', rating: 4.2, joinedAt: '2026-03-04' },
]

const DEMO_POOLS: PoolOrder[] = [
  {
    id: 'pool-1',
    title: 'Pedido cereales — base whiskey',
    supplier: 'brouwland',
    organizer: DEMO_PARTICIPANTS[0]!,
    participants: DEMO_PARTICIPANTS.slice(0, 3),
    items: [
      {
        id: 'pi-1',
        name: 'Malta pilsner 25kg',
        unit: 'saco',
        unitPrice: 32.50,
        quantities: { me: 1, ana: 1, luis: 1 },
      },
      {
        id: 'pi-2',
        name: 'Maíz laminado 25kg',
        unit: 'saco',
        unitPrice: 35.00,
        quantities: { me: 1, pedro: 1 },
      },
      {
        id: 'pi-3',
        name: 'Centeno 5kg',
        unit: 'bolsa',
        unitPrice: 8.90,
        quantities: { me: 2, ana: 1, luis: 1 },
      },
    ],
    status: 'open',
    subtotal: 203.10,
    shipping: 0,
    individualCostEstimate: 248.10,
    savingsPercent: 18.2,
    zone: 'Segovia',
    deliveryPoint: 'Locker InPost — C/ Real 22, Segovia',
    closingDate: '2026-03-28',
    estimatedDelivery: '2026-04-03',
    createdAt: '2026-03-15',
  },
  {
    id: 'pool-2',
    title: 'Botánicos y cítricos — pedido trimestral',
    supplier: 'latiendadelcervecero',
    organizer: DEMO_PARTICIPANTS[1]!,
    participants: DEMO_PARTICIPANTS.slice(0, 4),
    items: [
      {
        id: 'pi-4',
        name: 'Enebro 1kg',
        unit: 'bolsa',
        unitPrice: 4.50,
        quantities: { me: 3, ana: 2, luis: 2, pedro: 1 },
      },
      {
        id: 'pi-5',
        name: 'Coriandro 1kg',
        unit: 'bolsa',
        unitPrice: 4.80,
        quantities: { me: 2, ana: 3, pedro: 2 },
      },
      {
        id: 'pi-6',
        name: 'Piel de naranja seca 500g',
        unit: 'bolsa',
        unitPrice: 4.20,
        quantities: { me: 1, luis: 3 },
      },
    ],
    status: 'open',
    subtotal: 83.80,
    shipping: 0,
    individualCostEstimate: 103.60,
    savingsPercent: 19.1,
    zone: 'Madrid',
    deliveryPoint: 'Punto de recogida — Malasaña 14, Madrid',
    closingDate: '2026-04-05',
    estimatedDelivery: '2026-04-08',
    createdAt: '2026-03-20',
  },
]

/* ── Status config ──────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<PoolStatus, { label: string; bg: string; text: string }> = {
  open: { label: 'Abierto', bg: 'bg-green-500/15', text: 'text-green-400' },
  closed: { label: 'Cerrado', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  ordered: { label: 'Pedido', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  delivered: { label: 'Entregado', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/15', text: 'text-red-400' },
}

/* ── Zone / Radar Section ───────────────────────────────────────────────────── */

function ZoneHeader({ zone, radius, brewerCount }: { zone: string; radius: number; brewerCount: number }) {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-accent-hop/15 flex items-center justify-center">
          <MapPin size={20} className="text-accent-hop" />
        </div>
        <div>
          <p className="text-sm text-text-tertiary">Tu zona</p>
          <p className="font-semibold text-text-primary">
            {zone} <span className="text-text-tertiary font-normal">({radius}km radio)</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Users size={20} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-text-tertiary">Brewers activos</p>
          <p className="font-semibold text-text-primary">{brewerCount}</p>
        </div>
      </div>

      {/* Radar placeholder — future: Leaflet map */}
      <div className="hidden lg:flex items-center gap-2 ml-auto">
        <div className="w-[180px] h-[100px] rounded-lg bg-bg-deep/60 border border-border-subtle flex flex-col items-center justify-center">
          <CircleDot size={28} className="text-accent-hop/30 mb-1" />
          <span className="text-[10px] text-text-tertiary">Radar de brewers</span>
          <span className="text-[9px] text-text-quaternary">Mapa próximamente</span>
        </div>
      </div>
    </div>
  )
}

/* ── Pool Card ──────────────────────────────────────────────────────────────── */

function PoolCard({ pool }: { pool: PoolOrder }) {
  const [expanded, setExpanded] = useState(false)
  const supplier = SUPPLIER_MAP.get(pool.supplier)
  const flag = supplier ? COUNTRY_FLAGS[supplier.country] ?? '' : ''
  const sc = STATUS_CONFIG[pool.status]

  const totalQtyPerParticipant = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of pool.items) {
      for (const [pid, qty] of Object.entries(item.quantities)) {
        map.set(pid, (map.get(pid) ?? 0) + qty * item.unitPrice)
      }
    }
    return map
  }, [pool.items])

  const myTotal = totalQtyPerParticipant.get('me') ?? 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Status dot */}
        <div className={`mt-1 w-3 h-3 rounded-full ${pool.status === 'open' ? 'bg-green-400 animate-pulse' : sc.bg}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary truncate">{pool.title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary flex-wrap">
            <span className="flex items-center gap-1">
              {flag} {supplier?.name ?? pool.supplier}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} /> {pool.participants.length} participantes
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> Cierre: {new Date(pool.closingDate).toLocaleDateString('es')}
            </span>
          </div>
        </div>

        {/* Savings badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-lg font-bold text-accent-amber">
            {pool.subtotal + pool.shipping}€
          </span>
          <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <TrendingDown size={12} /> −{pool.savingsPercent.toFixed(1)}%
          </span>
        </div>

        {expanded ? <ChevronUp size={18} className="text-text-tertiary mt-1" /> : <ChevronDown size={18} className="text-text-tertiary mt-1" />}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Items table */}
              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.03]">
                      <th className="text-left p-2 text-text-tertiary font-medium">Artículo</th>
                      <th className="text-center p-2 text-text-tertiary font-medium">Precio</th>
                      <th className="text-center p-2 text-text-tertiary font-medium">Uds total</th>
                      <th className="text-center p-2 text-text-tertiary font-medium">Tus uds</th>
                      <th className="text-right p-2 text-text-tertiary font-medium">Tu coste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pool.items.map((item) => {
                      const totalQty = Object.values(item.quantities).reduce((a, b) => a + b, 0)
                      const myQty = item.quantities['me'] ?? 0
                      return (
                        <tr key={item.id} className="border-t border-border-subtle/50">
                          <td className="p-2 text-text-primary">{item.name}</td>
                          <td className="p-2 text-center text-text-secondary">{item.unitPrice.toFixed(2)}€/{item.unit}</td>
                          <td className="p-2 text-center text-text-secondary">{totalQty}</td>
                          <td className="p-2 text-center text-accent-amber font-medium">{myQty}</td>
                          <td className="p-2 text-right text-text-primary font-medium">{(myQty * item.unitPrice).toFixed(2)}€</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Participants */}
              <div>
                <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1">
                  <Users size={12} /> Participantes
                </p>
                <div className="flex flex-wrap gap-2">
                  {pool.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-border-subtle text-xs">
                      <User size={12} className="text-text-tertiary" />
                      <span className="text-text-primary">{p.name}</span>
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Star size={10} /> {p.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery info */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-border-subtle">
                  <MapPin size={14} className="text-accent-hop shrink-0" />
                  <div className="text-xs">
                    <p className="text-text-tertiary">Punto de entrega</p>
                    <p className="text-text-primary">{pool.deliveryPoint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-border-subtle">
                  <Truck size={14} className="text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <p className="text-text-tertiary">Entrega estimada</p>
                    <p className="text-text-primary">{new Date(pool.estimatedDelivery).toLocaleDateString('es')}</p>
                  </div>
                </div>
              </div>

              {/* Savings breakdown */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <TrendingDown size={18} className="text-green-400 shrink-0" />
                <div className="text-xs flex-1">
                  <p className="text-green-300 font-medium">
                    Ahorras {(pool.individualCostEstimate - pool.subtotal - pool.shipping).toFixed(2)}€ comprando en pool
                  </p>
                  <p className="text-text-tertiary mt-0.5">
                    Individual: {pool.individualCostEstimate.toFixed(2)}€ → Pool: {(pool.subtotal + pool.shipping).toFixed(2)}€
                    {pool.shipping === 0 && ' (envío gratis)'}
                  </p>
                </div>
              </div>

              {/* My cost */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
                <span className="text-sm text-text-secondary">Tu parte del pedido:</span>
                <span className="text-lg font-bold text-accent-amber">{myTotal.toFixed(2)}€</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {pool.status === 'open' && (
                  <button className="btn-primary-sm flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-accent-amber/15 text-accent-amber font-medium hover:bg-accent-amber/25 transition-colors">
                    <ShoppingCart size={14} /> Unirse al Pool
                  </button>
                )}
                <button className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/[0.04] text-text-secondary border border-border-subtle hover:bg-white/[0.06] transition-colors">
                  <Share2 size={14} /> Compartir
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── AI Suggestion Card ─────────────────────────────────────────────────────── */

function AISuggestion() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-xl p-4 border-l-2 border-accent-amber/40"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-amber/10 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-accent-amber" />
        </div>
        <div className="text-xs space-y-1">
          <p className="text-text-primary font-medium">Sugerencia AI</p>
          <p className="text-text-secondary leading-relaxed">
            Si 2 destiladores más se unen al pool de cereales, alcanzáis el tier mayorista de Brouwland (−15%).
            Comparte el enlace para llegar a destiladores cercanos.
          </p>
          <button className="flex items-center gap-1 text-accent-amber hover:text-accent-amber/80 transition-colors mt-1">
            <Share2 size={12} /> Compartir con destiladores cercanos
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Reverse Demand Card ────────────────────────────────────────────────────── */

function ReverseDemandCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Handshake size={16} className="text-accent-hop" />
        <h3 className="text-sm font-semibold text-text-primary">Demanda Inversa</h3>
      </div>
      <p className="text-xs text-text-secondary mb-3">
        Los proveedores ven la demanda agregada de tu zona y pueden ofrecer ofertas proactivamente.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
          <span className="text-xs">🇧🇪</span>
          <p className="text-xs text-text-primary flex-1">
            <span className="text-green-400 font-medium">Brouwland</span> ofrece −20% en Weyermann Pilsner si el pool alcanza 200kg
          </p>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <span className="text-xs">🇪🇸</span>
          <p className="text-xs text-text-primary flex-1">
            <span className="text-blue-400 font-medium">La Tienda del Destilador</span> — envío gratis para pools {'>'}80€
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Stats strip ────────────────────────────────────────────────────────────── */

function PoolStats({ pools }: { pools: PoolOrder[] }) {
  const activePools = pools.filter((p) => p.status === 'open').length
  const totalParticipants = new Set(pools.flatMap((p) => p.participants.map((pp) => pp.id))).size
  const totalSavings = pools.reduce((s, p) => s + (p.individualCostEstimate - p.subtotal - p.shipping), 0)

  const stats = [
    { label: 'Pools activos', value: activePools, icon: ShoppingCart, color: 'text-green-400' },
    { label: 'Participantes', value: totalParticipants, icon: Users, color: 'text-blue-400' },
    { label: 'Ahorro total', value: `${totalSavings.toFixed(0)}€`, icon: TrendingDown, color: 'text-amber-400' },
    { label: 'Proveedores', value: new Set(pools.map((p) => p.supplier)).size, icon: Package, color: 'text-accent-hop' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="glass-card rounded-xl p-3 text-center">
          <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
          <p className="text-lg font-bold text-text-primary">{s.value}</p>
          <p className="text-[10px] text-text-tertiary">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */

export default function PoolBuyingPage() {
  const { t } = useTranslation('common')
  const { pools: storedPools, myZone, myRadius } = usePoolStore()
  const [filter, setFilter] = useState<PoolStatus | 'all'>('all')

  // Merge demo pools with any user-created ones
  const allPools = useMemo(() => {
    const ids = new Set(storedPools.map((p) => p.id))
    const merged = [...storedPools]
    for (const dp of DEMO_POOLS) {
      if (!ids.has(dp.id)) merged.push(dp)
    }
    return merged
  }, [storedPools])

  const filteredPools = filter === 'all' ? allPools : allPools.filter((p) => p.status === filter)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <Users className="text-accent-hop" size={28} />
            {t('nav.pool_buying')}
          </h1>
          <p className="page-header__subtitle">
            Agrupa pedidos con destiladores de tu zona para ahorrar en envíos y conseguir mejores escalados de compra
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-amber/15 text-accent-amber font-medium text-sm hover:bg-accent-amber/25 transition-colors shrink-0">
          <Plus size={16} /> Crear Pool
        </button>
      </div>

      {/* Zone + Radar */}
      <ZoneHeader zone={myZone} radius={myRadius} brewerCount={7} />

      {/* Stats */}
      <PoolStats pools={allPools} />

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'open', 'closed', 'ordered', 'delivered'] as const).map((s) => {
          const label = s === 'all' ? 'Todos' : STATUS_CONFIG[s].label
          const isActive = filter === s
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30'
                  : 'bg-white/[0.04] text-text-secondary border border-border-subtle hover:bg-white/[0.06]'
              }`}
            >
              {label} {s === 'all' ? `(${allPools.length})` : `(${allPools.filter((p) => p.status === s).length})`}
            </button>
          )
        })}
      </div>

      {/* Two-column layout: pools + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: pool cards */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </AnimatePresence>

          {filteredPools.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center">
              <Search size={32} className="text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary text-sm">No hay pools con ese filtro</p>
            </div>
          )}
        </div>

        {/* Sidebar: AI + Reverse Demand */}
        <div className="space-y-4">
          <AISuggestion />
          <ReverseDemandCard />

          {/* Split Calculator teaser */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-text-tertiary" />
              <h4 className="text-xs font-medium text-text-tertiary">Split Calculator</h4>
            </div>
            <p className="text-xs text-text-secondary">
              Después de la entrega, la app calcula automáticamente quién recibe qué y cuánto debe pagar cada uno.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
