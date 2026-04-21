// frontend/src/components/layout/notification-center.tsx
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'danger' | 'info'
  title: string
  message: string
  time: string
  read: boolean
}

interface NotificationCenterProps {
  open: boolean
  onClose: () => void
}

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
}

const colorMap = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  info: 'text-status-info',
}

// Demo notifications — will be replaced with real data
const demoNotifications: Notification[] = [
  { id: '1', type: 'danger', title: 'Maceración fuera de rango', message: 'El pH estimado del lote Bourbon #12 supera el objetivo de 5.4', time: '2h', read: false },
  { id: '2', type: 'warning', title: 'iSpindel batería baja', message: 'El dispositivo "Wash Tank 1" tiene un 15% de batería', time: '4h', read: false },
  { id: '3', type: 'success', title: 'Fermentación estable', message: 'Fermentador #2 mantiene gravedad estable durante 24h', time: '6h', read: true },
  { id: '4', type: 'info', title: 'Nueva oferta disponible', message: 'La Tienda del Destilador ha actualizado su catálogo técnico', time: '1d', read: true },
]

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { t } = useTranslation('common')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="notif-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-accent-amber" />
                <h3 className="text-base font-semibold font-display">{t('notifications.title', 'Notificaciones')}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {demoNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-2">
                  <Bell size={32} className="opacity-30" />
                  <p className="text-sm">{t('status.empty')}</p>
                </div>
              ) : (
                demoNotifications.map((notif) => {
                  const Icon = iconMap[notif.type]
                  return (
                    <div key={notif.id} className={cn('notif-item', !notif.read && 'unread')}>
                      <div className={cn('mt-0.5 shrink-0', colorMap[notif.type])}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                      </div>
                      <span className="text-2xs text-text-tertiary shrink-0 mt-0.5">{notif.time}</span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/[0.08]">
              <button className="w-full py-2 text-sm text-accent-amber hover:text-accent-foam transition-colors text-center font-medium">
                {t('notifications.mark_all_read', 'Marcar todas como leídas')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
