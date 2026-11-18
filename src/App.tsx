import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Crosshair,
  Info,
  List,
  LocateFixed,
  MapPinned,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react'
import MapView from './components/MapView'
import ReportDetailModal from './components/ReportDetailModal'
import ReportModal from './components/ReportModal'
import SetupScreen from './components/SetupScreen'
import ShareModal from './components/ShareModal'
import Sidebar from './components/Sidebar'
import { getCategory } from './lib/categories'
import { isInsideSeyrantepe } from './lib/geo'
import { canSubmitNow, containsBlockedContent, recordSubmission } from './lib/moderation'
import {
  hasStoredConfig,
  isSupabaseConfigured,
  saveConfig,
  supabase,
} from './lib/supabase'
import {
  addComment as addRemoteComment,
  deleteReport as deleteRemoteReport,
  endorseReport as supportRemoteReport,
  ensureAuth,
  fetchReports as fetchRemoteReports,
  fetchSupportedIds,
  insertReport as insertRemoteReport,
  subscribeToReports,
} from './lib/reportsApi'
import type {
  CategoryId,
  DraftLocation,
  LocateResult,
  NewReportInput,
  Report,
  ReportComment,
  SortMode,
} from './lib/types'

type ToastTone = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryId>>(new Set())
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [addMode, setAddMode] = useState(false)
  const [draft, setDraft] = useState<DraftLocation | null>(null)
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null)
  const [locateNonce, setLocateNonce] = useState(0)
  const [mobilePanel, setMobilePanel] = useState(false)
  const [shareReport, setShareReport] = useState<Report | null>(null)
  const [detailReportId, setDetailReportId] = useState<string | null>(null)
  const [supportedIds, setSupportedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<Toast | null>(null)
  const focusNonce = useRef(0)
  const initialFocusDone = useRef(false)
  const userIdRef = useRef('')

  const detailReport = detailReportId
    ? (reports.find((report) => report.id === detailReportId) ?? null)
    : null

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ id: Date.now() + Math.random(), message, tone })
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const refresh = async (userId: string) => {
      const [nextReports, nextSupported] = await Promise.all([
        fetchRemoteReports(),
        userId ? fetchSupportedIds(userId) : Promise.resolve([]),
      ])
      setReports(nextReports)
      setSupportedIds(new Set(nextSupported))
    }

    const load = async () => {
      setLoadingReports(true)
      const userId = await ensureAuth()
      if (!userId) {
        setLoadingReports(false)
        showToast('Ortak veritabanına giriş yapılamadı.', 'error')
        return
      }
      setCurrentUserId(userId)
      userIdRef.current = userId
      await refresh(userId)
      unsubscribe = subscribeToReports(() => {
        void refresh(userIdRef.current)
      })
      setLoadingReports(false)
    }
    void load()
    return () => {
      unsubscribe?.()
    }
  }, [showToast])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!addMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addMode])

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr')

    const result = reports
      .filter(
        (report) => selectedCategories.size === 0 || selectedCategories.has(report.category),
      )
      .filter((report) => {
        if (!normalizedQuery) return true
        const category = getCategory(report.category)
        return (
          report.description.toLocaleLowerCase('tr').includes(normalizedQuery) ||
          category.label.toLocaleLowerCase('tr').includes(normalizedQuery)
        )
      })

    return result.sort((a, b) => {
      if (sortMode === 'supported') {
        const supportDifference = (b.endorsements ?? 0) - (a.endorsements ?? 0)
        if (supportDifference !== 0) return supportDifference
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [reports, selectedCategories, query, sortMode])

  const focusReport = useCallback((id: string) => {
    focusNonce.current += 1
    setFocus({ id, nonce: focusNonce.current })
  }, [])

  const startAdd = useCallback(() => {
    setDraft(null)
    setMobilePanel(false)
    setAddMode(true)
  }, [])

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!addMode || draft) return
      if (!isInsideSeyrantepe(lat, lng)) {
        showToast('Duyuru için Seyrantepe Mahallesi sınırları içinde bir nokta seç.', 'warning')
        return
      }
      setDraft({ lat, lng })
      setAddMode(false)
      setMobilePanel(false)
    },
    [addMode, draft, showToast],
  )

  const handleSubmit = useCallback(
    async (input: NewReportInput) => {
      if (!draft) return
      if (containsBlockedContent(input.description)) {
        showToast('Açıklama uygunsuz ifadeler içeriyor.', 'error')
        return
      }
      if (!canSubmitNow()) {
        showToast('Çok sık duyuru gönderiyorsun. Lütfen daha sonra dene.', 'error')
        return
      }
      const remote = await insertRemoteReport(
        {
          category: input.category,
          description: input.description,
          photo: input.photo,
          lat: draft.lat,
          lng: draft.lng,
        },
        currentUserId,
      )
      if (!remote) {
        showToast('Duyuru ortak gündeme kaydedilemedi.', 'error')
        return
      }
      setReports((previous) => [remote, ...previous])
      setQuery('')
      setSelectedCategories(new Set())
      setDraft(null)
      focusReport(remote.id)
      recordSubmission()
      showToast('Duyurun mahalle gündemine yayınlandı!')
    },
    [draft, currentUserId, focusReport, showToast],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const report = reports.find((item) => item.id === id)
      if (report?.ownerId && report.ownerId !== currentUserId) {
        showToast('Bu duyuruyu yalnızca ekleyen kişi silebilir.', 'error')
        return
      }
      if (!window.confirm('Bu duyuruyu silmek istediğine emin misin?')) return
      const ok = await deleteRemoteReport(id)
      if (!ok) {
        showToast('Duyuru silinemedi.', 'error')
        return
      }
      setReports((previous) => previous.filter((item) => item.id !== id))
      setDetailReportId(null)
      showToast('Duyuru silindi.', 'info')
    },
    [reports, currentUserId, showToast],
  )

  const handleToggleCategory = useCallback((category: CategoryId) => {
    setSelectedCategories((previous) => {
      const next = new Set(previous)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  const handleLocate = useCallback(() => {
    setMobilePanel(false)
    setLocateNonce((value) => value + 1)
  }, [])

  const handleLocateResult = useCallback(
    (result: LocateResult) => {
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      if (result.inside) {
        showToast('Konumun bulundu. Haritada mavi nokta ile işaretlendi.')
      } else {
        showToast('Şu an Seyrantepe Mahallesi sınırları dışındasın.', 'warning')
      }
    },
    [showToast],
  )

  const handleSupport = useCallback(
    async (id: string) => {
      const currentlySupported = supportedIds.has(id)
      await supportRemoteReport(id, currentlySupported, currentUserId)
      setReports((previous) =>
        previous.map((report) => {
          if (report.id !== id) return report
          const current = report.endorsements ?? 0
          return {
            ...report,
            endorsements: currentlySupported ? Math.max(0, current - 1) : current + 1,
          }
        }),
      )
      setSupportedIds((previous) => {
        const next = new Set(previous)
        if (currentlySupported) next.delete(id)
        else next.add(id)
        return next
      })
      showToast(currentlySupported ? 'Desteğini geri aldın.' : 'Destek verdiğin için teşekkürler!')
    },
    [supportedIds, currentUserId, showToast],
  )

  const handleAddComment = useCallback(
    async (id: string, text: string) => {
      const comment: ReportComment = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        authorId: currentUserId,
        text,
        createdAt: new Date().toISOString(),
      }
      await addRemoteComment(id, text, currentUserId)
      setReports((previous) =>
        previous.map((report) =>
          report.id === id
            ? { ...report, comments: [...(report.comments ?? []), comment] }
            : report,
        ),
      )
      showToast('Yorumun kamuoyu tartışmasına eklendi.')
    },
    [currentUserId, showToast],
  )

  const openDetail = useCallback((id: string) => {
    setMobilePanel(false)
    setDetailReportId(id)
  }, [])

  const showOnMap = useCallback(
    (id: string) => {
      setDetailReportId(null)
      setMobilePanel(false)
      focusReport(id)
    },
    [focusReport],
  )

  const handleConfigure = useCallback((newUrl: string, newKey: string) => {
    saveConfig(newUrl, newKey)
    window.location.reload()
  }, [])

  useEffect(() => {
    if (initialFocusDone.current) return
    const reportId = new URLSearchParams(window.location.search).get('report')
    if (reportId && reports.some((report) => report.id === reportId)) {
      initialFocusDone.current = true
      focusReport(reportId)
    }
  }, [reports, focusReport])

  if (!isSupabaseConfigured) {
    return (
      <SetupScreen
        onSave={handleConfigure}
        connectionFailed={hasStoredConfig() && !supabase}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <MapPinned size={21} strokeWidth={2.3} />
          </div>
          <div className="brand-text">
            <h1>Mahallem</h1>
            <p>Seyrantepe · Kağıthane</p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="report-count-pill">
            <span className="count-dot" />
            {reports.length} duyuru
          </span>
          <button className="btn ghost topbar-locate" onClick={handleLocate} title="Konumumu göster">
            <LocateFixed size={16} />
            <span>Konumum</span>
          </button>
          <button className="btn primary" onClick={startAdd}>
            <Plus size={17} />
            <span>Sorun Duyur</span>
          </button>
          <button
            className="icon-btn mobile-list-btn"
            onClick={() => setMobilePanel(true)}
            aria-label="Mahalle gündemini aç"
          >
            <List size={19} />
          </button>
        </div>
      </header>

      {loadingReports && (
        <div className="loading-banner">Ortak gündem yükleniyor...</div>
      )}
      <main className="app-main">
        <Sidebar
          reports={reports}
          filtered={filteredReports}
          selectedCategories={selectedCategories}
          query={query}
          sortMode={sortMode}
          supportedIds={supportedIds}
          open={mobilePanel}
          onQueryChange={setQuery}
          onToggleCategory={handleToggleCategory}
          onClearCategories={() => setSelectedCategories(new Set())}
          onSortChange={setSortMode}
          onSelectReport={(id) => {
            setMobilePanel(false)
            focusReport(id)
          }}
          onShare={(report) => setShareReport(report)}
          onSupport={handleSupport}
          onOpenDetail={openDetail}
          onAddReport={startAdd}
          onClose={() => setMobilePanel(false)}
        />

        <section className="map-shell">
          <MapView
            reports={filteredReports}
            draft={draft}
            addMode={addMode}
            focus={focus}
            locateNonce={locateNonce}
            onMapClick={handleMapClick}
            onDelete={handleDelete}
            onShare={(report) => setShareReport(report)}
            onSupport={handleSupport}
            onOpenDetail={openDetail}
            supportedIds={supportedIds}
            currentUserId={currentUserId}
            onLocateResult={handleLocateResult}
          />

          {addMode && (
            <div className="map-hint">
              <span className="hint-icon">
                <Crosshair size={17} />
              </span>
              <span className="hint-text">
                <strong>Haritada bir noktaya dokun</strong>
                <small>Aksaklığın olduğu yeri işaretle</small>
              </span>
              <button className="hint-cancel" onClick={() => setAddMode(false)}>
                Vazgeç
              </button>
            </div>
          )}

          <div className="map-caption">
            <span className="caption-dot" />
            Seyrantepe Mahallesi sınırları
          </div>
        </section>
      </main>

      {mobilePanel && (
        <button
          className="drawer-backdrop"
          onClick={() => setMobilePanel(false)}
          aria-label="Paneli kapat"
        />
      )}

      {draft && (
        <ReportModal
          location={draft}
          onClose={() => setDraft(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ShareModal report={shareReport} onClose={() => setShareReport(null)} />

      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          supported={supportedIds.has(detailReport.id)}
          currentUserId={currentUserId}
          onSupport={handleSupport}
          onAddComment={handleAddComment}
          onShare={(report) => setShareReport(report)}
          onShowOnMap={showOnMap}
          onClose={() => setDetailReportId(null)}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          <span className="toast-icon">
            {toast.tone === 'success' && <CheckCircle2 size={17} />}
            {(toast.tone === 'error' || toast.tone === 'warning') && (
              <TriangleAlert size={17} />
            )}
            {toast.tone === 'info' && <Info size={17} />}
          </span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)} aria-label="Kapat">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
