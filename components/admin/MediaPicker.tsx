'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UploadCloud, X, Loader2, Image as ImageIcon, Video as VideoIcon, CheckCircle2, PlayCircle } from 'lucide-react'

// Die S3-kompatible URL nutzt die Bucket-Namen als Root-Ordner.
// Bucket Name: 'salim-lee-gym-app-storage'
// Ordner werden über die Env-Variablen bezogen.
const BUCKET_NAME = 'salim-lee-gym-app-storage'

// Fallback logic wegen potentiellem Copy-Paste Fehler in der User Env (IMAGE_DIR zweimal)
const IMAGE_DIR = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_IMAGE_DIR || 'exercise_images'
const WORKOUT_IMAGE_DIR = 'workout_plan_images'
const VIDEO_DIR = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_VIDEO_DIR || 'exercise_videos'

const FOLDERS = {
  image: [IMAGE_DIR, WORKOUT_IMAGE_DIR],
  video: [VIDEO_DIR]
}

export interface FileWithFullPath {
  id: string
  name: string
  created_at: string
  metadata: any
  fullPath: string
}

/**
 * Debug-Version: Holt rekursiv alle Dateien aus einem Supabase Bucket.
 */
async function fetchAllFiles(
  supabase: SupabaseClient,
  bucket: string,
  currentPath: string = ''
): Promise<FileWithFullPath[]> {
  console.log(`[DEBUG] fetchAllFiles gestartet. Bucket: "${bucket}", Path: "${currentPath}"`);
  
  let allFiles: FileWithFullPath[] = []

  // 1. Hole Liste vom aktuellen Pfad
  const { data, error } = await supabase.storage.from(bucket).list(currentPath, {
    limit: 1000,
  })

  // 2. Fehler prüfen
  if (error) {
    console.error(`[DEBUG ERROR] Fehler in Bucket "${bucket}" bei Pfad "${currentPath}":`, error)
    return [] // Wir brechen sicherheitshalber nicht komplett ab, geben aber leer zurück
  }

  // 3. Daten prüfen
  console.log(`[DEBUG INFO] Roh-Daten aus Bucket "${bucket}", Path "${currentPath}":`, data);
  if (!data || data.length === 0) {
    console.warn(`[DEBUG WARN] Array ist leer für Pfad "${currentPath}" im Bucket "${bucket}".`);
    return []
  }

  const directoryPromises: Promise<FileWithFullPath[]>[] = []

  for (const item of data) {
    if (item.name === '.emptyFolderPlaceholder') continue

    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name

    // 4. Ordner vs Datei Logs
    if (!item.metadata) {
      console.log(`[DEBUG FOLDER] Ordner erkannt: "${itemPath}". Gehe rekursiv rein...`);
      directoryPromises.push(fetchAllFiles(supabase, bucket, itemPath))
    } else {
      console.log(`[DEBUG FILE] Datei gefunden: "${itemPath}". Metadata:`, item.metadata);
      allFiles.push({
        id: item.id || itemPath,
        name: item.name,
        created_at: item.created_at,
        metadata: item.metadata,
        fullPath: itemPath,
      })
    }
  }

  const directoriesContent = await Promise.all(directoryPromises)
  for (const files of directoriesContent) {
    allFiles = allFiles.concat(files)
  }

  return allFiles
}

interface MediaPickerProps {
  supabase: SupabaseClient
  defaultTab?: 'image' | 'video'
  onSelect: (url: string) => void
  onClose: () => void
}

