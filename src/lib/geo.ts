import { SEYRANTEPE_BOUNDARY } from '../data/seyrentepe'

const ring = SEYRANTEPE_BOUNDARY.coordinates[0] as readonly (readonly [number, number])[]

/** Ray casting: nokta mahalle sınırı poligonunun içinde mi? */
export function isInsideSeyrantepe(lat: number, lng: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const relativeFormatter = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })
const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
})

export function timeAgo(iso: string): string {
  const diffSeconds = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(diffSeconds)

  if (abs < 60) return 'az önce'
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour')
  if (abs < 604800) return relativeFormatter.format(Math.round(diffSeconds / 86400), 'day')
  return shortDateFormatter.format(new Date(iso))
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
