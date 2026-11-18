// Görünmez temel korumalar: duyurular herkese açık olsa da
// açıkça saldırı içeren metinler ve çok sık gönderim engellenir.

const BAD_WORDS = ['spam', 'küfür', 'saldırı']

export function containsBlockedContent(text: string): boolean {
  const normalized = text.toLocaleLowerCase('tr')
  return BAD_WORDS.some((word) => normalized.includes(word))
}

const RATE_KEY = 'mahallem-submit-times'

export function canSubmitNow(limit = 5, windowMs = 60 * 60 * 1000): boolean {
  try {
    const raw = localStorage.getItem(RATE_KEY)
    const times: number[] = raw ? JSON.parse(raw) : []
    const now = Date.now()
    const recent = times.filter((time) => now - time < windowMs)
    return recent.length < limit
  } catch {
    return true
  }
}

export function recordSubmission(): void {
  try {
    const raw = localStorage.getItem(RATE_KEY)
    const times: number[] = raw ? JSON.parse(raw) : []
    const now = Date.now()
    const recent = times.filter((time) => now - time < 60 * 60 * 1000)
    recent.push(now)
    localStorage.setItem(RATE_KEY, JSON.stringify(recent))
  } catch {
    // depolama kapalıysa sessizce geç
  }
}
