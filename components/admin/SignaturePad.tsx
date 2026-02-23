'use client'

import { useRef, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignaturePadProps {
  label: string
  onSignatureChange: (dataUrl: string | null) => void
  width?: number
  height?: number
}

export function SignaturePad({ label, onSignatureChange, width = 400, height = 150 }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null)

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
      <div className="border border-dark-700 rounded-lg overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width,
            height,
            className: 'w-full',
            style: { width: '100%', height: `${height}px` },
          }}
          backgroundColor="white"
          penColor="black"
          onEnd={handleEnd}
        />
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
