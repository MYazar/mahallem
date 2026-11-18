import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  type MapMouseEvent,
  Marker as MapLibreMarker,
  NavigationControl,
  Popup as MapLibrePopup,
  ScaleControl,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { SEYRANTEPE_BOUNDARY, SEYRANTEPE_CENTER } from '../data/seyrentepe'
import { getCategory } from '../lib/categories'
import { formatCoords, isInsideSeyrantepe, timeAgo } from '../lib/geo'
import type { DraftLocation, LocateResult, Report } from '../lib/types'

interface MapViewProps {
  reports: Report[]
  draft: DraftLocation | null
  addMode: boolean
  focus: { id: string; nonce: number } | null
  locateNonce: number
  onMapClick: (lat: number, lng: number) => void
  onDelete: (id: string) => void
  onShare: (report: Report) => void
  onSupport: (id: string) => void
  onOpenDetail: (id: string) => void
  supportedIds: Set<string>
  currentUserId: string
  onLocateResult: (result: LocateResult) => void
}

const baseStyles = {
  streets: 'https://tiles.openfreemap.org/styles/liberty',
  satellite: {
    version: 8 as const,
    sources: {
      satellite: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles © Esri',
      },
    },
    layers: [
      {
        id: 'satellite',
        type: 'raster' as const,
        source: 'satellite',
      },
    ],
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  },
}

const ring = SEYRANTEPE_BOUNDARY.coordinates[0] as readonly (readonly [number, number])[]

const boundaryFeature = {
  type: 'Feature' as const,
  properties: {},
  geometry: SEYRANTEPE_BOUNDARY as unknown as {
    type: 'Polygon'
    coordinates: number[][][]
  },
}

