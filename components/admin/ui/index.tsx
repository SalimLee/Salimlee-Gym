'use client'

import { useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type ButtonHTMLAttributes } from 'react'

// ───────────────────────────────────────────────────────────────────────────
// Reusable Admin UI Primitives — Light Mode, Salim-Lee-Brand, Voltagent-Sprache
// Hairline borders, no shadows, calm typography, sharp 6/8px corners.
// ───────────────────────────────────────────────────────────────────────────

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  emphasized?: boolean
  padded?: boolean
}
export function Card({ children, className = '', emphasized = false, padded = true }: CardProps) {
  return (
    <div className={`${emphasized ? 'admin-card-emphasized' : 'admin-card'} ${padded ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}
export function CardHeader({ title, description, eyebrow, actions, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        {eyebrow && <p className="admin-eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="admin-h2">{title}</h2>
        {description && <p className="admin-body mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  children?: ReactNode
}
export function Button({
  variant = 'outline',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'admin-btn-primary' :
    variant === 'outline' ? 'admin-btn-outline' :
    variant === 'ghost' ? 'admin-btn-ghost' :
    variant === 'danger' ? 'admin-btn-danger' :
    'admin-btn-success'
  const sizeClass = size === 'sm' ? 'admin-btn-sm' : ''
  return (
    <button {...rest} className={`${variantClass} ${sizeClass} ${className}`}>
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}
export function IconButton({ children, className = '', ...rest }: IconButtonProps) {
  return <button {...rest} className={`admin-btn-icon ${className}`}>{children}</button>
}

// ── Inputs ─────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  rightAction?: ReactNode
}
export function Input({ leftIcon, rightAction, className = '', ...rest }: InputProps) {
  if (!leftIcon && !rightAction) {
    return <input {...rest} className={`admin-input ${className}`} />
  }
  return (
    <div className="relative">
      {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-mute">{leftIcon}</span>}
      <input {...rest} className={`admin-input ${leftIcon ? 'pl-9' : ''} ${rightAction ? 'pr-9' : ''} ${className}`} />
      {rightAction && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightAction}</span>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Suchen...', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      leftIcon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}
export function Select({ children, className = '', ...rest }: SelectProps) {
  return <select {...rest} className={`admin-select ${className}`}>{children}</select>
}

export function Checkbox({ checked, onChange, indeterminate = false, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; indeterminate?: boolean; ariaLabel?: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate }}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel}
      className="admin-checkbox"
    />
  )
}

// ── Badges / Status ────────────────────────────────────────────────────────

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'

export function Badge({ tone = 'neutral', children, dot = false }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  const className =
    tone === 'success' ? 'admin-badge-success' :
    tone === 'warning' ? 'admin-badge-warning' :
    tone === 'danger' ? 'admin-badge-danger' :
    tone === 'info' ? 'admin-badge-info' :
    tone === 'brand' ? 'admin-badge-brand' :
    'admin-badge-neutral'
  const dotColor =
    tone === 'success' ? 'bg-status-success' :
    tone === 'warning' ? 'bg-status-warning' :
    tone === 'danger' ? 'bg-status-danger' :
    tone === 'info' ? 'bg-status-info' :
    tone === 'brand' ? 'bg-brand-500' :
    'bg-status-neutral'
  return (
    <span className={className}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && <div className="w-12 h-12 rounded-full bg-admin-surface-soft flex items-center justify-center mb-3 text-admin-mute">{icon}</div>}
      <p className="admin-h3 text-admin-ink-strong">{title}</p>
      {description && <p className="admin-body mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── KPI Tile ───────────────────────────────────────────────────────────────

export function KpiTile({
  label,
  value,
  delta,
  deltaTone,
  hint,
  icon,
  onClick,
}: {
  label: string
  value: string | number
  delta?: string
  deltaTone?: 'success' | 'danger' | 'neutral'
  hint?: string
  icon?: ReactNode
  onClick?: () => void
}) {
  const deltaColor =
    deltaTone === 'success' ? 'text-status-success' :
    deltaTone === 'danger' ? 'text-status-danger' :
    'text-admin-mute'
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`admin-card p-4 text-left flex flex-col gap-1 ${onClick ? 'hover:border-admin-mute transition-colors cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="admin-eyebrow">{label}</p>
        {icon && <span className="text-admin-mute">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-admin-ink-strong">{value}</p>
        {delta && <span className={`text-[12px] font-semibold ${deltaColor}`}>{delta}</span>}
      </div>
      {hint && <p className="admin-caption">{hint}</p>}
    </Wrapper>
  )
}

// ── Toolbar ────────────────────────────────────────────────────────────────

export function Toolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-2 flex-wrap ${className}`}>{children}</div>
}

// ── Sort Header ────────────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc' | null

export function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  direction: SortDir
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 hover:text-admin-ink transition-colors ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      <span className="text-admin-mute">
        {!active ? (
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
        ) : direction === 'asc' ? (
          <svg className="w-3 h-3 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
        ) : (
          <svg className="w-3 h-3 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        )}
      </span>
    </button>
  )
}

// ── Hook: sortable list ────────────────────────────────────────────────────

export function useSort<T>(items: T[], defaultKey: keyof T | null = null, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const setSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
      if (sortDir === 'desc') setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortKey && sortDir
    ? [...items].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
        const as = String(av).toLowerCase()
        const bs = String(bv).toLowerCase()
        return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
      })
    : items

  const isActive = (k: keyof T) => sortKey === k
  const dirOf = (k: keyof T): SortDir => (sortKey === k ? sortDir : null)
  return { sorted, isActive, dirOf, setSort }
}

// ── Snackbar ───────────────────────────────────────────────────────────────

export function Snackbar({ message, tone = 'success' }: { message: string; tone?: 'success' | 'danger' | 'info' }) {
  const toneClass =
    tone === 'success' ? 'bg-status-success-soft text-status-success border-status-success-border' :
    tone === 'danger' ? 'bg-status-danger-soft text-status-danger border-status-danger-border' :
    'bg-status-info-soft text-status-info border-status-info-border'
  return (
    <div
      role="status"
      className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-card border shadow-lg ${toneClass}`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <div className="flex items-center gap-2 text-[13px] font-medium">
        <span>{tone === 'success' ? '✓' : tone === 'danger' ? '✕' : 'ℹ'}</span>
        <span>{message}</span>
      </div>
    </div>
  )
}
