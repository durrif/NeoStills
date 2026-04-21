// frontend/src/pages/inventory.tsx — NeoStills v4 Smart Inventory
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, RefreshCw, AlertTriangle, Download, ChevronDown, ChevronRight,
  Package, Wheat, Leaf, Pill, Beaker, LayoutGrid, BarChart3,
  Search, X, SlidersHorizontal, ArrowUpDown, FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { useUIStore } from '@/stores/ui-store'
import { useInventory, useAdjustStock, useDeleteIngredient } from '@/hooks/use-inventory'
import { IngredientCard } from '@/components/inventory/ingredient-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, categoryColor, categoryIcon } from '@/lib/utils'
import {
  groupByMajorAndSub, getSubcategoryInfo,
  MAJOR_CATEGORIES, toMajorCategory,
  type MajorCategory, type Subcategory,
} from '@/lib/ingredient-matcher'
import type { Ingredient, IngredientCategory } from '@/lib/types'

/* ── Constants ─────────────────────────────────────────────── */
type ViewMode = 'grid' | 'warehouse'
type SortKey = 'name' | 'quantity' | 'expiry' | 'category' | 'price'

const CATEGORIES = [
  { value: '', label: 'Todos', icon: Package },
  { value: 'cereal_base', label: 'Cereal base', icon: Wheat },
  { value: 'cereal_especial', label: 'Cereal especial', icon: Wheat },
  { value: 'fruta', label: 'Frutas', icon: Wheat },
  { value: 'botanico', label: 'Botánicos', icon: Leaf },
  { value: 'levadura', label: 'Levadura', icon: Pill },
  { value: 'azucar', label: 'Azúcares', icon: Package },
  { value: 'agua_quimica', label: 'Química de agua', icon: Beaker },
  { value: 'adjunto', label: 'Adjunto', icon: Beaker },
  { value: 'otro', label: 'Otro', icon: Package },
] as const

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'quantity', label: 'Cantidad' },
  { key: 'expiry', label: 'Caducidad' },
  { key: 'category', label: 'Categoría' },
  { key: 'price', label: 'Precio' },
]

const CATEGORY_ORDER: Record<string, number> = {
  cereal_base: 0, cereal_especial: 1, fruta: 2,
  azucar: 3, botanico: 4, levadura: 5, agua_quimica: 6,
  adjunto: 7, otro: 8,
}

/* ── Sort helpers ──────────────────────────────────────────── */
function sortIngredients(items: Ingredient[], key: SortKey): Ingredient[] {
  const sorted = [...items]
  switch (key) {
    case 'name': return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'quantity': return sorted.sort((a, b) => b.quantity - a.quantity)
    case 'expiry': return sorted.sort((a, b) => {
      if (!a.expiry_date) return 1
      if (!b.expiry_date) return -1
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    })
    case 'category': return sorted.sort((a, b) =>
      (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9))
    case 'price': return sorted.sort((a, b) =>
      (b.purchase_price ?? 0) - (a.purchase_price ?? 0))
    default: return sorted
  }
}

/* ── Category Icon helper ──────────────────────────────────── */
const CAT_ICON: Record<string, typeof Package> = {
  cereal_base: Wheat, cereal_especial: Wheat, fruta: Wheat,
  azucar: Package, botanico: Leaf, levadura: Pill,
  agua_quimica: Beaker, adjunto: Beaker, otro: Package,
}

const MAJOR_ICON: Record<MajorCategory, typeof Package> = {
  fermentables: Wheat, botanicos: Leaf, fermentacion: Pill, proceso: Beaker, otros: Package,
}

