// src/components/keezer/tap-detail.tsx — NeoStills v3 Tap Detail Panel
import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Thermometer, Gauge, Droplets, Calendar, Clock,
  GlassWater, TrendingDown, AlertTriangle, Wrench, type LucideIcon,
} from 'lucide-react'
import type { TapConfig } from '@/data/kegs'
import { KEG_MAP, CONNECTOR_LABELS, co2ToPsi } from '@/data/kegs'
import { useKeezerStore } from '@/stores/keezer-store'
import { useTranslation } from 'react-i18next'

interface TapDetailProps {
  tap: TapConfig | null
  onClose: () => void
  onPour?: () => void
}

function Stat({ icon: Icon, label, value, unit, color }: {
  icon: LucideIcon
  label: string
  value: string | number
  unit?: string
  color?: string
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color || '#B87333'}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color={color || '#B87333'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#ADB4CE' }}>{label}</div>
        <div style={{
          fontSize: 16, fontWeight: 600, color: '#F5F7FC',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {value}{unit && <span style={{ fontSize: 11, color: '#ADB4CE', marginLeft: 3 }}>{unit}</span>}
        </div>
      </div>
    </div>
  )
}

export default function TapDetail({ tap, onClose, onPour }: TapDetailProps) {
  const { t } = useTranslation('devices')
  const pourLog = useKeezerStore(s => s.pourLog)

  const tapPours = useMemo(() => {
    if (!tap) return []
    return pourLog
      .filter(p => p.tapId === tap.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .map(p => ({
        time: new Date(p.timestamp).toLocaleString('es-ES', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        }),
        volume: +(p.volume).toFixed(2),
      }))
  }, [pourLog, tap])

  return (
    <AnimatePresence>
      {tap && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25 }}
          style={{
            background: 'rgba(18,23,42,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(34,230,255,0.08)',
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 380,
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {/* Beer color swatch */}
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: tap.color_hex, border: '1px solid rgba(255,255,255,0.1)',
                }} />
                <span style={{
                  fontSize: 13, fontWeight: 600, color: '#22E6FF',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  LINEA {tap.id}
                </span>
              </div>
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: '#F5F7FC', margin: 0,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {tap.beer_name || t('empty_keg')}
              </h3>
              {tap.style && (
                <p style={{ fontSize: 12, color: '#ADB4CE', margin: '2px 0 0' }}>{tap.style}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {onPour && tap.status === 'active' && (
                <button
                  onClick={onPour}
                  style={{
                    background: 'linear-gradient(135deg, #D1A178, #22E6FF)',
                    border: 'none', borderRadius: 8,
                    padding: '6px 12px', cursor: 'pointer', color: '#0A0E14',
                    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  Servicio
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8,
                  width: 28, height: 28, cursor: 'pointer', color: '#ADB4CE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {tap.status === 'empty' ? (
            <div style={{
              textAlign: 'center', padding: '32px 0', color: '#7A86A8',
            }}>
              <Archive size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>{t('empty_keg')}</p>
            </div>
          ) : (
            <>
              {/* Status badge */}
              {tap.status === 'cleaning' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, marginBottom: 14,
                  background: '#42A5F515', border: '1px solid #42A5F530',
                }}>
                  <Wrench size={14} color="#42A5F5" />
                  <span style={{ fontSize: 12, color: '#42A5F5', fontWeight: 500 }}>
                    {t('cleaning', 'Limpieza en curso')}
                  </span>
                </div>
              )}

              {/* Low alert */}
              {tap.liters_remaining / tap.liters_total < 0.2 && tap.liters_remaining > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, marginBottom: 14,
                  background: '#EF535015', border: '1px solid #EF535030',
                }}>
                  <AlertTriangle size={14} color="#EF5350" />
                  <span style={{ fontSize: 12, color: '#EF5350', fontWeight: 500 }}>
                    {t('running_low', 'Nivel bajo — quedan pocos días')}
                  </span>
                </div>
              )}

              {/* Stats grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8, marginBottom: 16,
              }}>
                <Stat icon={GlassWater} label="ABV" value={tap.abv ?? '—'} unit="%" />
                <Stat icon={Droplets} label={t('volume', 'Volumen')}
                  value={tap.liters_remaining.toFixed(1)} unit={`/ ${tap.liters_total}L`} color="#22E6FF" />
                <Stat icon={Thermometer} label={t('temp', 'Temperatura')}
                  value={tap.temperature.toFixed(1)} unit="°C" color="#7CB342" />
                <Stat icon={Gauge} label={t('pressure', 'Presión')}
                  value={tap.pressure_bar.toFixed(1)} unit="bar" color="#D1A178" />
              </div>

              {/* Carbonation & Serving */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                padding: 14, marginBottom: 16,
              }}>
                <h4 style={{
                  fontSize: 11, fontWeight: 600, color: '#ADB4CE',
                  textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px',
                }}>
                  {t('carbonation', 'Carbonatación')}
                </h4>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#7A86A8' }}>CO2 vol</div>
                    <div style={{
                      fontSize: 18, fontWeight: 700, color: '#F5F7FC',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {tap.co2_volumes.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#7A86A8' }}>PSI</div>
                    <div style={{
                      fontSize: 18, fontWeight: 700, color: '#F5F7FC',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {co2ToPsi(tap.co2_volumes, tap.temperature).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#7A86A8' }}>OG → FG</div>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: '#D1A178',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {tap.og?.toFixed(3) ?? '—'} → {tap.fg?.toFixed(3) ?? '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tap dates & consumption */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8, marginBottom: 16,
              }}>
                <Stat icon={Calendar} label={t('tapped', 'Conectado')}
                  value={tap.tapped_date ? new Date(tap.tapped_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
                  color="#D4723C" />
                <Stat icon={TrendingDown} label={t('consumption', 'Consumo')}
                  value={tap.consumption_rate_per_day.toFixed(1)} unit="L/día" color="#EF5350" />
                <Stat icon={GlassWater} label={t('servings', 'Servicios')}
                  value={tap.serving_count} color="#F5A623" />
                <Stat icon={Clock} label={t('days_left', 'Días rest.')}
                  value={tap.days_remaining ?? '—'} unit="d" color={
                    (tap.days_remaining ?? 99) < 3 ? '#EF5350' :
                    (tap.days_remaining ?? 99) < 7 ? '#F5A623' : '#7CB342'
                  } />
              </div>

              {/* Pour Log */}
              <div>
                <h4 style={{
                  fontSize: 11, fontWeight: 600, color: '#ADB4CE',
                  textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px',
                }}>
                  {t('pour_log', 'Registro de servicios')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tapPours.map((pour, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 8,
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}>
                      <span style={{ fontSize: 11, color: '#ADB4CE' }}>{pour.time}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: '#22E6FF',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {pour.volume}L
                      </span>
                    </div>
                  ))}
                  {tapPours.length === 0 && (
                    <p style={{ fontSize: 12, color: '#7A86A8', textAlign: 'center', padding: 12 }}>
                      {t('no_pours', 'Sin servicios registrados')}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
