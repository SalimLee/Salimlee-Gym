'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignaturePadProps {
  label: string
  onSignatureChange: (dataUrl: string | null) => void
  height?: number
}

export function SignaturePad({ label, onSignatureChange, height = 150 }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)

  // Measure the actual container width and use it as the canvas width
  // This prevents the offset caused by CSS width differing from canvas width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => {
      const w = container.clientWidth
      if (w > 0) setCanvasWidth(w)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleEnd = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
      onSignatureChange(dataUrl)
    }
  }, [onSignatureChange])

  const handleClear = useCallback(() => {
    sigRef.current?.clear()
    onSignatureChange(null)
  }, [onSignatureChange])

  return (
    <div>
      <label className="block text-sm font-semibold text-dark-300 mb-2">{label}</label>
      <div ref={containerRef} className="border border-dark-700 rounded-lg overflow-hidden bg-white">
        {canvasWidth > 0 && (
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{
              width: canvasWidth,
              height,
              className: 'touch-none',
            }}
            backgroundColor="white"
            penColor="black"
            minWidth={0.5}
            maxWidth={2.5}
            velocityFilterWeight={0.7}
            onEnd={handleEnd}
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="mt-2 text-xs text-dark-400 hover:text-brand-500 transition-colors"
      >
        Unterschrift löschen
      </button>
    </div>
  )
}
