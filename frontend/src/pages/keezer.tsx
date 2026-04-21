// frontend/src/pages/keezer.tsx — NeoStills Barrel Tracker (Aging Room)
// Inspirado en hub.bodegadata.com/barrels y /cellar — adaptado al dominio de destilación
import { useState, useCallback, useMemo, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Plus, Search, Droplets,
  TrendingUp, Clock, Star, Beaker,
  X, Check, Pencil, Trash2,
  BarChart3, AlertCircle, RefreshCw,
} from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'
import { useUIStore } from '@/stores/ui-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type VesselType =
  | 'barrel_new' | 'barrel_refill' | 'quarter_cask' | 'octave' | 'hogshead' | 'butt'
  | 'port_pipe' | 'cask_ex_bourbon' | 'cask_ex_sherry' | 'cask_ex_port'
  | 'cask_ex_wine' | 'cask_ex_rum' | 'tank_stainless' | 'tank_with_chips'
  | 'tank_with_spirals' | 'tank_with_staves'

type WoodType =
  | 'american_white_oak' | 'european_oak' | 'japanese_mizunara'
  | 'cherry' | 'chestnut' | 'acacia' | 'mulberry' | 'mesquite' | 'none'

type ToastLevel =
  | 'none' | 'light' | 'medium' | 'medium_plus' | 'heavy'
  | 'char_1' | 'char_2' | 'char_3' | 'char_4_alligator'

type VesselStatus = 'empty' | 'aging' | 'ready_for_sampling' | 'ready_to_bottle' | 'bottled' | 'maintenance'

interface AgingVessel {
  id: string
  code: string
  name?: string
  notes?: string
  vessel_type: VesselType
  wood_type: WoodType
  toast_level: ToastLevel
  capacity_liters: number
  current_volume_liters: number
  current_abv?: number
  fill_pct: number
  spirit_type?: string
  spirit_name?: string
  status: VesselStatus
  fill_date?: string
  target_date?: string
  age_months?: number
  location_row?: string
  location_position?: number
  location_notes?: string
  samplings?: Array<{ date: string; abv?: number; tasting_notes?: string }>
  created_at: string
  updated_at: string
}

interface VesselFormData {
  code: string
  name: string
  vessel_type: VesselType
  wood_type: WoodType
  toast_level: ToastLevel
  capacity_liters: number
  current_volume_liters: number
  current_abv: string
  spirit_type: string
  spirit_name: string
  status: VesselStatus
  fill_date: string
  target_date: string
  location_row: string
  location_position: string
  notes: string
}

// ─── Catálogos de etiquetas ───────────────────────────────────────────────────

const VESSEL_TYPE_LABELS: Record<VesselType, string> = {
  barrel_new:       'Barrica nueva',
  barrel_refill:    'Barrica rellenada',
  quarter_cask:     'Quarter Cask (~50L)',
  octave:           'Octave (~25L)',
  hogshead:         'Hogshead (~250L)',
  butt:             'Butt (~500L)',
  port_pipe:        'Port Pipe (~550L)',
  cask_ex_bourbon:  'Ex-Bourbon',
  cask_ex_sherry:   'Ex-Sherry',
  cask_ex_port:     'Ex-Port',
  cask_ex_wine:     'Ex-Vino',
  cask_ex_rum:      'Ex-Ron',
  tank_stainless:   'Depósito inox',
  tank_with_chips:  'Depósito + chips',
  tank_with_spirals:'Depósito + espirales',
  tank_with_staves: 'Depósito + duelas',
}

const WOOD_LABELS: Record<WoodType, string> = {
  american_white_oak: 'Roble americano',
  european_oak:       'Roble europeo',
  japanese_mizunara:  'Mizunara japonés',
  cherry:             'Cerezo',
  chestnut:           'Castaño',
  acacia:             'Acacia',
  mulberry:           'Morera',
  mesquite:           'Mezquite',
  none:               'Sin madera',
}

const TOAST_LABELS: Record<ToastLevel, string> = {
  none:               'Sin tostar',
  light:              'Ligero',
  medium:             'Medio',
  medium_plus:        'Medio+',
  heavy:              'Pesado',
  char_1:             'Char #1',
  char_2:             'Char #2',
  char_3:             'Char #3',
  char_4_alligator:   'Char #4 (Alligator)',
}

