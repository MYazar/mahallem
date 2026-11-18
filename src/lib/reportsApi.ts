import { supabase } from './supabase'
import type { CategoryId, Report, ReportComment } from './types'

interface ReportRow {
  id: string
  category: string
  description: string
  lat: number
  lng: number
  photo_url: string | null
  created_at: string
  owner_id: string
  endorsements: number
  comments: ReportComment[] | null
}

/** Eski tek URL formatı ile yeni JSON dizi formatını birlikte okur. */
function parsePhotoUrls(value: string | null): string[] {
  if (!value) return []
  if (value.trimStart().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string').slice(0, 3)
      }
    } catch {
      // Bozuk JSON varsa tek URL olarak devam et.
    }
  }
  return [value]
}

function rowToReport(row: ReportRow): Report {
  const photos = parsePhotoUrls(row.photo_url)
  return {
    id: row.id,
    category: row.category as CategoryId,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    photo: photos[0],
    photos,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    endorsements: row.endorsements ?? 0,
    comments: row.comments ?? [],
  }
}

/** Anonim oturum açar; her tarayıcıya ait bir kullanıcı kimliği oluşturur. */
export async function ensureAuth(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  if (data.user) return data.user.id
  const { data: signInData, error } = await supabase.auth.signInAnonymously()
  if (error) return null
  return signInData.user?.id ?? null
}

export async function fetchReports(): Promise<Report[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as ReportRow[]).map(rowToReport)
}

/** Bu kullanıcının destek verdiği duyuruların kimlikleri. */
export async function fetchSupportedIds(userId: string): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('report_endorsements')
    .select('report_id')
    .eq('user_id', userId)
  if (error || !data) return []
  return data.map((row) => row.report_id as string)
}

/** Data URL'i fetch kullanmadan Blob'a çevirir (bazı tarayıcılar data: fetch'ini engeller). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',')
  const mime = header?.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(payload ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mime })
}

export async function uploadPhoto(dataUrl: string, userId: string): Promise<string | undefined> {
  if (!supabase) return undefined
  try {
    const blob = dataUrlToBlob(dataUrl)
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const unique =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const path = `${userId}/${unique}.${ext}`
    const { error } = await supabase.storage
      .from('report-photos')
      .upload(path, blob, { contentType: blob.type, upsert: false })
    if (error) return undefined
    const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return undefined
  }
}

export async function insertReport(
  input: { category: CategoryId; description: string; photos?: string[]; lat: number; lng: number },
  userId: string,
): Promise<Report | null> {
  if (!supabase) return null
  const uploaded = await Promise.all(
    (input.photos ?? []).slice(0, 3).map((photo) => uploadPhoto(photo, userId)),
  )
  const photoUrls = uploaded.filter((url): url is string => Boolean(url))
  const { data, error } = await supabase
    .from('reports')
    .insert({
      category: input.category,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      photo_url: photoUrls.length ? JSON.stringify(photoUrls) : null,
      owner_id: userId,
      endorsements: 0,
      comments: [],
    })
    .select()
    .single()
  if (error || !data) return null
  return rowToReport(data as ReportRow)
}

export async function deleteReport(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('reports').delete().eq('id', id)
  return !error
}

export async function endorseReport(
  id: string,
  currentlyEndorsed: boolean,
  userId: string,
): Promise<void> {
  if (!supabase) return
  const fn = currentlyEndorsed ? 'unendorse_report' : 'endorse_report'
  await supabase.rpc(fn, { p_report_id: id, p_user: userId })
}

export async function addComment(id: string, text: string, authorId: string): Promise<void> {
  if (!supabase) return
  await supabase.rpc('add_comment', {
    p_report_id: id,
    p_text: text,
    p_author: authorId,
  })
}

/** Veritabanında bir değişiklik olunca tüm istemcileri yeniler. */
export function subscribeToReports(callback: () => void): () => void {
  if (!supabase) return () => {}
  // Her çağrıya özel konu: React StrictMode çift açılışta aynı kanalın
  // tekrar kullanılmasını ve "subscribe sonrası .on()" hatasını önler.
  const topic = `mahalle-gundemi-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const channel = supabase
    .channel(topic)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'report_endorsements' }, callback)
    .subscribe()
  return () => {
    supabase?.removeChannel(channel)
  }
}