/* ── Warehouse Treemap Bar ─────────────────────────────────── */
function WarehouseBar({ items }: { items: Ingredient[] }) {
  // Group by major category for the bar
  const groups = new Map<MajorCategory, Ingredient[]>()
  for (const item of items) {
    const major = toMajorCategory(item.category)
    if (!groups.has(major)) groups.set(major, [])
    groups.get(major)!.push(item)
  }
  const total = items.reduce((s, i) => s + i.quantity, 0)
  if (total === 0) return null

  return (
    <div className="glass-card rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-text-primary">Vista almacén</h3>
        <span className="text-xs text-text-tertiary font-mono">{items.length} ingredientes</span>
      </div>
      {/* Proportional bar */}
      <div className="flex rounded-lg overflow-hidden h-8 gap-px">
        {[...groups.entries()].map(([major, catItems]) => {
          const catTotal = catItems.reduce((s, i) => s + i.quantity, 0)
          const pct = (catTotal / total) * 100
          if (pct < 1) return null
          const info = MAJOR_CATEGORIES.find(c => c.key === major)
          const color = info?.color ?? '#607D8B'
          return (
            <motion.div
              key={major}
              className="relative group cursor-default flex items-center justify-center overflow-hidden"
              style={{ width: `${pct}%`, backgroundColor: `${color}30` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-[9px] font-medium text-text-primary truncate px-1">
                {pct >= 8 ? `${info?.label ?? major}` : ''}
              </span>
              {/* hover detail */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                <div className="glass-card rounded-lg border border-white/10 px-2 py-1 text-[10px] whitespace-nowrap text-text-primary shadow-elevated">
                  {info?.label ?? major}: {catItems.length} items · {catTotal.toFixed(1)} total
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {[...groups.entries()].map(([major, catItems]) => {
          const info = MAJOR_CATEGORIES.find(c => c.key === major)
          const color = info?.color ?? '#607D8B'
          return (
            <div key={major} className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span>{info?.label ?? major}</span>
              <span className="font-mono text-text-secondary">{catItems.length}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Major Category Section Header ─────────────────────────── */
function MajorCategoryHeader({
  major, count, collapsed, onToggle,
}: {
  major: MajorCategory; count: number; collapsed: boolean; onToggle: () => void
}) {
  const info = MAJOR_CATEGORIES.find(c => c.key === major)
  const color = info?.color ?? '#607D8B'
  const Icon = MAJOR_ICON[major] ?? Package

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full py-2.5 group"
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="font-display font-bold text-base text-text-primary">
        {info?.label ?? major}
      </span>
      <Badge variant="outline" className="border-white/10 text-text-tertiary text-[10px]">
        {count}
      </Badge>
      <div className="flex-1" />
      <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.15 }}>
        <ChevronDown className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
      </motion.div>
    </button>
  )
}

/* ── Subcategory Section Header ────────────────────────────── */
function SubcategoryHeader({
  major, sub, count,
}: {
  major: MajorCategory; sub: Subcategory; count: number
}) {
  const info = getSubcategoryInfo(major, sub)
  return (
    <div className="flex items-center gap-2 py-1.5 pl-4">
      <span className="text-sm">{info.emoji}</span>
      <span className="text-xs font-medium text-text-secondary">{info.label}</span>
      <span className="text-[10px] text-text-tertiary font-mono">({count})</span>
      <div className="flex-1 h-px bg-white/5 ml-2" />
    </div>
  )
}

/* ── Summary Stats ─────────────────────────────────────────── */
function InventoryStats({ items }: { items: Ingredient[] }) {
  const lowStock = items.filter(i => i.min_stock && i.quantity <= i.min_stock).length
  const expiring = items.filter(i => {
    if (!i.expiry_date) return false
    const d = (new Date(i.expiry_date).getTime() - Date.now()) / 86400000
    return d >= 0 && d <= 30
  }).length
  const totalValue = items.reduce((s, i) => s + (i.purchase_price ?? 0) * i.quantity, 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Total', value: `${items.length}`, sub: 'ingredientes', color: 'text-accent-amber' },
        { label: 'Stock bajo', value: `${lowStock}`, sub: 'por reponer', color: lowStock ? 'text-amber-400' : 'text-emerald-400' },
        { label: 'Por caducar', value: `${expiring}`, sub: '< 30 días', color: expiring ? 'text-red-400' : 'text-emerald-400' },
        { label: 'Valor est.', value: `${totalValue.toFixed(0)}€`, sub: 'inventario', color: 'text-accent-copper' },
      ].map(s => (
        <div key={s.label} className="glass-card rounded-xl border border-white/10 p-3 text-center">
          <p className={cn('font-display font-bold text-lg', s.color)}>{s.value}</p>
          <p className="text-[10px] text-text-tertiary">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function InventoryPage() {
  const { setActivePage } = useUIStore()
  const { t } = useTranslation('common')
  useEffect(() => setActivePage('inventory'), [setActivePage])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiringDays, setExpiringDays] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('category')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, refetch } = useInventory({
    page,
    page_size: 200, // fetch more for client-side grouping
    category: category || undefined,
    search: search || undefined,
    low_stock_only: lowStockOnly || undefined,
    expiring_days: expiringDays ?? undefined,
  })

  const adjustStock = useAdjustStock()
  const deleteIngredient = useDeleteIngredient()

  const rawItems: Ingredient[] = data?.items ?? []
  const total = data?.total ?? 0

  // Client-side sort
  const sorted = useMemo(() => sortIngredients(rawItems, sortKey), [rawItems, sortKey])
  const twoLevel = useMemo(() => groupByMajorAndSub(sorted), [sorted])

  const toggleGroup = (cat: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleAdjust = (ingredient: Ingredient, delta: number) => {
    adjustStock.mutate(
      { id: ingredient.id, delta, reason: 'quick_adjust' },
      { onError: () => toast.error(t('inventory.adjust_error')) },
    )
  }

  const handleDelete = (ingredient: Ingredient) => {
    if (!confirm(t('inventory.confirm_delete', { name: ingredient.name }))) return
    deleteIngredient.mutate(ingredient.id, {
      onSuccess: () => toast.success(t('inventory.deleted')),
      onError: () => toast.error(t('inventory.delete_error')),
    })
  }

  const activeFilterCount =
    (category ? 1 : 0) + (lowStockOnly ? 1 : 0) + (expiringDays != null ? 1 : 0)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            {t('inventory.title')}
          </h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            {t('inventory.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className={cn('text-text-tertiary', isFetching && 'animate-spin')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button className="bg-accent-amber hover:bg-accent-amber/90 text-bg-primary font-semibold">
            <Plus className="h-4 w-4 mr-1" /> {t('actions.add')}
          </Button>
        </div>
      </div>

      {/* ── Stats Strip ───────────────────────────────────── */}
      <InventoryStats items={rawItems} />

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Search + controls row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder={t('inventory.search')}
              className="pl-9 bg-bg-secondary border-white/10 text-text-primary placeholder:text-text-tertiary"
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                onClick={() => setSearch('')}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative group">
            <Button variant="outline" size="sm" className="border-white/10 text-text-secondary h-10 gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{SORT_OPTIONS.find(s => s.key === sortKey)?.label}</span>
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-30">
              <div className="glass-card rounded-lg border border-white/10 p-1 shadow-elevated min-w-[120px]">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSortKey(opt.key)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded text-xs transition-colors',
                      sortKey === opt.key
                        ? 'bg-accent-amber/20 text-accent-amber'
                        : 'text-text-secondary hover:bg-white/5',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-2.5 py-2 transition-colors',
                viewMode === 'grid' ? 'bg-accent-amber/20 text-accent-amber' : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('warehouse')}
              className={cn(
                'px-2.5 py-2 transition-colors',
                viewMode === 'warehouse' ? 'bg-accent-amber/20 text-accent-amber' : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(({ value, label, icon: CIcon }) => (
            <button
              key={value}
              onClick={() => { setCategory(value); setPage(1) }}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors',
                category === value
                  ? 'bg-accent-amber/20 border-accent-amber text-accent-amber'
                  : 'bg-bg-secondary border-white/10 text-text-tertiary hover:border-white/20',
              )}
            >
              <CIcon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Quick filter badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1) }}
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs border transition-colors',
              lowStockOnly
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                : 'bg-bg-secondary border-white/10 text-text-tertiary hover:border-amber-500/40',
            )}
          >
            ⚠ {t('inventory.low_stock')}
          </button>
          <button
            onClick={() => { setExpiringDays(expiringDays === null ? 30 : null); setPage(1) }}
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs border transition-colors',
              expiringDays != null
                ? 'bg-red-500/20 border-red-500/60 text-red-400'
                : 'bg-bg-secondary border-white/10 text-text-tertiary hover:border-red-500/40',
            )}
          >
            ⏰ {t('inventory.expiring_soon')}
          </button>
          <span className="ml-auto text-xs text-text-tertiary">
            {sorted.length === total
              ? `${total} ingredientes`
              : `${sorted.length} / ${total}`}
          </span>
        </div>
      </div>

      {/* ── Warehouse View ────────────────────────────────── */}
      {viewMode === 'warehouse' && sorted.length > 0 && (
        <WarehouseBar items={sorted} />
      )}

      {/* ── Content ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl h-36 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Package className="h-12 w-12 text-text-tertiary" />
          <p className="text-text-tertiary text-lg font-display">
            {search || category || lowStockOnly || expiringDays != null
              ? t('inventory.no_results')
              : t('inventory.no_items')}
          </p>
          {(search || category || lowStockOnly || expiringDays != null) && (
            <Button
              variant="outline"
              className="border-white/10"
              onClick={() => { setSearch(''); setCategory(''); setLowStockOnly(false); setExpiringDays(null) }}
            >
              {t('inventory.clear_filters')}
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' && sortKey === 'category' && !category ? (
        /* Grouped view — major category → subcategory */
        <div className="space-y-2">
          {[...twoLevel.entries()].map(([major, subMap]) => {
            const majorCount = [...subMap.values()].reduce((s, arr) => s + arr.length, 0)
            const isCollapsed = collapsedGroups.has(major)

            return (
              <div key={major} className="glass-card rounded-xl border border-white/10 overflow-hidden">
                <MajorCategoryHeader
                  major={major}
                  count={majorCount}
                  collapsed={isCollapsed}
                  onToggle={() => toggleGroup(major)}
                />
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-4 space-y-3">
                        {[...subMap.entries()].map(([sub, items]) => (
                          <div key={sub}>
                            <SubcategoryHeader major={major} sub={sub} count={items.length} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1 pl-4">
                              {items.map(ing => (
                                <IngredientCard
                                  key={ing.id}
                                  ingredient={ing}
                                  allInventory={rawItems}
                                  onAdjust={handleAdjust}
                                  onDelete={handleDelete}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      ) : (
        /* Flat grid */
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          layout
        >
          {sorted.map(ing => (
            <IngredientCard
              key={ing.id}
              ingredient={ing}
              allInventory={rawItems}
              onAdjust={handleAdjust}
              onDelete={handleDelete}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