const STATUS_CONFIG: Record<VesselStatus, { label: string; color: string; bg: string }> = {
  empty:               { label: 'Vacío',          color: '#6B7A8D', bg: 'rgba(107,122,141,0.12)' },
  aging:               { label: 'Madurando',       color: '#B87333', bg: 'rgba(184,115,51,0.12)' },
  ready_for_sampling:  { label: 'Para muestreo',   color: '#C7A951', bg: 'rgba(199,169,81,0.15)' },
  ready_to_bottle:     { label: 'Para embotellar', color: '#6B8E4E', bg: 'rgba(107,142,78,0.15)' },
  bottled:             { label: 'Embotellado',     color: '#5B8DB8', bg: 'rgba(91,141,184,0.12)' },
  maintenance:         { label: 'Mantenimiento',   color: '#C75050', bg: 'rgba(199,80,80,0.12)' },
}

const SPIRIT_TYPE_OPTIONS = [
  'Whiskey', 'Bourbon', 'Scotch', 'Rum', 'Brandy', 'Cognac',
  'Calvados', 'Grappa', 'Orujo', 'Ginebra', 'Vodka', 'Aguardiente',
  'Mezcal', 'Eau-de-vie', 'Otro',
]

const BARREL_TYPES = new Set<VesselType>([
  'barrel_new','barrel_refill','quarter_cask','octave','hogshead','butt',
  'port_pipe','cask_ex_bourbon','cask_ex_sherry','cask_ex_port','cask_ex_wine','cask_ex_rum',
])

// ─── API hooks ───────────────────────────────────────────────────────────────

function useAgingVessels() {
  return useQuery<AgingVessel[]>({
    queryKey: ['aging-vessels'],
    queryFn: () => api.get<AgingVessel[]>('/v1/aging-vessels'),
    staleTime: 30_000,
  })
}

function useCreateVessel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AgingVessel>) =>
      api.post<AgingVessel>('/v1/aging-vessels', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['aging-vessels'] }) },
  })
}

