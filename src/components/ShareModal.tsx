import { Check, Copy, Share2, X } from 'lucide-react'
import { getCategory } from '../lib/categories'
import type { Report } from '../lib/types'
import { useState } from 'react'

interface ShareModalProps {
  report: Report | null
  onClose: () => void
}

export default function ShareModal({ report, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!report) return null

  const category = getCategory(report.category)
  const url = `${window.location.origin}${window.location.pathname}?report=${encodeURIComponent(report.id)}`
  const text = `${category.emoji} ${category.label}: ${report.description} — Mahallem (Seyrantepe)`

  const nativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title: 'Mahallem duyurusu', text, url })
    } catch {
      // kullanıcı iptal ettiyse sessizce geç
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // panoya yazılamadı
    }
  }

  const links = [
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">Halka duyur</span>
            <h2>Duyuruyu paylaş</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="share-preview">{text}</p>
          {typeof navigator.share === 'function' && (
            <button type="button" className="btn primary" onClick={nativeShare}>
              <Share2 size={16} />
              <span>Paylaşım menüsünü aç</span>
            </button>
          )}
          <div className="share-links">
            {links.map((link) => (
              <a
                key={link.label}
                className="btn ghost"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
          <button type="button" className="btn ghost" onClick={copyLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Bağlantı kopyalandı' : 'Bağlantıyı kopyala'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}