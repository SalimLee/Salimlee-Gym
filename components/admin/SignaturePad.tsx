'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignaturePadProps {
  label: string
  signatureRef?: React.MutableRefObject<(() => string | null) | null>
  height?: number
}

export function SignaturePad({ label, signatureRef, height = 150 }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)

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

  // Expose a function to read the current signature on-demand
  // This avoids all event listener issues with signature_pad's pointer capture
  useEffect(() => {
    if (!signatureRef) return
    signatureRef.current = () => {
      if (sigRef.current && !sigRef.current.isEmpty()) {
        return sigRef.current.getTrimmedCanvas().toDataURL('image/png')
      }
      return null
    }
    return () => {
      if (signatureRef) signatureRef.current = null
    }
  }, [signatureRef, canvasWidth])

  const handleClear = useCallback(() => {
    sigRef.current?.clear()
  }, [])

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
