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

function rowToReport(row: ReportRow): Report {
  return {
    id: row.id,
    category: row.category as CategoryId,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    photo: row.photo_url ?? undefined,
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

export async function uploadPhoto(dataUrl: string, userId: string): Promise<string | undefined> {
  if (!supabase) return undefined
  try {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
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
  input: { category: CategoryId; description: string; photo?: string; lat: number; lng: number },
  userId: string,
): Promise<Report | null> {
  if (!supabase) return null
  const photoUrl = input.photo ? await uploadPhoto(input.photo, userId) : undefined
  const { data, error } = await supabase
    .from('reports')
    .insert({
      category: input.category,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      photo_url: photoUrl ?? null,
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
