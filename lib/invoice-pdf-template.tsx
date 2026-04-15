import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  gymName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#b00000' },
  gymSub: { fontSize: 8, color: '#666', letterSpacing: 2, marginTop: 2 },
  gymAddress: { fontSize: 8, color: '#666', marginTop: 8, lineHeight: 1.5 },
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoBlock: {},
  infoLabel: { fontSize: 8, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: 'row', borderBottom: '1 solid #e0e0e0', paddingBottom: 6, marginBottom: 6 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottom: '0.5 solid #f0f0f0' },
  colDesc: { flex: 1 },
  colAmount: { width: 100, textAlign: 'right' },
  thText: { fontSize: 8, color: '#999', fontFamily: 'Helvetica-Bold' },
  totalRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTop: '2 solid #1a1a1a' },
  totalLabel: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 12 },
  totalValue: { width: 100, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 14 },
  statusBadge: { marginTop: 20, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, alignSelf: 'flex-start' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '0.5 solid #e0e0e0', paddingTop: 10, fontSize: 7, color: '#999', textAlign: 'center' },
})

interface InvoicePDFProps {
  invoiceNumber: string
  memberName: string
  description: string
  amount: number
  dueDate: string
  paidDate?: string | null
  status: string
  createdAt: string
  notes?: string | null
}

function formatDateDE(date: string) {
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function InvoicePDFDocument(props: InvoicePDFProps) {
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: '#dcfce7', text: '#166534', label: 'Bezahlt' },
    open: { bg: '#fef9c3', text: '#854d0e', label: 'Offen' },
    overdue: { bg: '#fecaca', text: '#991b1b', label: 'Überfällig' },
    cancelled: { bg: '#e5e5e5', text: '#525252', label: 'Storniert' },
  }
  const sc = statusColors[props.status] || statusColors.open

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.gymName}>SALIM LEE</Text>
            <Text style={styles.gymSub}>BOXING & FITNESS GYM</Text>
            <Text style={styles.gymAddress}>
              Wörthstrasse 17{'\n'}72764 Reutlingen{'\n'}info@salimlee-gym.de{'\n'}+49 151 68457943
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>RECHNUNG</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>{props.invoiceNumber}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>RECHNUNGSEMPFÄNGER</Text>
            <Text style={styles.infoValue}>{props.memberName}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>RECHNUNGSDATUM</Text>
            <Text style={styles.infoValue}>{formatDateDE(props.createdAt)}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>FÄLLIG AM</Text>
            <Text style={styles.infoValue}>{formatDateDE(props.dueDate)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colDesc]}>BESCHREIBUNG</Text>
            <Text style={[styles.thText, styles.colAmount]}>BETRAG</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>{props.description}</Text>
            <Text style={styles.colAmount}>{props.amount.toFixed(2)} €</Text>
          </View>
          {props.notes && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 8, color: '#999' }}>Hinweis: {props.notes}</Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Gesamtbetrag</Text>
          <Text style={styles.totalValue}>{props.amount.toFixed(2)} €</Text>
        </View>

        {/* Status */}
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={{ color: sc.text, fontFamily: 'Helvetica-Bold', fontSize: 10 }}>
            {sc.label}
            {props.paidDate ? ` am ${formatDateDE(props.paidDate)}` : ''}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Salim Lee Boxing & Fitness Gym · Wörthstrasse 17 · 72764 Reutlingen</Text>
        </View>
      </Page>
    </Document>
  )
}
