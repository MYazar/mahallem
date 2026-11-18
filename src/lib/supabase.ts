import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'mahallem.supabase.config'

export interface SupabaseConfig {
  url: string
  key: string
}

/** Kurulum ekranından girilen bağlantı bilgileri (anon anahtar herkese açıktır). */
export function getStoredConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SupabaseConfig
    if (!parsed.url || !parsed.key) return null
    return { url: parsed.url.trim(), key: parsed.key.trim() }
  } catch {
    return null
  }
}

export function saveConfig(url: string, key: string): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
}

export function hasStoredConfig(): boolean {
  return getStoredConfig() !== null
}

const stored = getStoredConfig()
const url = stored?.url ?? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
const key = stored?.key ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = (() => {
  if (!url || !key) return null
  try {
    return createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  } catch {
    return null
  }
})()
