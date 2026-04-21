// frontend/src/pages/devices.tsx — NeoStills v3 IoT Device Hub
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu, Wifi, WifiOff, Battery, Signal, Thermometer, Clock,
  Plus, Settings, Droplets, Radio, Activity, ChevronRight,
  Zap, AlertTriangle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useUIStore } from '@/stores/ui-store'
import { SUPPORTED_DEVICES, type DeviceSpec, type DeviceType } from '@/data/fermenters'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────── */
interface ConnectedDevice {
  id: string
  spec: DeviceSpec
  customName: string
  online: boolean
  battery: number | null
  rssi: number | null
  temperature: number | null
  gravity: number | null
  angle: number | null
  lastSync: string
  assignedSession?: string
  firmware?: string
}

/* ── Demo data ─────────────────────────────────────────────────── */
const connectedDevices: ConnectedDevice[] = [
  {
    id: 'dev-1',
    spec: SUPPORTED_DEVICES[0]!, // iSpindel
    customName: 'iSpindel "Wash Tank 1"',
    online: true,
    battery: 78,
    rssi: -42,
    temperature: 19.5,
    gravity: 1.018,
    angle: 42.3,
    lastSync: new Date(Date.now() - 2 * 60000).toISOString(),
    assignedSession: 'Whiskey wash #12',
    firmware: 'v7.3.1',
  },
  {
    id: 'dev-2',
    spec: SUPPORTED_DEVICES[0]!, // iSpindel
    customName: 'iSpindel "Fermentador 2"',
    online: true,
    battery: 45,
    rssi: -65,
    temperature: 18.2,
    gravity: 1.042,
    angle: 38.7,
    lastSync: new Date(Date.now() - 5 * 60000).toISOString(),
    assignedSession: 'Rum wash reserva',
    firmware: 'v7.3.1',
  },
  {
    id: 'dev-3',
    spec: SUPPORTED_DEVICES[4]!, // Inkbird
    customName: 'Inkbird Sala de fermentación',
    online: true,
    battery: null,
    rssi: -38,
    temperature: 20.1,
    gravity: null,
    angle: null,
    lastSync: new Date(Date.now() - 1 * 60000).toISOString(),
    firmware: 'v2.1',
  },
  {
    id: 'dev-4',
    spec: SUPPORTED_DEVICES[5]!, // ESP32
    customName: 'ESP32-S3-Box (Voz)',
    online: false,
    battery: null,
    rssi: -70,
    temperature: null,
    gravity: null,
    angle: null,
    lastSync: new Date(Date.now() - 3600000).toISOString(),
  },
]

