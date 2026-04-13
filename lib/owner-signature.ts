/**
 * Persistente Speicherung der Inhaber-Unterschrift im Browser (localStorage).
 * So muss der Admin nicht bei jedem Vertrag neu unterschreiben.
 */

const STORAGE_KEY = 'salim-lee-owner-signature'

export function loadOwnerSignature(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveOwnerSignature(dataUrl: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, dataUrl)
  } catch (e) {
    console.warn('Konnte Unterschrift nicht speichern:', e)
  }
}

export function clearOwnerSignature(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}

/**
 * Lädt eine Bild-Datei (PNG/JPG) und gibt sie als base64 Data URL zurück.
 * Wird für den Upload einer eingescannten Unterschrift verwendet.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Ungültiges Dateiformat'))
    }
    reader.onerror = () => reject(reader.error || new Error('Lesefehler'))
    reader.readAsDataURL(file)
  })
}