function useUpdateVessel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgingVessel> }) =>
      api.put<AgingVessel>(`/v1/aging-vessels/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['aging-vessels'] }) },
  })
}

function useDeleteVessel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/aging-vessels/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['aging-vessels'] }) },
  })
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function FillBar({ pct, status }: { pct: number; status: VesselStatus }) {
  const color =
    status === 'empty'           ? '#3A4A5C' :
    status === 'ready_to_bottle' ? '#6B8E4E' :
    pct > 90                     ? '#C75050' :
    pct > 0                      ? '#B87333' : '#3A4A5C'

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: VesselStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Tarjeta de barrica/depósito ──────────────────────────────────────────────

function VesselCard({
  vessel, onClick, onEdit, onDelete,
}: {
  vessel: AgingVessel
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isBarrel = BARREL_TYPES.has(vessel.vessel_type)
  const IconComp = isBarrel ? Archive : Beaker
  const iconColor = vessel.status === 'empty' ? '#6B7A8D' : '#B87333'
  const iconBg    = vessel.status === 'empty' ? 'rgba(107,122,141,0.1)' : 'rgba(184,115,51,0.12)'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      className="group relative rounded-2xl border cursor-pointer transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
      onClick={onClick}
    >
      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(184,115,51,0.15)', color: '#B87333' }}>
          <Pencil size={11} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(199,80,80,0.15)', color: '#C75050' }}>
          <Trash2 size={11} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconBg }}>
            <IconComp size={18} style={{ color: iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono font-bold text-sm text-[#F0EBE1]">{vessel.code}</span>
              {vessel.location_row && (
                <span className="text-[10px] text-[#6B7A8D]">Fila {vessel.location_row}</span>
              )}
            </div>
            <p className="text-[11px] text-[#8B9BB4] truncate">
              {VESSEL_TYPE_LABELS[vessel.vessel_type]}
            </p>
          </div>
          <StatusBadge status={vessel.status} />
        </div>

        {vessel.spirit_type && (
          <p className="text-xs font-medium mb-2" style={{ color: '#C7A951' }}>
            {vessel.spirit_name || vessel.spirit_type}
          </p>
        )}

        <div className="mb-2">
          <FillBar pct={vessel.fill_pct} status={vessel.status} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] text-[#8B9BB4]">
          <div>
            <span className="text-[#6B7A8D] block">Volumen</span>
            <span className="font-mono">{vessel.current_volume_liters.toFixed(0)}L</span>
            <span className="text-[#6B7A8D] text-[10px]">/{vessel.capacity_liters}L</span>
          </div>
          <div>
            <span className="text-[#6B7A8D] block">ABV</span>
            <span className="font-mono">
              {vessel.current_abv != null ? `${vessel.current_abv}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-[#6B7A8D] block">Edad</span>
            <span className="font-mono">
              {vessel.age_months != null ? `${vessel.age_months}m` : '—'}
            </span>
          </div>
        </div>

        {vessel.wood_type !== 'none' && (
          <div className="mt-2.5 pt-2.5 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="text-[10px] text-[#6B7A8D]">
              {WOOD_LABELS[vessel.wood_type]} · {TOAST_LABELS[vessel.toast_level]}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Formulario (modal) ───────────────────────────────────────────────────────

const EMPTY_FORM: VesselFormData = {
  code: '', name: '', vessel_type: 'barrel_new', wood_type: 'american_white_oak',
  toast_level: 'medium', capacity_liters: 200, current_volume_liters: 0,
  current_abv: '', spirit_type: '', spirit_name: '', status: 'empty',
  fill_date: '', target_date: '', location_row: '', location_position: '', notes: '',
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8B9BB4' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function VesselModal({
  vessel, onClose, onSave, saving,
}: {
  vessel: AgingVessel | null
  onClose: () => void
  onSave: (data: VesselFormData) => void
  saving: boolean
}) {
  const [form, setForm] = useState<VesselFormData>(
    vessel ? {
      code: vessel.code, name: vessel.name ?? '',
      vessel_type: vessel.vessel_type, wood_type: vessel.wood_type,
      toast_level: vessel.toast_level,
      capacity_liters: vessel.capacity_liters,
      current_volume_liters: vessel.current_volume_liters,
      current_abv: vessel.current_abv?.toString() ?? '',
      spirit_type: vessel.spirit_type ?? '', spirit_name: vessel.spirit_name ?? '',
      status: vessel.status,
      fill_date: vessel.fill_date ?? '', target_date: vessel.target_date ?? '',
      location_row: vessel.location_row ?? '',
      location_position: vessel.location_position?.toString() ?? '',
      notes: vessel.notes ?? '',
    } : EMPTY_FORM
  )

  const setF = (field: keyof VesselFormData, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const isTank = form.vessel_type.startsWith('tank_')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{ background: '#1A1816', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="font-semibold text-[#F0EBE1]">
            {vessel ? 'Editar recipiente' : 'Nuevo recipiente'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#A39B8B' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Código *">
              <input value={form.code} onChange={e => setF('code', e.target.value)}
                placeholder="ej. A-01" className="form-input" />
            </FormField>
            <FormField label="Nombre (opcional)">
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="ej. Single Malt 2024" className="form-input" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo de recipiente">
              <select value={form.vessel_type}
                onChange={e => setF('vessel_type', e.target.value)}
                className="form-input">
                <optgroup label="Barricas">
                  {(['barrel_new','barrel_refill','quarter_cask','octave','hogshead','butt',
                    'port_pipe','cask_ex_bourbon','cask_ex_sherry','cask_ex_port',
                    'cask_ex_wine','cask_ex_rum'] as VesselType[])
                    .map(t => <option key={t} value={t}>{VESSEL_TYPE_LABELS[t]}</option>)}
                </optgroup>
                <optgroup label="Depósitos">
                  {(['tank_stainless','tank_with_chips','tank_with_spirals','tank_with_staves'] as VesselType[])
                    .map(t => <option key={t} value={t}>{VESSEL_TYPE_LABELS[t]}</option>)}
                </optgroup>
              </select>
            </FormField>
            <FormField label="Estado">
              <select value={form.status} onChange={e => setF('status', e.target.value)}
                className="form-input">
                {Object.entries(STATUS_CONFIG).map(([v, c]) =>
                  <option key={v} value={v}>{c.label}</option>
                )}
              </select>
            </FormField>
          </div>

          {!isTank && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Madera">
                <select value={form.wood_type} onChange={e => setF('wood_type', e.target.value)}
                  className="form-input">
                  {Object.entries(WOOD_LABELS).map(([v, l]) =>
                    <option key={v} value={v}>{l}</option>
                  )}
                </select>
              </FormField>
              <FormField label="Tostado / Char">
                <select value={form.toast_level} onChange={e => setF('toast_level', e.target.value)}
                  className="form-input">
                  {Object.entries(TOAST_LABELS).map(([v, l]) =>
                    <option key={v} value={v}>{l}</option>
                  )}
                </select>
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Capacidad (L)">
              <input type="number" min="0.5" value={form.capacity_liters}
                onChange={e => setF('capacity_liters', parseFloat(e.target.value) || 0)}
                className="form-input" />
            </FormField>
            <FormField label="Volumen actual (L)">
              <input type="number" min="0" value={form.current_volume_liters}
                onChange={e => setF('current_volume_liters', parseFloat(e.target.value) || 0)}
                className="form-input" />
            </FormField>
            <FormField label="ABV (%)">
              <input type="number" min="0" max="100" step="0.1" value={form.current_abv}
                onChange={e => setF('current_abv', e.target.value)}
                placeholder="ej. 63.5" className="form-input" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo de spirit">
              <select value={form.spirit_type} onChange={e => setF('spirit_type', e.target.value)}
                className="form-input">
                <option value="">— Seleccionar —</option>
                {SPIRIT_TYPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Nombre del spirit">
              <input value={form.spirit_name} onChange={e => setF('spirit_name', e.target.value)}
                placeholder="ej. Highland Malt 2024" className="form-input" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fecha de llenado">
              <input type="date" value={form.fill_date}
                onChange={e => setF('fill_date', e.target.value)} className="form-input" />
            </FormField>
            <FormField label="Fecha objetivo">
              <input type="date" value={form.target_date}
                onChange={e => setF('target_date', e.target.value)} className="form-input" />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Fila">
              <input value={form.location_row}
                onChange={e => setF('location_row', e.target.value.toUpperCase())}
                placeholder="ej. A" className="form-input" />
            </FormField>
            <FormField label="Posición">
              <input type="number" min="1" value={form.location_position}
                onChange={e => setF('location_position', e.target.value)}
                placeholder="3" className="form-input" />
            </FormField>
            <div />
          </div>

          <FormField label="Notas">
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)}
              rows={2} placeholder="Observaciones adicionales..."
              className="form-input resize-none" />
          </FormField>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#A39B8B' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.code.trim() || saving}
            className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: '#B87333', color: '#FFF',
              opacity: !form.code.trim() || saving ? 0.5 : 1,
            }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {vessel ? 'Guardar cambios' : 'Crear recipiente'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Panel lateral de detalle ─────────────────────────────────────────────────

function VesselDetailPanel({
  vessel, onClose, onEdit,
}: {
  vessel: AgingVessel
  onClose: () => void
  onEdit: () => void
}) {
  const isBarrel = BARREL_TYPES.has(vessel.vessel_type)
  const samplings = vessel.samplings ?? []

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex flex-col h-full overflow-y-auto rounded-2xl border"
      style={{ background: '#1A1816', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono font-bold text-lg text-[#F0EBE1]">{vessel.code}</span>
            <StatusBadge status={vessel.status} />
          </div>
          <p className="text-xs text-[#8B9BB4]">
            {VESSEL_TYPE_LABELS[vessel.vessel_type]}
            {vessel.location_row && ` · Fila ${vessel.location_row}-${vessel.location_position ?? ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(184,115,51,0.12)', color: '#B87333' }}>
            <Pencil size={13} />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#A39B8B' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        {vessel.spirit_type && (
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(184,115,51,0.08)', border: '1px solid rgba(184,115,51,0.15)' }}>
            <p className="text-xs text-[#8B9BB4] mb-1">Spirit</p>
            <p className="font-semibold" style={{ color: '#C7A951' }}>
              {vessel.spirit_name || vessel.spirit_type}
            </p>
            {vessel.spirit_name && <p className="text-xs text-[#8B9BB4] mt-0.5">{vessel.spirit_type}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Capacidad', value: `${vessel.capacity_liters} L`,                      icon: Archive },
            { label: 'Volumen',   value: `${vessel.current_volume_liters} L (${vessel.fill_pct.toFixed(0)}%)`, icon: Droplets },
            { label: 'ABV',       value: vessel.current_abv != null ? `${vessel.current_abv}%` : '—', icon: BarChart3 },
            { label: 'Edad',      value: vessel.age_months != null ? `${vessel.age_months}m` : '—', icon: Clock },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon size={11} style={{ color: '#B87333' }} />
                <span className="text-[10px] text-[#6B7A8D]">{s.label}</span>
              </div>
              <p className="font-mono text-sm text-[#F0EBE1]">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span style={{ color: '#8B9BB4' }}>Llenado</span>
            <span className="font-mono" style={{ color: '#F0EBE1' }}>{vessel.fill_pct.toFixed(1)}%</span>
          </div>
          <FillBar pct={vessel.fill_pct} status={vessel.status} />
        </div>

        {isBarrel && vessel.wood_type !== 'none' && (
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(74,44,23,0.15)', border: '1px solid rgba(74,44,23,0.3)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#8B5A2B' }}>
              Madera
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-[#6B7A8D]">Especie</p>
                <p className="text-[#F0EBE1]">{WOOD_LABELS[vessel.wood_type]}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B7A8D]">Tostado</p>
                <p className="text-[#F0EBE1]">{TOAST_LABELS[vessel.toast_level]}</p>
              </div>
            </div>
          </div>
        )}

        {(vessel.fill_date || vessel.target_date) && (
          <div className="grid grid-cols-2 gap-2">
            {vessel.fill_date && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] text-[#6B7A8D] mb-1">Llenado</p>
                <p className="text-xs font-mono text-[#F0EBE1]">{vessel.fill_date}</p>
              </div>
            )}
            {vessel.target_date && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(107,142,78,0.06)' }}>
                <p className="text-[10px] text-[#6B7A8D] mb-1">Objetivo</p>
                <p className="text-xs font-mono" style={{ color: '#6B8E4E' }}>{vessel.target_date}</p>
              </div>
            )}
          </div>
        )}

        {samplings.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A8D] mb-2">
              Muestras ({samplings.length})
            </p>
            <div className="space-y-1.5">
              {samplings.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Star size={12} style={{ color: '#C7A951' }} />
                  <span className="text-[11px] font-mono text-[#A39B8B]">{s.date}</span>
                  {s.abv != null && (
                    <span className="text-[11px] font-mono text-[#F0EBE1] ml-auto">{s.abv}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {vessel.notes && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[10px] text-[#6B7A8D] mb-1">Notas</p>
            <p className="text-sm text-[#A39B8B] leading-relaxed">{vessel.notes}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Fila de tabla ────────────────────────────────────────────────────────────

function VesselTableRow({
  vessel, onClick, onEdit, onDelete,
}: {
  vessel: AgingVessel
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className="border-b transition-colors cursor-pointer group"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      onClick={onClick}>
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-sm text-[#F0EBE1]">{vessel.code}</span>
      </td>
      <td className="px-4 py-3 text-xs text-[#A39B8B]">
        {VESSEL_TYPE_LABELS[vessel.vessel_type]}
      </td>
      <td className="px-4 py-3">
        {vessel.spirit_type
          ? <span className="text-xs" style={{ color: '#C7A951' }}>{vessel.spirit_name || vessel.spirit_type}</span>
          : <span className="text-[#6B7A8D] text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        {vessel.wood_type !== 'none'
          ? <span className="text-xs text-[#A39B8B]">{WOOD_LABELS[vessel.wood_type]}</span>
          : <span className="text-[#6B7A8D] text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full bg-[#B87333]" style={{ width: `${vessel.fill_pct}%` }} />
          </div>
          <span className="text-[11px] font-mono text-[#8B9BB4]">{vessel.fill_pct.toFixed(0)}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] font-mono text-[#8B9BB4]">
        {vessel.current_abv != null ? `${vessel.current_abv}%` : '—'}
      </td>
      <td className="px-4 py-3 text-[11px] font-mono text-[#8B9BB4]">
        {vessel.age_months != null ? `${vessel.age_months}m` : '—'}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={vessel.status} />
      </td>
      <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(184,115,51,0.12)', color: '#B87333' }}>
            <Pencil size={10} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(199,80,80,0.12)', color: '#C75050' }}>
            <Trash2 size={10} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(184,115,51,0.08)', border: '1px solid rgba(184,115,51,0.15)' }}>
        <Archive size={28} style={{ color: '#B87333' }} />
      </div>
      {hasFilter ? (
        <>
          <p className="font-semibold text-[#F0EBE1]">Sin resultados</p>
          <p className="text-sm text-[#8B9BB4] text-center max-w-60">
            Ningún recipiente coincide con los filtros actuales
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-[#F0EBE1]">Aging Room vacía</p>
          <p className="text-sm text-[#8B9BB4] text-center max-w-60">
            Añade tu primera barrica o depósito para empezar a trackear el envejecimiento
          </p>
          <button onClick={onAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-2"
            style={{ background: '#B87333', color: '#FFF' }}>
            <Plus size={15} />
            Añadir primera barrica
          </button>
        </>
      )}
    </motion.div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

// ─── 3D: Barrel individual ────────────────────────────────────────────────────
function Barrel3D({
  vessel,
  position,
  onClick,
  isSelected,
}: {
  vessel: AgingVessel
  position: [number, number, number]
  onClick: () => void
  isSelected: boolean
}) {
  const meshRef = useRef<Mesh>(null)

  // Colores por estado
  const COLOR_BY_STATUS: Record<VesselStatus, string> = {
    empty:               '#3A3A4A',
    aging:               '#8B4513',
    ready_for_sampling:  '#C7A951',
    ready_to_bottle:     '#6B8E4E',
    bottled:             '#2A4A2A',
    maintenance:         '#C75050',
  }
  const barrelColor = COLOR_BY_STATUS[vessel.status] ?? '#8B4513'
  const isTank = !['barrel_new','barrel_refill','quarter_cask','octave','hogshead','butt',
    'port_pipe','cask_ex_bourbon','cask_ex_sherry','cask_ex_port','cask_ex_wine','cask_ex_rum'].includes(vessel.vessel_type)

  // Altura proporcional al volumen relativo (entre 0.8 y 2.2)
  const fillRatio = Math.min(vessel.fill_pct / 100, 1)
  const barrelH = 0.8 + fillRatio * 1.4

  // Pequeña oscilación en selected
  useFrame(({ clock }) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 3) * 0.04
    } else if (meshRef.current) {
      meshRef.current.position.y = position[1]
    }
  })

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      {/* Cuerpo de la barrica / depósito */}
      {isTank ? (
        <RoundedBox ref={meshRef as any} args={[0.7, barrelH, 0.7]} radius={0.08} smoothness={4}
          position={[0, barrelH / 2, 0]}
          castShadow>
          <meshStandardMaterial
            color={barrelColor}
            metalness={isTank ? 0.7 : 0.1}
            roughness={isTank ? 0.2 : 0.8}
            emissive={isSelected ? barrelColor : '#000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </RoundedBox>
      ) : (
        /* Barrica: cilindro con curva (dos conos + cilindro central) */
        <group ref={meshRef} position={[0, barrelH / 2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.32, 0.32, barrelH * 0.5, 16]} />
            <meshStandardMaterial
              color={barrelColor}
              roughness={0.75}
              metalness={0.05}
              emissive={isSelected ? barrelColor : '#000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
          {/* Aros de metal */}
          {[-barrelH * 0.18, 0, barrelH * 0.18].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} castShadow>
              <torusGeometry args={[0.34, 0.018, 8, 24]} />
              <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      )}

      {/* Suelo base */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.04, 16]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </mesh>

      {/* Etiqueta de código */}
      <Text
        position={[0, barrelH + 0.35, 0]}
        fontSize={0.18}
        color={isSelected ? '#F0EBE1' : '#A39B8B'}
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
      >
        {vessel.code}
      </Text>

      {/* ABV si disponible */}
      {vessel.current_abv != null && (
        <Text
          position={[0, barrelH + 0.12, 0]}
          fontSize={0.13}
          color={isSelected ? '#C7A951' : '#6B7A8D'}
          anchorX="center"
          anchorY="middle"
        >
          {vessel.current_abv.toFixed(1)}%
        </Text>
      )}
    </group>
  )
}

// ─── 3D: Vista sala de barricas ───────────────────────────────────────────────
function BarrelRoom3D({
  vessels,
  selectedId,
  onSelect,
}: {
  vessels: AgingVessel[]
  selectedId: string | null
  onSelect: (v: AgingVessel) => void
}) {
  // Distribuir en filas de hasta 6
  const COLS = 6
  const GAP_X = 1.4
  const GAP_Z = 2.2

  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 12], fov: 55 }}
      style={{ background: '#0F0E0D', borderRadius: '1rem', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[5, 10, 5]}
        intensity={1.2}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-5, 6, -5]} intensity={0.5} color="#B87333" />

      {/* Suelo */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1A1410" roughness={0.95} />
      </mesh>

      <Suspense fallback={null}>
        {vessels.map((v, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const xOffset = ((vessels.length > COLS ? COLS : vessels.length) - 1) * GAP_X / 2
          const zOffset = (Math.ceil(vessels.length / COLS) - 1) * GAP_Z / 2
          const pos: [number, number, number] = [
            col * GAP_X - xOffset,
            0,
            row * GAP_Z - zOffset,
          ]
          return (
            <Barrel3D
              key={v.id}
              vessel={v}
              position={pos}
              isSelected={v.id === selectedId}
              onClick={() => onSelect(v)}
            />
          )
        })}
      </Suspense>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}

type TabId = 'all' | 'barrels' | 'tanks'
const VESSEL_TABS: { id: TabId; label: string }[] = [
  { id: 'all',     label: 'Todo' },
  { id: 'barrels', label: 'Barricas' },
  { id: 'tanks',   label: 'Depósitos' },
]

export default function KeezerPage() {
  // Consume el store de UI pero no necesitamos extraer nada específico aquí
  useUIStore()

  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | '3d'>('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VesselStatus | 'all'>('all')
  const [selectedVessel, setSelectedVessel] = useState<AgingVessel | null>(null)
  const [editVessel, setEditVessel] = useState<AgingVessel | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: vessels = [], isLoading, isError, refetch } = useAgingVessels()
  const createMutation = useCreateVessel()
  const updateMutation = useUpdateVessel()
  const deleteMutation = useDeleteVessel()
  const saving = createMutation.isPending || updateMutation.isPending

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => vessels.filter(v => {
    const matchTab =
      activeTab === 'all'     ? true :
      activeTab === 'barrels' ? BARREL_TYPES.has(v.vessel_type) :
                                !BARREL_TYPES.has(v.vessel_type)
    const matchSearch =
      !search ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      (v.spirit_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.spirit_type ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    return matchTab && matchSearch && matchStatus
  }), [vessels, activeTab, search, statusFilter])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = vessels.filter(v => v.status !== 'empty' && v.status !== 'bottled')
    const totalLiters = active.reduce((s, v) => s + v.current_volume_liters, 0)
    const ageVessels = active.filter(v => v.age_months != null)
    const avgAge = ageVessels.length > 0
      ? Math.round(ageVessels.reduce((s, v) => s + (v.age_months ?? 0), 0) / ageVessels.length)
      : null
    return {
      total: vessels.length,
      active: active.length,
      totalLiters,
      avgAge,
      alerts: vessels.filter(v => v.status === 'ready_for_sampling' || v.status === 'ready_to_bottle').length,
    }
  }, [vessels])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (form: VesselFormData) => {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim() || undefined,
      vessel_type: form.vessel_type,
      wood_type: form.wood_type,
      toast_level: form.toast_level,
      capacity_liters: Number(form.capacity_liters),
      current_volume_liters: Number(form.current_volume_liters),
      current_abv: form.current_abv ? Number(form.current_abv) : undefined,
      spirit_type: form.spirit_type || undefined,
      spirit_name: form.spirit_name.trim() || undefined,
      status: form.status,
      fill_date: form.fill_date || undefined,
      target_date: form.target_date || undefined,
      location_row: form.location_row.trim() || undefined,
      location_position: form.location_position ? Number(form.location_position) : undefined,
      notes: form.notes.trim() || undefined,
    }
    try {
      if (editVessel) {
        await updateMutation.mutateAsync({ id: editVessel.id, data: payload })
        toast.success('Recipiente actualizado')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Recipiente creado')
      }
      setShowModal(false)
      setEditVessel(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    }
  }, [editVessel, createMutation, updateMutation])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Recipiente eliminado')
      if (selectedVessel?.id === id) setSelectedVessel(null)
      setConfirmDelete(null)
    } catch { toast.error('Error al eliminar') }
  }, [deleteMutation, selectedVessel])

  const openCreate = () => { setEditVessel(null); setShowModal(true) }
  const openEdit   = (v: AgingVessel) => { setEditVessel(v); setShowModal(true) }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F0EBE1]">Aging Room</h1>
          <p className="text-sm text-[#8B9BB4]">Barricas y depósitos en maduración</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#B87333', color: '#FFF' }}>
          <Plus size={15} /> Nuevo recipiente
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',         value: stats.total,                    unit: '',        color: '#B87333', icon: Archive     },
          { label: 'En maduración', value: stats.active,                   unit: '',        color: '#C7A951', icon: TrendingUp  },
          { label: 'Litros aging',  value: stats.totalLiters.toFixed(0),   unit: 'L',       color: '#5B8DB8', icon: Droplets    },
          { label: 'Edad media',    value: stats.avgAge ?? '—',             unit: stats.avgAge ? 'meses' : '', color: '#6B8E4E', icon: Clock },
          { label: 'Con alertas',   value: stats.alerts,                   unit: '',        color: '#C7A951', icon: AlertCircle },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-3.5 flex items-center gap-3 border"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${s.color}18` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-[#F0EBE1]">
                {s.value}
                {s.unit && <span className="text-xs text-[#8B9BB4] ml-1">{s.unit}</span>}
              </p>
              <p className="text-[10px] text-[#6B7A8D] mt-0.5">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl border"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
          {VESSEL_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeTab === t.id ? 'text-[#F0EBE1]' : 'text-[#6B7A8D] hover:text-[#A39B8B]')}
              style={activeTab === t.id ? { background: '#B87333' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-64 px-3 py-2 rounded-xl border"
          style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <Search size={13} style={{ color: '#6B7A8D' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar código o spirit…"
            className="flex-1 bg-transparent text-sm text-[#F0EBE1] placeholder-[#6B7A8D] outline-none" />
          {search && (
            <button onClick={() => setSearch('')}><X size={12} style={{ color: '#6B7A8D' }} /></button>
          )}
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as VesselStatus | 'all')}
          className="px-3 py-2 rounded-xl text-xs border outline-none"
          style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.08)', color: '#A39B8B' }}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>

        <div className="flex gap-1 ml-auto">
          {(['grid', 'list', '3d'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className="w-8 h-8 rounded-lg text-sm flex items-center justify-center border"
              style={{
                background: viewMode === v ? '#B87333' : 'rgba(0,0,0,0.2)',
                borderColor: viewMode === v ? '#B87333' : 'rgba(255,255,255,0.08)',
                color: viewMode === v ? '#FFF' : '#6B7A8D',
              }}>
              {v === 'grid' ? '▦' : v === 'list' ? '☰' : '⬡'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className={cn('flex gap-4 flex-1 min-h-0', selectedVessel ? '' : '')}>
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw size={20} className="animate-spin" style={{ color: '#B87333' }} />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <AlertCircle size={24} style={{ color: '#C75050' }} />
              <p className="text-sm text-[#8B9BB4]">Error al cargar los recipientes</p>
              <button onClick={() => void refetch()}
                className="text-xs px-4 py-2 rounded-xl"
                style={{ background: 'rgba(184,115,51,0.12)', color: '#B87333' }}>
                Reintentar
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onAdd={openCreate} hasFilter={search !== '' || statusFilter !== 'all'} />
          ) : viewMode === '3d' ? (
            <div className="h-[600px] rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Instrucciones de control */}
              <div className="absolute z-10 mt-2 ml-2 pointer-events-none">
                <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.6)', color: '#6B7A8D' }}>
                  Arrastra para rotar · Scroll para zoom · Click en barrica para seleccionar
                </span>
              </div>
              <BarrelRoom3D
                vessels={filtered}
                selectedId={selectedVessel?.id ?? null}
                onSelect={(v) => setSelectedVessel(v.id === selectedVessel?.id ? null : v)}
              />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map(v => (
                  <VesselCard key={v.id} vessel={v}
                    onClick={() => setSelectedVessel(v.id === selectedVessel?.id ? null : v)}
                    onEdit={() => openEdit(v)}
                    onDelete={() => setConfirmDelete(v.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    {['Código','Tipo','Spirit','Madera','Llenado','ABV','Edad','Estado',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: '#6B7A8D' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <VesselTableRow key={v.id} vessel={v}
                      onClick={() => setSelectedVessel(v.id === selectedVessel?.id ? null : v)}
                      onEdit={() => openEdit(v)}
                      onDelete={() => setConfirmDelete(v.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel lateral de detalle */}
        <AnimatePresence>
          {selectedVessel && (
            <div className="w-80 shrink-0 overflow-hidden">
              <VesselDetailPanel vessel={selectedVessel} onClose={() => setSelectedVessel(null)}
                onEdit={() => openEdit(selectedVessel)} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal crear/editar */}
      <AnimatePresence>
        {showModal && (
          <VesselModal vessel={editVessel}
            onClose={() => { setShowModal(false); setEditVessel(null) }}
            onSave={handleSave} saving={saving} />
        )}
      </AnimatePresence>

      {/* Confirmar borrado */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setConfirmDelete(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl border p-6 max-w-sm w-full"
              style={{ background: '#1A1816', borderColor: 'rgba(199,80,80,0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(199,80,80,0.12)' }}>
                  <Trash2 size={18} style={{ color: '#C75050' }} />
                </div>
                <div>
                  <p className="font-semibold text-[#F0EBE1]">Eliminar recipiente</p>
                  <p className="text-xs text-[#8B9BB4]">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 rounded-xl text-sm border"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#A39B8B' }}>
                  Cancelar
                </button>
                <button onClick={() => void handleDelete(confirmDelete)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#C75050', color: '#FFF', opacity: deleteMutation.isPending ? 0.5 : 1 }}>
                  {deleteMutation.isPending
                    ? <RefreshCw size={12} className="animate-spin" />
                    : <Trash2 size={12} />}
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