/* ── Helpers ───────────────────────────────────────────────────── */
function timeSince(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

function signalBars(rssi: number | null): number {
  if (!rssi) return 0
  if (rssi > -50) return 4
  if (rssi > -60) return 3
  if (rssi > -70) return 2
  return 1
}

function batteryColor(pct: number): string {
  if (pct > 60) return 'text-accent-hop'
  if (pct > 30) return 'text-accent-amber'
  return 'text-accent-danger'
}

function deviceTypeIcon(type: DeviceType) {
  switch (type) {
    case 'hydrometer': return Droplets
    case 'temp_controller': return Thermometer
    case 'airlock': return Activity
    case 'sensor': return Radio
    case 'voice_assistant': return Zap
  }
}

/* ── Device Card ───────────────────────────────────────────────── */
function DeviceCard({ device }: { device: ConnectedDevice }) {
  const TypeIcon = deviceTypeIcon(device.spec.type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card rounded-xl border p-5 space-y-4 transition-all',
        device.online
          ? 'border-white/10 hover:border-accent-hop/20'
          : 'border-white/10 opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            device.online ? 'bg-accent-hop/10' : 'bg-bg-elevated'
          )}>
            <TypeIcon size={20} className={device.online ? 'text-accent-hop' : 'text-text-tertiary'} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{device.customName}</h3>
            <p className="text-[10px] text-text-tertiary">{device.spec.brand} · {device.spec.connectivity}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {device.online ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-hop/10 text-accent-hop border border-accent-hop/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-hop animate-pulse" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-elevated text-text-tertiary border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Telemetry grid */}
      {device.online && (
        <div className="grid grid-cols-2 gap-3">
          {device.gravity != null && (
            <div className="bg-bg-elevated rounded-lg p-2.5">
              <p className="text-[10px] text-text-tertiary flex items-center gap-1">
                <Droplets size={10} className="text-accent-amber" />
                Densidad
              </p>
              <p className="text-base font-mono font-bold text-text-primary mt-0.5">
                {device.gravity.toFixed(3)}
              </p>
            </div>
          )}
          {device.temperature != null && (
            <div className="bg-bg-elevated rounded-lg p-2.5">
              <p className="text-[10px] text-text-tertiary flex items-center gap-1">
                <Thermometer size={10} className="text-blue-400" />
                Temperatura
              </p>
              <p className="text-base font-mono font-bold text-text-primary mt-0.5">
                {device.temperature.toFixed(1)}°C
              </p>
            </div>
          )}
          {device.angle != null && (
            <div className="bg-bg-elevated rounded-lg p-2.5">
              <p className="text-[10px] text-text-tertiary">Ángulo</p>
              <p className="text-base font-mono font-bold text-text-primary mt-0.5">
                {device.angle.toFixed(1)}°
              </p>
            </div>
          )}
          {device.battery != null && (
            <div className="bg-bg-elevated rounded-lg p-2.5">
              <p className="text-[10px] text-text-tertiary flex items-center gap-1">
                <Battery size={10} className={batteryColor(device.battery)} />
                Batería
              </p>
              <p className={cn('text-base font-mono font-bold mt-0.5', batteryColor(device.battery))}>
                {device.battery}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer: signal, sync, assignment */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06] text-[10px] text-text-tertiary">
        {/* Signal bars */}
        <div className="flex items-center gap-1">
          <Signal size={10} />
          <div className="flex gap-[2px]">
            {[1, 2, 3, 4].map(bar => (
              <div
                key={bar}
                className={cn(
                  'w-[3px] rounded-full',
                  bar <= signalBars(device.rssi) ? 'bg-accent-hop' : 'bg-bg-elevated',
                )}
                style={{ height: `${4 + bar * 2}px` }}
              />
            ))}
          </div>
          <span>{device.rssi} dBm</span>
        </div>

        <span className="flex items-center gap-1">
          <Clock size={10} />
          {timeSince(device.lastSync)}
        </span>

        {device.assignedSession && (
          <span className="ml-auto text-accent-amber truncate max-w-[120px]">
            → {device.assignedSession}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
          Configurar
        </button>
        <button className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
          Historial
        </button>
        {!device.assignedSession && (
          <button className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 transition-colors">
            Asignar
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Supported Device Catalog Card ─────────────────────────────── */
function SupportedDeviceCard({ spec }: { spec: DeviceSpec }) {
  const TypeIcon = deviceTypeIcon(spec.type)

  return (
    <div className="bg-bg-elevated/50 rounded-xl border border-white/[0.06] p-4 flex items-start gap-3 hover:border-accent-amber/20 transition-colors cursor-pointer group">
      <div className="w-8 h-8 rounded-lg bg-accent-amber/5 flex items-center justify-center shrink-0 group-hover:bg-accent-amber/10 transition-colors">
        <span className="text-base">{spec.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-text-primary">{spec.name}</h4>
        <p className="text-[10px] text-text-tertiary">{spec.brand} · {spec.connectivity}</p>
        <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{spec.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {spec.metrics.map(m => (
            <span key={m} className="px-1.5 py-0.5 rounded text-[9px] bg-bg-primary text-text-tertiary border border-white/[0.06]">
              {m}
            </span>
          ))}
        </div>
      </div>
      <ChevronRight size={14} className="text-text-tertiary shrink-0 mt-1 group-hover:text-accent-amber transition-colors" />
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function DevicesPage() {
  const { t } = useTranslation('common')
  const { setActivePage } = useUIStore()
  useEffect(() => setActivePage('devices'), [setActivePage])

  const onlineCount = connectedDevices.filter(d => d.online).length
  const offlineCount = connectedDevices.filter(d => !d.online).length

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold amber-text">Dispositivos IoT</h1>
          <p className="text-sm text-text-muted mt-0.5">Hub de dispositivos conectados</p>
        </div>
        <Button
          size="sm"
          className="bg-accent-amber hover:bg-accent-amber-bright text-bg-primary font-semibold"
        >
          <Plus size={14} className="mr-1.5" />
          Añadir dispositivo
        </Button>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-accent-hop" />
          <span className="text-text-primary font-medium">{onlineCount} online</span>
        </div>
        {offlineCount > 0 && (
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="text-text-tertiary" />
            <span className="text-text-tertiary">{offlineCount} offline</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-accent-amber" />
          <span className="text-text-secondary">{connectedDevices.length} dispositivos</span>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Radio size={12} />
          Dispositivos conectados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectedDevices.map((device, i) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <DeviceCard device={device} />
            </motion.div>
          ))}

          {/* Add device placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: connectedDevices.length * 0.05 }}
            className="glass-card rounded-xl border border-dashed border-white/10 p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] cursor-pointer hover:border-accent-amber/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center group-hover:bg-accent-amber/10 transition-colors">
              <Plus size={24} className="text-text-tertiary group-hover:text-accent-amber transition-colors" />
            </div>
            <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              Añadir dispositivo
            </p>
          </motion.div>
        </div>
      </div>

      {/* Supported Devices Catalog */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Cpu size={12} />
          Dispositivos compatibles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUPPORTED_DEVICES.map(spec => (
            <SupportedDeviceCard key={spec.id} spec={spec} />
          ))}
        </div>
      </div>
    </div>
  )
}
