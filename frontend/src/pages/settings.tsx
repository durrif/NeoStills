// frontend/src/pages/settings.tsx
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Building, Droplets, Key, Globe, Save, Eye, EyeOff } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'

interface SectionProps { icon: React.ReactNode; title: string; children: React.ReactNode }
function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
        {icon}{title}
      </h2>
      <Separator className="bg-zinc-700" />
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const { setActivePage, language, setLanguage } = useUIStore()
  const { user, brewery } = useAuthStore()
  useEffect(() => { setActivePage('settings') }, [setActivePage])

  // Brewer's Friend API key
  const [bfKey, setBfKey] = useState(() => localStorage.getItem('bf_api_key') ?? '')
  const [showBfKey, setShowBfKey] = useState(false)

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const saveBfKey = () => {
    localStorage.setItem('bf_api_key', bfKey)
    toast.success(t('settings.api_key_saved'))
  }

  const changePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error(t('errors.passwords_mismatch')); return }
    if (newPwd.length < 8) { toast.error(t('errors.password_too_short')); return }
    try {
      await apiClient.post('/auth/change-password', { current_password: currentPwd, new_password: newPwd })
      toast.success(t('settings.password_updated'))
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e: unknown) {
      toast.error((e as Error).message ?? t('settings.password_error'))
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold amber-text">{t('nav.settings')}</h1>

      {/* Profile */}
      <Section icon={<User className="w-4 h-4 text-accent-copper" />} title={t('settings.profile')}>
        <div className="text-sm text-text-secondary space-y-2">
          <div className="flex justify-between">
            <span className="text-text-primary font-medium">{t('settings.name')}</span>
            <span>{user?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-primary font-medium">{t('settings.email')}</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-primary font-medium">{t('settings.role')}</span>
            <span className="capitalize">{user?.role}</span>
          </div>
        </div>

        <Separator className="bg-zinc-700" />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-secondary">{t('settings.change_password')}</h3>
          <div className="space-y-2">
            <Label className="text-xs text-text-tertiary">{t('settings.current_password')}</Label>
            <Input type="password" value={currentPwd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPwd(e.target.value)}
              className="bg-bg-tertiary border-white/10 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-tertiary">{t('settings.new_password')}</Label>
            <Input type="password" value={newPwd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPwd(e.target.value)}
              className="bg-bg-tertiary border-white/10 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-tertiary">{t('settings.confirm_password')}</Label>
            <Input type="password" value={confirmPwd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPwd(e.target.value)}
              className="bg-bg-tertiary border-white/10 text-sm" />
          </div>
          <Button
            size="sm"
            disabled={!currentPwd || !newPwd || !confirmPwd}
            onClick={changePassword}
            className="shadow-glow"
          >
            <Save className="w-3.5 h-3.5 mr-1" /> {t('settings.save_password')}
          </Button>
        </div>
      </Section>

      {/* Brewery */}
      {brewery && (
        <Section icon={<Building className="w-4 h-4 text-accent-cyan" />} title={t('settings.brewery')}>
          <div className="text-sm text-text-secondary space-y-2">
            <div className="flex justify-between">
              <span className="text-text-primary font-medium">{t('settings.name')}</span>
              <span>{brewery.name}</span>
            </div>
            {brewery.location && (
              <div className="flex justify-between">
                <span className="text-text-primary font-medium">{t('settings.location')}</span>
                <span>{brewery.location}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Language */}
      <Section icon={<Globe className="w-4 h-4 text-accent-cyan" />} title={t('settings.language')}>
        <div className="flex gap-3">
          {(['es', 'en'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                language === lang
                  ? 'bg-amber-gradient text-bg-primary shadow-glow'
                  : 'glass-card text-text-secondary hover:text-text-primary'
              }`}
            >
              {lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </Section>

      {/* API Keys */}
      <Section icon={<Key className="w-4 h-4 text-accent-copper" />} title={t('settings.integrations')}>
        <div className="space-y-3">
          <Label className="text-xs text-text-tertiary">Clave de importación de recetas</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showBfKey ? 'text' : 'password'}
                value={bfKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBfKey(e.target.value)}
                placeholder={t('settings.api_key_placeholder')}
                className="bg-bg-tertiary border-white/10 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowBfKey((v: boolean) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                {showBfKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={saveBfKey}
              disabled={!bfKey}
              className="shadow-glow"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> {t('actions.save')}
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            La API key se guarda en tu navegador (localStorage) y se usa para importar recetas XML o ZIP desde proveedores compatibles.
          </p>
        </div>
      </Section>

      {/* Water profiles placeholder */}
      <Section icon={<Droplets className="w-4 h-4 text-accent-cyan" />} title="Perfil de agua y proofing">
        <p className="text-xs text-text-tertiary">
          Configura el perfil de agua de tu destilería en el Laboratorio para ajustar maceración, proofing y consistencia entre lotes.
        </p>
      </Section>
    </div>
  )
}