export default function MediaPicker({ supabase, defaultTab = 'image', onSelect, onClose }: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [mediaType, setMediaType] = useState<'image' | 'video'>(defaultTab)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest')
  
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  // Wenn sich der defaultTab durch Props ändert (z. B. Wechsel von Bild URL auf Video URL Auswahl)
  useEffect(() => {
    setMediaType(defaultTab)
  }, [defaultTab])

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    const foldersToFetch = FOLDERS[mediaType]
    
    console.log(`\n\n--- START FETCH FOR TAB: ${mediaType} (Bucket: ${BUCKET_NAME}, Folders: ${foldersToFetch.join(', ')}) ---`)
    
    // Rekursiv laden, gestartet von jedem Ziel-Ordner
    const fetchPromises = foldersToFetch.map(folder => fetchAllFiles(supabase, BUCKET_NAME, folder))
    const results = await Promise.all(fetchPromises)
    const validFiles = results.flat()
    
    console.log(`[DEBUG FINAL] Alle gefundenen Dateien in Ordnern "${foldersToFetch.join(', ')}":`, validFiles);
      
    // Client-seitige Sortierung (newest zuerst als Standard)
    validFiles.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'az') return a.name.localeCompare(b.name)
      return 0
    })
      
    setFiles(validFiles)
    setLoading(false)
  }, [supabase, mediaType, sortBy])

  useEffect(() => {
    if (activeTab === 'library') {
      fetchFiles()
    }
  }, [activeTab, fetchFiles])

  const getPublicUrl = (fullPath: string) => {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath)
    return data.publicUrl
  }

  const handleSelect = (fullPath: string) => {
    const url = getPublicUrl(fullPath)
    onSelect(url)
    onClose()
  }

  const handleUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    
    // Automatisch den richtigen Ziel-Ordner basierend auf Dateityp wählen
    let targetType: 'image' | 'video' = mediaType
    if (file.type.startsWith('video/')) targetType = 'video'
    else if (file.type.startsWith('image/')) targetType = 'image'

    // Automatisch den Haupt-Ordner (erster Array-Eintrag) als Upload-Ziel wählen
    const folder = FOLDERS[targetType][0]
    const fileExt = file.name.split('.').pop()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${folder}/${Date.now()}_${safeName}`

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

    if (error) {
      console.error('Upload error:', error)
      alert(`Fehler beim Hochladen in Bucket '${BUCKET_NAME}': ${error.message}\nÜberprüfe RLS (Storage Policies) für INSERT.`)
      setUploading(false)
      return
    }

    setUploading(false)
    const url = getPublicUrl(fileName)
    onSelect(url)
    onClose()
  }

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0])
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-dark-100 text-lg flex items-center gap-2">
            Medien auswählen
          </h3>
          <button onClick={onClose} className="text-dark-500 hover:text-dark-300 transition-colors bg-dark-800 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 pt-4 border-b border-dark-800 shrink-0 gap-4 pb-0">
          <div className="flex gap-2">
            <button 
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'library' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-400 hover:text-dark-200'}`}
              onClick={() => setActiveTab('library')}
            >
              Bibliothek
            </button>
            <button 
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'upload' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-400 hover:text-dark-200'}`}
              onClick={() => setActiveTab('upload')}
            >
              Hochladen
            </button>
          </div>

          {activeTab === 'library' && (
            <div className="flex items-center pb-2 gap-3 sm:pb-0 overflow-x-auto">
              <div className="flex bg-dark-800/50 p-1 rounded-lg border border-dark-700">
                <button 
                  onClick={() => setMediaType('image')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mediaType === 'image' ? 'bg-dark-700 text-brand-400 shadow-sm' : 'text-dark-400 hover:text-dark-200'}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Bilder
                </button>
                <button 
                  onClick={() => setMediaType('video')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mediaType === 'video' ? 'bg-dark-700 text-brand-400 shadow-sm' : 'text-dark-400 hover:text-dark-200'}`}
                >
                  <VideoIcon className="w-3.5 h-3.5" /> Videos
                </button>
              </div>
              
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-dark-800 border border-dark-700 text-dark-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-brand-500"
              >
                <option value="newest">Zuletzt hochgeladen</option>
                <option value="oldest">Älteste zuerst</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-dark-950/50">
          {activeTab === 'library' && (
            loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-dark-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-500 delay-150" />
                <p>Lade {mediaType === 'image' ? 'Bilder' : 'Videos'}...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-dark-900/50 rounded-2xl border border-dark-800">
                <div className="p-4 rounded-full bg-dark-800 mb-4 inline-flex">
                  {mediaType === 'image' ? <ImageIcon className="w-8 h-8 text-dark-500" /> : <VideoIcon className="w-8 h-8 text-dark-500" />}
                </div>
                <p className="font-bold text-dark-200 mb-1">Keine Dateien in {FOLDERS[mediaType].length > 1 ? 'den Ordnern' : 'dem Ordner'} '{FOLDERS[mediaType].join("' und '")}' gefunden</p>
                <p className="text-sm text-dark-500 mb-4 max-w-sm mx-auto">
                  Entweder sind die Ordner leer oder deine Zugangsberechtigungen verhindern das Laden im Bucket '{BUCKET_NAME}'. (Schau in die Browser Konsole für Logs!)
                </p>
                <button onClick={() => setActiveTab('upload')} className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20">Jetzt hochladen</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((file: FileWithFullPath) => {
                  const url = getPublicUrl(file.fullPath)
                  return (
                    <div 
                      key={file.id} 
                      onClick={() => mediaType === 'image' ? handleSelect(file.fullPath) : setPreviewVideoUrl(url)}
                      className="group relative bg-dark-900 border border-dark-700 rounded-xl overflow-hidden aspect-square cursor-pointer hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10 transition-all flex flex-col"
                    >
                      {mediaType === 'image' ? (
                        <div className="w-full h-full bg-dark-800 relative">
                          <img src={url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-dark-800 relative group/video flex items-center justify-center">
                          <video 
                            src={url} 
                            className="w-full h-full object-cover absolute inset-0" 
                            preload="metadata"
                            muted
                            playsInline
                            onMouseEnter={(e) => { e.currentTarget.play().catch(()=>console.log('Autoplay prevented')) }}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/40 transition-colors">
                            <div className="text-white bg-black/50 rounded-full p-2 backdrop-blur-md shadow-xl transform group-hover/video:scale-110 flex items-center justify-center">
                              <PlayCircle className="w-10 h-10" />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Name Label */}
                      <div className="p-2 bg-dark-900 absolute bottom-0 left-0 right-0 border-t border-dark-800 backdrop-blur-md bg-dark-900/90">
                        <p className="text-[10px] text-dark-300 truncate font-medium text-center" title={file.fullPath}>{file.name}</p>
                      </div>
                      
                      <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10">
                        <div className="bg-brand-500 text-white p-2 rounded-full transform scale-50 group-hover:scale-100 transition-transform shadow-xl">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {activeTab === 'upload' && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div 
                className={`w-full max-w-lg p-10 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-center transition-all ${
                  dragActive ? 'border-brand-500 bg-brand-500/10 scale-105' : 'border-dark-700 bg-dark-900/50 hover:border-dark-500 hover:bg-dark-800/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploading ? (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <p className="text-dark-100 font-bold text-lg">Wird hochgeladen...</p>
                    <p className="text-sm text-dark-400 mt-2">Bitte warte einen Moment, die URL wird anschließend gespeichert.</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mb-4 text-dark-400 shadow-xl">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-dark-100 mb-2">Drag & Drop zum Hochladen</p>
                    <p className="text-sm text-dark-400 mb-6">Ziehe eine Datei hierhin oder klicke, um eine auszuwählen.<br/><span className="text-xs text-dark-500">Ziellaufwerk (Bucket) wird automatisch anhand des Dateityps ermittelt.</span></p>
                    <label className="px-6 py-3 bg-brand-500 hover:bg-brand-400 cursor-pointer text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95">
                      Datei auswählen
                      <input type="file" className="hidden" accept="image/*,video/*" onChange={handleChange} />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Preview Modal */}
        {previewVideoUrl && (
          <div className="absolute inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center rounded-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute top-6 right-6 text-dark-300 hover:text-white bg-dark-800/50 hover:bg-dark-700 p-2 rounded-full transition-all z-[80]"
              title="Schließen"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center relative">
               <video 
                 src={previewVideoUrl}
                 controls
                 autoPlay
                 className="w-full max-h-[70vh] object-contain rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-black"
               />
               <div className="mt-8 flex gap-4">
                 <button 
                   onClick={() => setPreviewVideoUrl(null)}
                   className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white font-bold rounded-xl transition-all"
                 >
                   Zurück zur Bibliothek
                 </button>
                 <button 
                   onClick={() => {
                     onSelect(previewVideoUrl);
                     onClose();
                   }}
                   className="px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2"
                 >
                   <CheckCircle2 className="w-5 h-5" /> Dieses Video auswählen
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
