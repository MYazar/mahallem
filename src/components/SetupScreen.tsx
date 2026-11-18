import { useState, type FormEvent } from 'react'
import { Database, ExternalLink, KeyRound, Link2, MapPinned } from 'lucide-react'

interface SetupScreenProps {
  onSave: (url: string, key: string) => void
  connectionFailed: boolean
}

export default function SetupScreen({ onSave, connectionFailed }: SetupScreenProps) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (url.trim() && key.trim()) onSave(url, key)
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-brand">
          <span className="setup-brand-icon">
            <MapPinned size={22} />
          </span>
          <div>
            <h1>Mahallem</h1>
            <p>Seyrantepe Mahalle Gündemi</p>
          </div>
        </div>

        <div className="setup-intro">
          <span className="setup-intro-icon">
            <Database size={18} />
          </span>
          <div>
            <h2>Ortak gündeme bağlan</h2>
            <p>
              Bu uygulama, mahalledeki herkesin <strong>aynı duyuruları</strong> görmesi için ortak bir
              veritabanı kullanır. Bağlantı henüz kurulmadığı için duyurular gösterilemiyor.
            </p>
          </div>
        </div>

        <div className="setup-steps">
          <div className="setup-step">
            <span>1</span>
            <p>
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
                Supabase <ExternalLink size={11} />
              </a>
              sitesinden ücretsiz bir proje oluştur.
            </p>
          </div>
          <div className="setup-step">
            <span>2</span>
            <p>
              Projenin <strong>SQL Editor</strong> bölümünde, klasördeki{' '}
              <code>supabase/schema.sql</code> dosyasının içeriğini çalıştır.
            </p>
          </div>
          <div className="setup-step">
            <span>3</span>
            <p>
              <strong>Project Settings → API</strong> sayfasındaki iki değeri aşağıya yapıştır.
            </p>
          </div>
        </div>

        <form className="setup-form" onSubmit={submit}>
          <label>
            <span>
              <Link2 size={13} /> Project URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://proje-adin.supabase.co"
              required
            />
          </label>
          <label>
            <span>
              <KeyRound size={13} /> anon public key
            </span>
            <input
              type="text"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="eyJhbGciOi..."
              required
            />
          </label>
          {connectionFailed && (
            <p className="setup-error">
              Kaydedilen bilgilerle bağlanılamadı. Değerleri kontrol edip tekrar dene.
            </p>
          )}
          <button type="submit" className="btn primary setup-submit">
            Bağlan ve gündemi aç
          </button>
        </form>

        <p className="setup-note">
          Bu bilgiler yalnızca bu tarayıcıda saklanır. Siteyi herkese yayınlarken aynı değerleri{' '}
          <code>.env</code> dosyasına yazman yeterli; ziyaretçiler bir şey girmek zorunda kalmaz.
        </p>
      </div>
    </div>
  )
}
