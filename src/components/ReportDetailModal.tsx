import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MapPin, MessageCircle, Send, Share2, ThumbsUp, X } from 'lucide-react'
import { getCategory } from '../lib/categories'
import { formatCoords, timeAgo } from '../lib/geo'
import type { Report } from '../lib/types'

interface ReportDetailModalProps {
  report: Report
  supported: boolean
  currentUserId: string
  onSupport: (id: string) => void
  onAddComment: (id: string, text: string) => void
  onShare: (report: Report) => void
  onShowOnMap: (id: string) => void
  onClose: () => void
}

export default function ReportDetailModal({
  report,
  supported,
  currentUserId,
  onSupport,
  onAddComment,
  onShare,
  onShowOnMap,
  onClose,
}: ReportDetailModalProps) {
  const [comment, setComment] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const category = getCategory(report.category)
  const supportCount = report.endorsements ?? 0
  const comments = report.comments ?? []

  useEffect(() => {
    document.body.classList.add('modal-open')
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const submitComment = (event: FormEvent) => {
    event.preventDefault()
    const text = comment.trim()
    if (!text) return
    onAddComment(report.id, text)
    setComment('')
    inputRef.current?.focus()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="modal-head">
          <div>
            <span className="modal-kicker">
              <span style={{ color: category.color }}>{category.emoji}</span>
              {' '}
              {category.label} · {timeAgo(report.createdAt)}
            </span>
            <h2 id="detail-title">Mahalle duyurusu</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Pencereyi kapat">
            <X size={19} />
          </button>
        </div>

        <div className="modal-body">
          {report.photo && (
            <img className="detail-photo" src={report.photo} alt="Duyuru fotoğrafı" />
          )}

          <p className="detail-desc">{report.description}</p>

          <div className="detail-meta">
            <MapPin size={13} />
            <span>{formatCoords(report.lat, report.lng)}</span>
          </div>

          <div className="support-panel">
            <div className="support-copy">
              <strong>{supportCount} komşu destekliyor</strong>
              <span>Destek arttıkça duyuru mahalle gündeminde yükselir.</span>
            </div>
            <button
              type="button"
              className={`btn ${supported ? 'support-active' : 'primary'} small`}
              onClick={() => onSupport(report.id)}
            >
              <ThumbsUp size={15} />
              {supported ? 'Desteği geri al' : 'Destek ver'}
            </button>
          </div>

          <div className="detail-actions">
            <button type="button" className="btn ghost small" onClick={() => onShare(report)}>
              <Share2 size={14} />
              Halka duyur / paylaş
            </button>
            <button type="button" className="btn ghost small" onClick={() => onShowOnMap(report.id)}>
              <MapPin size={14} />
              Haritada göster
            </button>
          </div>

          <div className="section-head comment-head">
            <span className="section-title">
              <MessageCircle size={14} />
              Kamuoyu yorumları
              <span className="count-pill">{comments.length}</span>
            </span>
          </div>

          {comments.length === 0 ? (
            <p className="comment-empty">
              Henüz yorum yok. İlk fikrini paylaşarak tartışmayı başlatabilirsin.
            </p>
          ) : (
            <div className="comment-list">
              {comments.map((item) => (
                <div key={item.id} className="comment-item">
                  <div className="comment-avatar">
                    {item.authorId === currentUserId ? 'S' : 'K'}
                  </div>
                  <div className="comment-content">
                    <div className="comment-top">
                      <strong>{item.authorId === currentUserId ? 'Sen' : 'Bir komşu'}</strong>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form className="comment-form" onSubmit={submitComment}>
          <input
            ref={inputRef}
            type="text"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Fikirini veya deneyimini paylaş..."
            maxLength={240}
            aria-label="Yorum yaz"
          />
          <button type="submit" className="btn primary small" disabled={!comment.trim()}>
            <Send size={14} />
            Yorum yap
          </button>
        </form>
      </div>
    </div>
  )
}
