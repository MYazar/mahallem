import {
  ArrowUpDown,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react'
import { CATEGORIES, getCategory } from '../lib/categories'
import { timeAgo } from '../lib/geo'
import type { CategoryId, Report, SortMode } from '../lib/types'

interface SidebarProps {
  reports: Report[]
  filtered: Report[]
  selectedCategories: Set<CategoryId>
  query: string
  sortMode: SortMode
  supportedIds: Set<string>
  open: boolean
  onQueryChange: (value: string) => void
  onToggleCategory: (category: CategoryId) => void
  onClearCategories: () => void
  onSortChange: (mode: SortMode) => void
  onSelectReport: (id: string) => void
  onShare: (report: Report) => void
  onSupport: (id: string) => void
  onOpenDetail: (id: string) => void
  onAddReport: () => void
  onClose: () => void
}

function isThisWeek(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000
}

export default function Sidebar({
  reports,
  filtered,
  selectedCategories,
  query,
  sortMode,
  supportedIds,
  open,
  onQueryChange,
  onToggleCategory,
  onClearCategories,
  onSortChange,
  onSelectReport,
  onShare,
  onSupport,
  onOpenDetail,
  onAddReport,
  onClose,
}: SidebarProps) {
  const weekCount = reports.filter((report) => isThisWeek(report.createdAt)).length
  const supportCount = reports.reduce((sum, report) => sum + (report.endorsements ?? 0), 0)
  const isFiltering = query.trim().length > 0 || selectedCategories.size > 0

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Mahalle gündemi paneli">
      <div className="sidebar-head">
        <div className="sidebar-head-top">
          <span className="sidebar-eyebrow">
            <MapPin size={12} />
            Seyrantepe · Kağıthane
          </span>
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Paneli kapat">
            <X size={18} />
          </button>
        </div>
        <h2>Mahalle Gündemi</h2>
        <p className="sidebar-sub">
          Gördüğün aksaklığı duyur, komşuların destek verip fikrini söylesin. Kamuoyu birlikte oluşur.
        </p>

        <div className="stat-grid">
          <div className="stat">
            <strong>{reports.length}</strong>
            <span>Duyuru</span>
          </div>
          <div className="stat">
            <strong>{weekCount}</strong>
            <span>Bu hafta</span>
          </div>
          <div className="stat">
            <strong>{supportCount}</strong>
            <span>Toplam destek</span>
          </div>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="search-box">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Duyurularda ara..."
            aria-label="Duyurularda ara"
          />
          {query && (
            <button className="search-clear" onClick={() => onQueryChange('')} aria-label="Aramayı temizle">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="section-head">
          <span className="section-title">
            <SlidersHorizontal size={14} />
            Kategoriler
          </span>
          {selectedCategories.size > 0 && (
            <button className="text-btn" onClick={onClearCategories}>
              Temizle
            </button>
          )}
        </div>

        <div className="category-chips">
          {CATEGORIES.map((category) => {
            const active = selectedCategories.has(category.id)
            return (
              <button
                key={category.id}
                className={`chip${active ? ' is-active' : ''}`}
                style={
                  active
                    ? { background: category.soft, borderColor: category.color, color: category.color }
                    : undefined
                }
                onClick={() => onToggleCategory(category.id)}
                aria-pressed={active}
              >
                <category.icon size={13} />
                {category.shortLabel}
              </button>
            )
          })}
        </div>

        <div className="sort-row">
          <span className="section-title">
            <ArrowUpDown size={14} />
            Sıralama
          </span>
          <div className="sort-toggle">
            <button
              type="button"
              className={sortMode === 'newest' ? 'is-active' : undefined}
              onClick={() => onSortChange('newest')}
            >
              En yeni
            </button>
            <button
              type="button"
              className={sortMode === 'supported' ? 'is-active' : undefined}
              onClick={() => onSortChange('supported')}
            >
              Gündem
            </button>
          </div>
        </div>

        <div className="section-head list-head">
          <span className="section-title">
            Duyurular
            <span className="count-pill">{filtered.length}</span>
          </span>
          {isFiltering && (
            <button
              className="text-btn"
              onClick={() => {
                onQueryChange('')
                onClearCategories()
              }}
            >
              Filtreyi kaldır
            </button>
          )}
        </div>

        <div className="report-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {reports.length === 0 ? <Sparkles size={22} /> : <Search size={22} />}
              </div>
              <h3>{reports.length === 0 ? 'Henüz duyuru yok' : 'Sonuç bulunamadı'}</h3>
              <p>
                {reports.length === 0
                  ? 'Haritada gördüğün ilk aksaklığı işaretleyerek mahallenin gündemini başlat.'
                  : 'Arama veya kategori filtrelerini değiştirerek tekrar dene.'}
              </p>
              {reports.length === 0 ? (
                <button className="btn primary small" onClick={onAddReport}>
                  <Plus size={15} />
                  İlk duyuruyu ekle
                </button>
              ) : (
                <button
                  className="btn ghost small"
                  onClick={() => {
                    onQueryChange('')
                    onClearCategories()
                  }}
                >
                  Filtreleri temizle
                </button>
              )}
            </div>
          ) : (
            filtered.map((report) => {
              const category = getCategory(report.category)
              const commentCount = report.comments?.length ?? 0
              return (
                <div
                  key={report.id}
                  className="report-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectReport(report.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelectReport(report.id)
                  }}
                  title="Haritada göster"
                >
                  <span
                    className="report-icon"
                    style={{ background: category.soft, color: category.color }}
                  >
                    <category.icon size={18} />
                  </span>
                  <span className="report-main">
                    <span className="report-top">
                      <span className="report-cat" style={{ color: category.color }}>
                        {category.label}
                      </span>
                      <span className="report-time">{timeAgo(report.createdAt)}</span>
                    </span>
                    <span className="report-desc">{report.description}</span>
                    <span className="report-card-actions">
                      <button
                        type="button"
                        className={`report-endorse${supportedIds.has(report.id) ? ' is-endorsed' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onSupport(report.id)
                        }}
                        aria-label={supportedIds.has(report.id) ? 'Desteği geri al' : 'Destek ver'}
                        title={supportedIds.has(report.id) ? 'Desteği geri al' : 'Destek ver'}
                      >
                        <ThumbsUp size={13} />
                        <span>{report.endorsements ?? 0} destek</span>
                      </button>
                      <button
                        type="button"
                        className="report-comments"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenDetail(report.id)
                        }}
                        aria-label="Yorumları aç"
                        title="Kamuoyu yorumları"
                      >
                        <MessageCircle size={13} />
                        <span>{commentCount}</span>
                      </button>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="report-share"
                    onClick={(event) => {
                      event.stopPropagation()
                      onShare(report)
                    }}
                    aria-label="Duyuruyu paylaş"
                    title="Paylaş"
                  >
                    <Share2 size={14} />
                  </button>
                  {report.photo && (
                    <img className="report-thumb" src={report.photo} alt="" loading="lazy" />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="sidebar-foot">
        <span className="privacy-note">
          <ShieldCheck size={13} />
          Duyurular mahalleyle paylaşılır.
        </span>
      </div>
    </aside>
  )
}
