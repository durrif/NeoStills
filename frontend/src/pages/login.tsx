// frontend/src/pages/login.tsx
import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Wifi, Beaker, BarChart3, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Logo } from '@/components/ui/logo'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { TokenResponse } from '@/lib/types'

const features = [
  { icon: Beaker, labelKey: 'auth.feature_brew', fallback: 'Asistente de elaboración en tiempo real' },
  { icon: Cpu, labelKey: 'auth.feature_iot', fallback: 'Dispositivos IoT integrados' },
  { icon: BarChart3, labelKey: 'auth.feature_analytics', fallback: 'Analíticas de producción y costes' },
  { icon: Wifi, labelKey: 'auth.feature_voice', fallback: 'Control por voz inteligente' },
]

export default function LoginPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errs: typeof errors = {}
    if (!email) errs.email = t('errors.required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('errors.invalid_email')
    if (!password) errs.password = t('errors.required')
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      const data = await api.post<TokenResponse>('/v1/auth/login', { email, password })
      setAuth(data)
      toast.success(t('auth.login_success'))
      void navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.server_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex bg-bg-primary">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-accent-amber/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-copper/[0.03] rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-status-info/[0.02] rounded-full blur-[60px]" />
      </div>

      {/* Left panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] p-10 relative z-10">
        <div>
          <Logo size="lg" showTagline className="mb-16 drop-shadow-[0_0_16px_rgba(34,230,255,0.18)]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-3xl font-bold text-text-primary leading-tight mb-3">
              {t('auth.hero_title', 'Tu destilería, conectada.')}
            </h2>
            <p className="text-base text-text-secondary leading-relaxed max-w-sm">
              {t('auth.hero_subtitle', 'Controla cada etapa de elaboración, gestiona inventario y dispositivos desde un solo lugar.')}
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {features.map(({ icon: Icon, labelKey, fallback }, i) => (
              <motion.div
                key={labelKey}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-accent-amber/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-accent-amber" />
                </div>
                <span className="text-sm text-text-secondary">{t(labelKey, fallback)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-tertiary">
          &copy; {new Date().getFullYear()} NeoStills &middot; Centro de control para destilacion artesanal
        </p>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <Logo size="xl" showTagline className="justify-center drop-shadow-[0_0_20px_rgba(34,230,255,0.2)]" />
          </div>

          {/* Form card */}
          <div className="glass-card rounded-2xl p-7 shadow-glass">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-primary">{t('auth.login')}</h2>
              <p className="text-sm text-text-secondary mt-1">{t('auth.login_subtitle', 'Accede a tu panel de control')}</p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">{t('auth.email')}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
                    autoComplete="email"
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-bg-elevated border text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent-amber/50 transition-all',
                      errors.email ? 'border-status-danger' : 'border-white/[0.07]'
                    )}
                  />
                </div>
                {errors.email && <p className="text-xs text-status-danger">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">{t('auth.password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
                    autoComplete="current-password"
                    className={cn(
                      'w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-bg-elevated border text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent-amber/50 transition-all',
                      errors.password ? 'border-status-danger' : 'border-white/[0.07]'
                    )}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-status-danger">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-2.5 rounded-lg font-semibold text-sm text-bg-primary transition-all',
                  'bg-amber-gradient hover:shadow-glow active:scale-[0.98]',
                  loading && 'opacity-60 cursor-not-allowed'
                )}
              >
                {loading ? t('auth.logging_in') : t('auth.login')}
              </button>
            </form>

            <p className="text-center text-sm text-text-secondary mt-5">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="text-accent-amber hover:text-accent-amber-bright underline-offset-2 hover:underline transition-colors">
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
