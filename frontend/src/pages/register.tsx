// frontend/src/pages/register.tsx
import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { type LucideIcon, Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Logo } from '@/components/ui/logo'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { TokenResponse } from '@/lib/types'

interface FormData {
  email: string
  full_name: string
  brewery_name: string
  password: string
  confirm_password: string
}

interface FormErrors extends Partial<Record<keyof FormData, string>> {}

export default function RegisterPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState<FormData>({
    email: '', full_name: '', brewery_name: '', password: '', confirm_password: ''
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  const validate = (): FormErrors => {
    const errs: FormErrors = {}
    if (!form.email) errs.email = t('errors.required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('errors.invalid_email')
    if (!form.full_name) errs.full_name = t('errors.required')
    if (!form.brewery_name) errs.brewery_name = t('errors.required')
    if (!form.password) errs.password = t('errors.required')
    else if (form.password.length < 8) errs.password = t('errors.password_too_short')
    else if (!/[A-Z]/.test(form.password)) errs.password = t('errors.password_no_uppercase')
    else if (!/\d/.test(form.password)) errs.password = t('errors.password_no_digit')
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) errs.password = t('errors.password_no_special')
    if (form.confirm_password !== form.password) errs.confirm_password = t('errors.passwords_mismatch')
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      const data = await api.post<TokenResponse>('/v1/auth/register', {
        email: form.email,
        full_name: form.full_name,
        brewery_name: form.brewery_name,
        password: form.password,
      })
      setAuth(data)
      toast.success(t('auth.login_success'))
      void navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.server_error'))
    } finally {
      setLoading(false)
    }
  }

  const fields: { key: keyof FormData; label: string; type: string; Icon: LucideIcon; autoComplete: string }[] = [
    { key: 'email', label: t('auth.email'), type: 'email', Icon: Mail, autoComplete: 'email' },
    { key: 'full_name', label: t('auth.full_name'), type: 'text', Icon: User, autoComplete: 'name' },
    { key: 'brewery_name', label: t('auth.brewery_name'), type: 'text', Icon: Building2, autoComplete: 'organization' },
  ]

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-primary p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-amber/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-copper/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Logo size="xl" showTagline className="justify-center drop-shadow-[0_0_20px_rgba(34,230,255,0.2)]" />
          <p className="text-sm text-text-secondary mt-3">Centro de control para destilacion artesanal</p>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-text-primary mb-6">{t('auth.register')}</h2>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
            {fields.map(({ key, label, type, Icon, autoComplete }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type={type}
                    value={form[key]}
                    onChange={set(key)}
                    autoComplete={autoComplete}
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-bg-elevated border text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent-amber/50 transition-all',
                      errors[key] ? 'border-status-danger' : 'border-white/[0.08]'
                    )}
                  />
                </div>
                {errors[key] && <p className="text-xs text-status-danger">{errors[key]}</p>}
              </div>
            ))}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  className={cn(
                    'w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-bg-elevated border text-text-primary',
                    'focus:outline-none focus:ring-1 focus:ring-accent-amber/50 transition-all',
                    errors.password ? 'border-status-danger' : 'border-white/[0.08]'
                  )}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-status-danger">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">{t('auth.confirm_password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  autoComplete="new-password"
                  className={cn(
                    'w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-bg-elevated border text-text-primary',
                    'focus:outline-none focus:ring-1 focus:ring-accent-amber/50 transition-all',
                    errors.confirm_password ? 'border-status-danger' : 'border-white/[0.08]'
                  )}
                />
              </div>
              {errors.confirm_password && <p className="text-xs text-status-danger">{errors.confirm_password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-2.5 rounded-lg font-semibold text-sm text-bg-primary transition-all',
                'bg-amber-gradient hover:shadow-glow',
                loading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {loading ? t('auth.registering') : t('auth.register')}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-4">
            {t('auth.have_account')}{' '}
            <Link to="/login" className="text-accent-amber hover:text-accent-amber-bright underline-offset-2 hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
