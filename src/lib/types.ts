export type CategoryId =
  | 'road'
  | 'lighting'
  | 'waste'
  | 'water'
  | 'green'
  | 'traffic'
  | 'noise'
  | 'other'

export interface ReportComment {
  id: string
  authorId: string
  text: string
  createdAt: string
}

export interface Report {
  id: string
  category: CategoryId
  description: string
  lat: number
  lng: number
  photo?: string
  createdAt: string
  /** Kamuoyu desteği sayısı (eski veri alanı adı korunuyor). */
  endorsements?: number
  comments?: ReportComment[]
  ownerId?: string
}

export type SortMode = 'newest' | 'supported'

export interface DraftLocation {
  lat: number
  lng: number
}

export interface NewReportInput {
  category: CategoryId
  description: string
  photo?: string
}

export interface LocateResult {
  inside: boolean
  lat?: number
  lng?: number
  error?: string
}