function createPopupContent(
  report: Report,
  onDelete: (id: string) => void,
  onShare: (report: Report) => void,
  onSupport: (id: string) => void,
  supported: boolean,
  onOpenDetail: () => void,
  canDelete: boolean,
): HTMLElement {
  const category = getCategory(report.category)
  const commentCount = report.comments?.length ?? 0
  const root = document.createElement('div')
  root.className = 'report-popup'

  const photos = report.photos?.length ? report.photos : report.photo ? [report.photo] : []

  if (photos.length > 0) {
    const galleryWrap = document.createElement('div')
    galleryWrap.className = 'popup-gallery-wrap'

    const gallery = document.createElement('div')
    gallery.className = 'popup-gallery'
    photos.slice(0, 3).forEach((source, index) => {
      const photo = document.createElement('img')
      photo.className = 'popup-photo'
      photo.src = source
      photo.alt = `${index + 1}. ${category.label} duyurusu fotoğrafı`
      photo.loading = 'lazy'
      gallery.appendChild(photo)
    })
    galleryWrap.appendChild(gallery)

    if (photos.length > 1) {
      const counter = document.createElement('span')
      counter.className = 'popup-gallery-count'
      counter.textContent = `1 / ${photos.length}`

      const move = (direction: number) => {
        gallery.scrollBy({ left: direction * gallery.clientWidth, behavior: 'smooth' })
      }

      const prev = document.createElement('button')
      prev.type = 'button'
      prev.className = 'popup-gallery-nav prev'
      prev.setAttribute('aria-label', 'Önceki fotoğraf')
      prev.textContent = '‹'
      prev.addEventListener('click', (event) => {
        event.stopPropagation()
        move(-1)
      })

      const next = document.createElement('button')
      next.type = 'button'
      next.className = 'popup-gallery-nav next'
      next.setAttribute('aria-label', 'Sonraki fotoğraf')
      next.textContent = '›'
      next.addEventListener('click', (event) => {
        event.stopPropagation()
        move(1)
      })

      galleryWrap.append(counter, prev, next)

      gallery.addEventListener(
        'scroll',
        () => {
          const index = Math.round(gallery.scrollLeft / gallery.clientWidth)
          counter.textContent = `${Math.min(photos.length, index + 1)} / ${photos.length}`
        },
        { passive: true },
      )
    }

    // Galeriyle etkileşim haritayı sürüklemesin veya yakınlaştırmasın.
    gallery.addEventListener('mousedown', (event) => event.stopPropagation())
    gallery.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true })
    gallery.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true })
    gallery.addEventListener(
      'wheel',
      (event) => {
        event.stopPropagation()
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault()
          gallery.scrollLeft += event.deltaY
        }
      },
      { passive: false },
    )

    let dragging = false
    let startX = 0
    let startScroll = 0
    gallery.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') return
      event.stopPropagation()
      dragging = true
      startX = event.clientX
      startScroll = gallery.scrollLeft
      gallery.style.scrollSnapType = 'none'
      gallery.setPointerCapture(event.pointerId)
    })
    gallery.addEventListener('pointermove', (event) => {
      if (!dragging) return
      gallery.scrollLeft = startScroll - (event.clientX - startX)
    })
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      gallery.style.scrollSnapType = ''
      if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId)
    }
    gallery.addEventListener('pointerup', endDrag)
    gallery.addEventListener('pointercancel', endDrag)

    root.appendChild(galleryWrap)
  }

  const body = document.createElement('div')
  body.className = 'popup-body'

  const top = document.createElement('div')
  top.className = 'popup-top'

  const chip = document.createElement('span')
  chip.className = 'popup-chip'
  chip.style.background = category.soft
  chip.style.color = category.color
  chip.textContent = `${category.emoji} ${category.label}`

  const time = document.createElement('span')
  time.className = 'popup-time'
  time.textContent = timeAgo(report.createdAt)

  top.append(chip, time)

  const description = document.createElement('p')
  description.className = 'popup-desc'
  description.textContent = report.description

  body.append(top, description)

  const footer = document.createElement('div')
  footer.className = 'popup-foot'

  const coords = document.createElement('span')
  coords.className = 'popup-coords'
  coords.textContent = formatCoords(report.lat, report.lng)

  const remove = canDelete ? document.createElement('button') : null
  if (remove) {
    remove.type = 'button'
    remove.className = 'popup-delete'
    remove.title = 'Duyuruyu sil'
    remove.innerHTML =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg><span>Sil</span>'
    remove.addEventListener('click', (event) => {
      event.stopPropagation()
      onDelete(report.id)
    })
  }

  const share = document.createElement('button')
  share.type = 'button'
  share.className = 'popup-share'
  share.title = 'Duyuruyu paylaş'
  share.innerHTML =
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span>Paylaş</span>'
  share.addEventListener('click', (event) => {
    event.stopPropagation()
    onShare(report)
  })

  const detail = document.createElement('button')
  detail.type = 'button'
  detail.className = 'popup-detail'
  detail.title = 'Kamuoyu yorumlarını oku'
  detail.innerHTML =
    `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>Yorumlar (${commentCount})</span>`
  detail.addEventListener('click', (event) => {
    event.stopPropagation()
    onOpenDetail()
  })

  const support = document.createElement('button')
  support.type = 'button'
  support.className = `popup-endorse${supported ? ' is-endorsed' : ''}`
  support.title = supported ? 'Desteği geri al' : 'Destek ver'
  support.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 1 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg><span>${report.endorsements ?? 0} destek</span>`
  let isSupported = supported
  support.addEventListener('click', (event) => {
    event.stopPropagation()
    const label = support.querySelector('span')
    const parsed = Number((label?.textContent ?? '').replace(/\D/g, ''))
    const current = Number.isFinite(parsed) ? parsed : (report.endorsements ?? 0)
    onSupport(report.id)
    if (isSupported) {
      isSupported = false
      support.classList.remove('is-endorsed')
      support.title = 'Destek ver'
      if (label) label.textContent = `${Math.max(0, current - 1)} destek`
    } else {
      isSupported = true
      support.classList.add('is-endorsed')
      support.title = 'Desteği geri al'
      if (label) label.textContent = `${current + 1} destek`
    }
  })

  if (remove) footer.append(coords, support, share, detail, remove)
  else footer.append(coords, support, share, detail)
  body.appendChild(footer)
  root.appendChild(body)

  return root
}

/** GPS doğruluk yarıçapını haritada gösterilecek bir poligona çevirir. */
function accuracyCircle(lat: number, lng: number, radiusMeters: number) {
  const steps = 64
  const earthRadius = 6371008.8
  const coordinates: [number, number][] = []

  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    const deltaLat = (radiusMeters / earthRadius) * (180 / Math.PI) * Math.cos(angle)
    const deltaLng =
      (radiusMeters / (earthRadius * Math.cos((lat * Math.PI) / 180))) *
      (180 / Math.PI) *
      Math.sin(angle)
    coordinates.push([lng + deltaLng, lat + deltaLat])
  }
  coordinates.push(coordinates[0])

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coordinates] },
  }
}

const emptyCollection = {
  type: 'FeatureCollection' as const,
  features: [],
}

function buildCollection(reports: Report[]) {
  return {
    type: 'FeatureCollection' as const,
    features: reports.map((report) => {
      const category = getCategory(report.category)
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [report.lng, report.lat] },
        properties: {
          id: report.id,
          category: report.category,
          color: category.color,
          emoji: category.emoji,
          label: category.label,
          description: report.description,
          photo: report.photo ?? null,
          createdAt: report.createdAt,
        },
      }
    }),
  }
}

export default function MapView({
  reports,
  draft,
  addMode,
  focus,
  locateNonce,
  onMapClick,
  onDelete,
  onShare,
  onSupport,
  onOpenDetail,
  supportedIds,
  currentUserId,
  onLocateResult,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const reportsRef = useRef<Report[]>(reports)
  const popupRef = useRef<MapLibrePopup | null>(null)
  const addModeRef = useRef(addMode)
  const draftMarkerRef = useRef<MapLibreMarker | null>(null)
  const userMarkerRef = useRef<MapLibreMarker | null>(null)

  const onMapClickRef = useRef(onMapClick)
  const onDeleteRef = useRef(onDelete)
  const onShareRef = useRef(onShare)
  const onSupportRef = useRef(onSupport)
  const onOpenDetailRef = useRef(onOpenDetail)
  const supportedIdsRef = useRef(supportedIds)
  const currentUserIdRef = useRef(currentUserId)
  const onLocateResultRef = useRef(onLocateResult)

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    onDeleteRef.current = onDelete
  }, [onDelete])

  useEffect(() => {
    onShareRef.current = onShare
  }, [onShare])

  useEffect(() => {
    onSupportRef.current = onSupport
  }, [onSupport])

  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail
  }, [onOpenDetail])

  useEffect(() => {
    supportedIdsRef.current = supportedIds
  }, [supportedIds])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    onLocateResultRef.current = onLocateResult
  }, [onLocateResult])

  useEffect(() => {
    reportsRef.current = reports
  }, [reports])

  useEffect(() => {
    addModeRef.current = addMode
  }, [addMode])

  const openReportPopup = useCallback((report: Report, coords: [number, number]) => {
    const map = mapRef.current
    if (!map) return
    const currentReport = reportsRef.current.find((item) => item.id === report.id) ?? report
    popupRef.current?.remove()
    const popup = new MapLibrePopup({
      offset: 18,
      closeButton: true,
      maxWidth: '300px',
      className: 'report-popup-shell',
    })
      .setLngLat(coords)
      .setDOMContent(
        createPopupContent(
          currentReport,
          (id) => {
            onDeleteRef.current(id)
            popupRef.current?.remove()
            popupRef.current = null
          },
          (sharedReport) => {
            onShareRef.current(sharedReport)
          },
          (supportedId) => {
            onSupportRef.current(supportedId)
          },
          supportedIdsRef.current.has(currentReport.id),
          () => {
            onOpenDetailRef.current(currentReport.id)
          },
          currentReport.ownerId === undefined || currentReport.ownerId === currentUserIdRef.current,
        ),
      )
      .addTo(map)
    popupRef.current = popup
  }, [])

  const addOverlays = useCallback((map: MapLibreMap) => {
    if (!map.getSource('seyrentepe-boundary')) {
      map.addSource('seyrentepe-boundary', {
        type: 'geojson',
        data: boundaryFeature,
      })
      map.addLayer({
        id: 'seyrentepe-boundary-fill',
        type: 'fill',
        source: 'seyrentepe-boundary',
        paint: { 'fill-color': '#14b8a6', 'fill-opacity': 0.06 },
      })
      map.addLayer({
        id: 'seyrentepe-boundary-line',
        type: 'line',
        source: 'seyrentepe-boundary',
        paint: {
          'line-color': '#0f766e',
          'line-width': 2,
          'line-opacity': 0.55,
          'line-dasharray': [2, 2],
        },
      })
    }

    if (!map.getSource('user-accuracy')) {
      map.addSource('user-accuracy', {
        type: 'geojson',
        data: emptyCollection,
      })
      map.addLayer({
        id: 'user-accuracy-fill',
        type: 'fill',
        source: 'user-accuracy',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 },
      })
      map.addLayer({
        id: 'user-accuracy-line',
        type: 'line',
        source: 'user-accuracy',
        paint: { 'line-color': '#2563eb', 'line-width': 1, 'line-opacity': 0.35 },
      })
    }

    if (!map.getSource('reports')) {
      map.addSource('reports', {
        type: 'geojson',
        data: emptyCollection,
        cluster: true,
        clusterMaxZoom: 16,
        clusterRadius: 48,
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#14b8a6',
            10,
            '#0d9488',
            30,
            '#0f766e',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 32],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.addLayer({
        id: 'unclustered-emoji',
        type: 'symbol',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'emoji'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      })
    }

    const reportsSource = map.getSource('reports') as GeoJSONSource | undefined
    reportsSource?.setData(buildCollection(reportsRef.current))
  }, [])

  const [baseMap, setBaseMap] = useState<'streets' | 'satellite'>('streets')

  const changeBaseMap = useCallback(
    (next: 'streets' | 'satellite') => {
      if (next === baseMap) return
      const map = mapRef.current
      if (!map) return
      setBaseMap(next)
      map.once('style.load', () => {
        addOverlays(map)
      })
      map.setStyle(baseStyles[next] as any)
    },
    [baseMap, addOverlays],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = new MapLibreMap({
      container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [SEYRANTEPE_CENTER[1], SEYRANTEPE_CENTER[0]],
      zoom: 14.6,
      minZoom: 12,
      maxZoom: 20,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-left')
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: '© OpenStreetMap katkıcıları · OpenFreeMap',
      }),
      'bottom-right',
    )

    map.on('load', () => {
      if (!mapRef.current) return

      const bounds = new LngLatBounds()
      for (const [lng, lat] of ring) bounds.extend([lng, lat])
      map.fitBounds(bounds, { padding: 28, duration: 0 })

      addOverlays(map)

      map.on('click', 'clusters', (event) => {
        if (addModeRef.current) return
        const feature = event.features?.[0]
        if (!feature) return
        const clusterId = feature.properties?.cluster_id
        const source = map.getSource('reports') as GeoJSONSource | undefined
        if (!source || clusterId === undefined) return
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            if (!mapRef.current) return
            const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates
            mapRef.current.easeTo({ center: coordinates, zoom, duration: 500 })
          })
          .catch(() => {})
      })

      map.on('click', 'unclustered-point', (event) => {
        if (addModeRef.current) return
        const feature = event.features?.[0]
        if (!feature) return
        const id = feature.properties?.id as string | undefined
        if (!id) return
        const report = reportsRef.current.find((item) => item.id === id)
        if (!report) return
        const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates
        openReportPopup(report, coordinates)
      })

      for (const layerId of ['clusters', 'unclustered-point']) {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      }
    })

    map.on('click', (event: MapMouseEvent) => {
      onMapClickRef.current(event.lngLat.lat, event.lngLat.lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      popupRef.current = null
      draftMarkerRef.current = null
      userMarkerRef.current = null
    }
  }, [openReportPopup, addOverlays])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.classList.toggle('is-adding', addMode)
  }, [addMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource('reports') as GeoJSONSource | undefined
    if (!source) return
    source.setData(buildCollection(reports))
  }, [reports])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    draftMarkerRef.current?.remove()
    draftMarkerRef.current = null

    if (!draft) return

    const element = document.createElement('div')
    element.className = 'draft-marker'
    element.innerHTML = '<div class="draft-pin"><span>+</span></div>'

    draftMarkerRef.current = new MapLibreMarker({ element, anchor: 'center' })
      .setLngLat([draft.lng, draft.lat])
      .addTo(map)
  }, [draft])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus) return

    const report = reportsRef.current.find((item) => item.id === focus.id)
    if (!report) return

    map.flyTo({
      center: [report.lng, report.lat],
      zoom: Math.max(map.getZoom(), 17),
      duration: 700,
      essential: true,
    })

    const timer = window.setTimeout(() => {
      if (mapRef.current) {
        openReportPopup(report, [report.lng, report.lat])
      }
    }, 520)

    return () => window.clearTimeout(timer)
  }, [focus, openReportPopup])

  useEffect(() => {
    if (!locateNonce) return
    const map = mapRef.current
    if (!map) return

    if (!('geolocation' in navigator)) {
      onLocateResultRef.current({ inside: false, error: 'Tarayıcın konum özelliğini desteklemiyor.' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mapRef.current) return
        const { latitude, longitude, accuracy } = position.coords
        const inside = isInsideSeyrantepe(latitude, longitude)

        userMarkerRef.current?.remove()
        const element = document.createElement('div')
        element.className = 'user-marker'
        element.innerHTML = '<div class="user-dot"></div>'
        userMarkerRef.current = new MapLibreMarker({ element, anchor: 'center' })
          .setLngLat([longitude, latitude])
          .addTo(map)

        const accuracySource = map.getSource('user-accuracy') as GeoJSONSource | undefined
        accuracySource?.setData(accuracyCircle(latitude, longitude, Math.min(accuracy, 300)))

        map.flyTo({ center: [longitude, latitude], zoom: 16, duration: 800 })
        onLocateResultRef.current({ inside, lat: latitude, lng: longitude })
      },
      (error) => {
        onLocateResultRef.current({
          inside: false,
          error:
            error.code === error.PERMISSION_DENIED
              ? 'Konum izni verilmedi. Tarayıcı ayarlarından izin verebilirsin.'
              : 'Konumun alınamadı. Lütfen tekrar dene.',
        })
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }, [locateNonce])

  return (
    <div className="map-with-basemap">
      <div ref={containerRef} className="map-canvas" aria-label="Seyrantepe mahalle gündemi haritası" />
      <div className="basemap-control">
        <span className="basemap-title">Temel harita</span>
        <div className="basemap-options">
          <button
            type="button"
            className={`basemap-option${baseMap === 'streets' ? ' is-active' : ''}`}
            onClick={() => changeBaseMap('streets')}
          >
            Sokak
          </button>
          <button
            type="button"
            className={`basemap-option${baseMap === 'satellite' ? ' is-active' : ''}`}
            onClick={() => changeBaseMap('satellite')}
          >
            Uydu
          </button>
        </div>
      </div>
    </div>
  )
}
