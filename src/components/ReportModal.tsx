import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Camera, Check, ImagePlus, LoaderCircle, MapPin, Send, Trash2, X } from 'lucide-react'
import { CATEGORIES } from '../lib/categories'
import { formatCoords } from '../lib/geo'
import { fileToCompressedDataUrl } from '../lib/image'
import type { CategoryId, DraftLocation, NewReportInput } from '../lib/types'

interface ReportModalProps {
  location: DraftLocation
  onClose: () => void
  onSubmit: (input: NewReportInput) => void
}

export default function ReportModal({ location, onClose, onSubmit }: ReportModalProps) {
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    document.body.classList.add('modal-open')
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    textareaRef.current?.focus()
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const canSubmit =
    category !== null && description.trim().length >= 5 && !photoLoading

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setPhotoLoading(true)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setPhoto(dataUrl)
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Fotoğraf yüklenemedi.')
    } finally {
      setPhotoLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!category) {
      setError('Lütfen bir kategori seç.')
      return
    }
    if (description.trim().length < 5) {
      setError('Sorunu en az 5 karakterle anlatmalısın.')
      return
    }
    onSubmit({
      category,
      description: description.trim(),
      photo: photo ?? undefined,
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-report-title">
        <div className="modal-head">
          <div>
            <span className="modal-kicker">
              <MapPin size={12} />
              Seyrantepe Mahallesi
            </span>
            <h2 id="new-report-title">Sorun duyurusu</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Formu kapat">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="location-strip">
              <span className="location-icon">
                <MapPin size={17} />
              </span>
              <span className="location-text">
                <span>Seçilen konum</span>
                <strong>{formatCoords(location.lat, location.lng)}</strong>
              </span>
            </div>

            <div className="field">
              <span className="field-label">
                Sorunun türü
                <span className="required">Zorunlu</span>
              </span>
              <div className="category-grid">
                {CATEGORIES.map((item) => {
                  const selected = category === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`cat-option${selected ? ' is-selected' : ''}`}
                      style={
                        {
                          '--cat': item.color,
                          '--cat-soft': item.soft,
                        } as CSSProperties
                      }
                      onClick={() => {
                        setCategory(item.id)
                        setError(null)
                      }}
                      aria-pressed={selected}
                    >
                      <span className="cat-option-icon">
                        <item.icon size={17} />
                      </span>
                      <span className="cat-option-label">{item.label}</span>
                      {selected && (
                        <span className="cat-check">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="report-description">
                Sorunu anlat
                <span className="required">Zorunlu</span>
              </label>
              <textarea
                id="report-description"
                ref={textareaRef}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Örn. Kaldırım taşları yerinden çıkmış, akşamları yayalar için tehlikeli oluyor. Komşuların neden önemli olduğunu anlat."
                maxLength={280}
                rows={3}
              />
              <div className="field-foot">
                <span>En az 5 karakter</span>
                <span className={description.length > 240 ? 'is-near-limit' : undefined}>
                  {description.length}/280
                </span>
              </div>
              <p className="publish-note">
                Duyurun mahalle gündeminde görünecek; komşuların destek verip yorum yapabilecek.
              </p>
            </div>

            <div className="field">
              <span className="field-label">
                Fotoğraf
                <span className="optional">İsteğe bağlı</span>
              </span>

              {photo ? (
                <div className="photo-preview">
                  <img src={photo} alt="Seçilen fotoğrafın önizlemesi" />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => setPhoto(null)}
                    aria-label="Fotoğrafı kaldır"
                  >
                    <Trash2 size={14} />
                    Kaldır
                  </button>
                </div>
              ) : (
                <label className={`photo-drop${photoLoading ? ' is-loading' : ''}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handlePhoto(event.target.files?.[0])}
                    disabled={photoLoading}
                  />
                  <span className="photo-drop-icon">
                    {photoLoading ? <LoaderCircle size={20} className="spin" /> : <ImagePlus size={20} />}
                  </span>
                  <span className="photo-drop-text">
                    <strong>{photoLoading ? 'Fotoğraf hazırlanıyor...' : 'Fotoğraf ekle'}</strong>
                    <small>JPG, PNG · en fazla 12 MB</small>
                  </span>
                  <span className="photo-camera">
                    <Camera size={15} />
                  </span>
                </label>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn primary" disabled={!canSubmit}>
              <Send size={15} />
              Duyuruyu yayınla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
