import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'

// Types
export interface ContractData {
  // Mitgliedsdaten
  vorname: string
  nachname: string
  strasse: string
  plzOrt: string
  telefon: string
  email: string
  geburtsdatum: string
  notfallkontakt: string

  // Mitgliedschaft
  mitgliedschaft: string

  // Zahlungsweise
  zahlungsweise: string
  vertragsbeginn: string

  // SEPA
  kontoinhaber: string
  iban: string
  bic: string
  bank: string

  // Foto-Einwilligung
  fotoEinwilligung: boolean

  // Unterschriften (base64 data URLs)
  unterschriftMitglied?: string
  unterschriftErziehungsberechtigter?: string
  unterschriftInhaber?: string

  // Datum/Ort
  ortDatum: string
}

// Membership options
export const MEMBERSHIP_OPTIONS = [
  { id: 'erwachsene_6', label: 'Erwachsene & Jugendliche – 6 Monate', price: '90 Euro/Monat' },
  { id: 'erwachsene_12', label: 'Erwachsene & Jugendliche – 12 Monate', price: '80 Euro/Monat' },
  { id: 'kinder_12', label: 'Kinder (3–14 Jahre) – 12 Monate', price: '50 Euro/Monat' },
  { id: 'monatlich', label: 'Monatlich kündbar', price: '120 Euro/Monat' },
  { id: '10er_karte', label: '10er Karte – 6 Monate gültig', price: '160 Euro Einmalzahlung' },
]

export const PAYMENT_OPTIONS = [
  { id: 'sepa_monatlich', label: 'SEPA-Lastschrift monatlich' },
  { id: 'barzahlung', label: 'Barzahlung der kompletten Laufzeit' },
  { id: 'sepa_vorauszahlung', label: 'SEPA-Vorauszahlung der kompletten Laufzeit' },
]

const BRAND_RED = '#b00000'
const DARK_BG = '#1a1a1a'
const LIGHT_GRAY = '#f5f5f5'
const MID_GRAY = '#666666'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },
  // Header
  header: {
    backgroundColor: DARK_BG,
    marginHorizontal: -40,
    marginTop: -30,
    paddingVertical: 25,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 10,
    color: BRAND_RED,
    letterSpacing: 4,
    marginTop: 4,
  },
  headerLine: {
    width: 50,
    height: 2,
    backgroundColor: BRAND_RED,
    marginTop: 15,
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 15,
  },
  sectionDot: {
    width: 10,
    height: 10,
    backgroundColor: BRAND_RED,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  // Form fields
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 9,
    color: MID_GRAY,
    width: 120,
  },
  fieldValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
    borderBottom: '1px solid #cccccc',
    paddingBottom: 2,
    minHeight: 14,
  },
  // Ehrenkodex
  ehrenkodexRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  ehrenkodexNum: {
    width: 18,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_RED,
  },
  ehrenkodexText: {
    flex: 1,
    fontSize: 8,
  },
  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottom: '1px solid #eeeeee',
  },
  checkbox: {
    width: 12,
    height: 12,
    border: '1.5px solid #999999',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    border: `1.5px solid ${BRAND_RED}`,
    backgroundColor: BRAND_RED,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 9,
  },
  checkboxPrice: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // AGB
  agbTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    marginTop: 8,
  },
  agbText: {
    fontSize: 7.5,
    lineHeight: 1.5,
    color: '#333333',
    marginBottom: 4,
  },
  // Signature
  signatureBox: {
    borderBottom: '1px solid #999999',
    minHeight: 50,
    marginBottom: 5,
    marginTop: 5,
  },
  signatureImage: {
    height: 50,
    objectFit: 'contain',
  },
  signatureLabel: {
    fontSize: 8,
    color: MID_GRAY,
    marginBottom: 3,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: '1px solid #cccccc',
    paddingTop: 8,
    fontSize: 7,
    color: MID_GRAY,
    textAlign: 'center',
  },
  footerBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
  },
  hint: {
    fontSize: 8,
    color: BRAND_RED,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
})

const EHRENKODEX = [
  'Respekt beginnt bei mir.',
  'Ich schütze meinen Trainingspartner wie mich selbst.',
  'Ich kämpfe, um mich zu beherrschen – nicht, um zu dominieren.',
  'Ich baue auf, nicht ab.',
  'Mein Wort ist mein Vertrag.',
  'Mein Ego bleibt draußen.',
  'Ich kontrolliere meine Kraft und höre auf meine Trainer.',
  'Die Disziplin hier trage ich in mein Leben.',
  'Der wahre Kampf beginnt im Kopf.',
  'Ich bin verantwortlich für das, was ich werde.',
]

const AGB_SECTIONS = [
  {
    title: '1. Geltungsbereich',
    text: 'Diese AGB gelten für alle Mitgliedschaften, Trainingsangebote und die Nutzung der Räumlichkeiten des Salim Lee Boxing & Fitness Gym.',
  },
  {
    title: '2. Mitgliedschaft & Vertragslaufzeiten',
    text: 'Die Mitgliedschaft ist personengebunden und nicht übertragbar. Die Vertragslaufzeit beginnt mit dem vereinbarten Startdatum. Nach Ablauf der Mindestlaufzeit verlängert sich der Vertrag automatisch um jeweils einen Monat, sofern nicht fristgerecht gekündigt wird.',
  },
  {
    title: '3. Kündigung',
    text: 'Die Kündigung ist schriftlich, per E-Mail oder persönlich möglich. Kündigungsfrist: 14 Tage zum Monatsende. Laufzeitverträge enden automatisch, sofern nicht verlängert.',
  },
  {
    title: '4. Zahlungsbedingungen',
    text: 'Beiträge sind monatlich im Voraus fällig. Bei Zahlungsverzug kann eine Sperrung/Kündigung erfolgen. Mahngebühr: 5 Euro. Rückbuchungskosten trägt das Mitglied.',
  },
  {
    title: '5. Sonderkündigung',
    text: 'Eine Sonderkündigung ist möglich bei Umzug über 30 km (Nachweis erforderlich) oder bei Krankheit (ärztliches Attest erforderlich).',
  },
  {
    title: '6. Gesundheitszustand',
    text: 'Das Mitglied bestätigt sportliche Tauglichkeit. Training erfolgt auf eigene Verantwortung. Eine ärztliche Bescheinigung kann verlangt werden. Bei Problemen ist das Training sofort abzubrechen.',
  },
  {
    title: '7. Hausordnung & Ehrenkodex',
    text: 'Respekt, Disziplin und gegenseitige Rücksichtnahme sind Pflicht. Sparring nur mit Erlaubnis und Schutzausrüstung. Bei Vertragsverletzung oder Fehlverhalten kann ein Studioausschluss erfolgen.',
  },
  {
    title: '8. Kinder & Jugendliche',
    text: 'Kindertraining ab 3 Jahren. Minderjährige benötigen die Unterschrift eines Erziehungsberechtigten. Mutwillige Schäden werden berechnet.',
  },
  {
    title: '9. Widerrufsrecht',
    text: 'Vor Ort: kein Widerrufsrecht. Online-Verträge: 14 Tage Widerruf (§ 312g BGB).',
  },
  {
    title: '10. Haftung',
    text: 'Keine Haftung für Wertgegenstände. Haftung nur bei Vorsatz oder grober Fahrlässigkeit. Eltern haften für ihre Kinder.',
  },
  {
    title: '11. Servicepauschale',
    text: 'Es wird eine Servicepauschale von 30 Euro alle 6 Monate automatisch eingezogen. Diese deckt Verwaltungs- und Instandhaltungskosten.',
  },
  {
    title: '12. Änderungen der AGB',
    text: 'Änderungen werden 4 Wochen vorher schriftlich mitgeteilt. 30 Tage Widerspruchsrecht.',
  },
  {
    title: '13. Schlussbestimmungen',
    text: 'Gerichtsstand: Reutlingen. Unwirksame Klauseln bleiben im Übrigen unberührt.',
  },
]

const OWNER_INFO = {
  name: 'Salim Lee Boxing & Fitness Gym',
  inhaber: 'Saleem Fahmi Muhammad Shareef',
  strasse: 'Wörthstrasse 17',
  plz: '72764 Reutlingen',
  email: 'info@salimlee-gym.de',
  tel: '+49 151 68457943',
}

function PageFooter({ pageNum, totalPages }: { pageNum: number; totalPages: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerBold}>
        {OWNER_INFO.name} | Inhaber: {OWNER_INFO.inhaber} | Seite {pageNum}/{totalPages}
      </Text>
      <Text>
        {OWNER_INFO.strasse}, {OWNER_INFO.plz} | E-Mail: {OWNER_INFO.email} | Tel: {OWNER_INFO.tel}
      </Text>
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionDot} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

function CheckboxItem({
  label,
  price,
  checked,
}: {
  label: string
  price?: string
  checked: boolean
}) {
  return (
    <View style={styles.checkboxRow}>
      <View style={checked ? styles.checkboxChecked : styles.checkbox}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
      {price && <Text style={styles.checkboxPrice}>{price}</Text>}
    </View>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || ' '}</Text>
    </View>
  )
}

// Page 1: Mitgliedsdaten, Ehrenkodex, Mitgliedschaft, Zahlungsweise
function Page1({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SALIM LEE</Text>
        <Text style={styles.headerSubtitle}>BOXING & FITNESS GYM</Text>
      </View>

      <View style={styles.headerLine} />
      <Text style={styles.pageTitle}>MITGLIEDSCHAFTSVERTRAG</Text>

      {/* Mitgliedsdaten */}
      <SectionHeader title="Mitgliedsdaten" />
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ flex: 1 }}>
          <FieldRow label="Vorname:" value={data.vorname} />
          <FieldRow label="Straße / Hausnr.:" value={data.strasse} />
          <FieldRow label="Telefon:" value={data.telefon} />
          <FieldRow label="Geburtsdatum:" value={data.geburtsdatum} />
        </View>
        <View style={{ flex: 1 }}>
          <FieldRow label="Nachname:" value={data.nachname} />
          <FieldRow label="PLZ / Ort:" value={data.plzOrt} />
          <FieldRow label="E-Mail:" value={data.email} />
          <FieldRow label="Notfallkontakt:" value={data.notfallkontakt} />
        </View>
      </View>

      {/* Ehrenkodex */}
      <SectionHeader title="Ehrenkodex" />
      <View style={{ flexDirection: 'row', gap: 15 }}>
        <View style={{ flex: 1 }}>
          {EHRENKODEX.slice(0, 5).map((item, i) => (
            <View key={i} style={styles.ehrenkodexRow}>
              <Text style={styles.ehrenkodexNum}>{i + 1}.</Text>
              <Text style={styles.ehrenkodexText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {EHRENKODEX.slice(5).map((item, i) => (
            <View key={i} style={styles.ehrenkodexRow}>
              <Text style={styles.ehrenkodexNum}>{i + 6}.</Text>
              <Text style={styles.ehrenkodexText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Mitgliedschaft wählen */}
      <SectionHeader title="Mitgliedschaft wählen" />
      <View style={{ border: '1px solid #eeeeee' }}>
        {MEMBERSHIP_OPTIONS.map((opt) => (
          <CheckboxItem
            key={opt.id}
            label={opt.label}
            price={opt.price}
            checked={data.mitgliedschaft === opt.id}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Hinweis: Zusätzlich wird eine Servicepauschale von 30 Euro alle 6 Monate automatisch eingezogen.
      </Text>

      {/* Zahlungsweise */}
      <SectionHeader title="Zahlungsweise" />
      <View style={{ border: '1px solid #eeeeee' }}>
        {PAYMENT_OPTIONS.map((opt) => (
          <CheckboxItem
            key={opt.id}
            label={opt.label}
            checked={data.zahlungsweise === opt.id}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginRight: 10 }}>Vertragsbeginn:</Text>
        <Text style={{ fontSize: 9, borderBottom: '1px solid #cccccc', paddingBottom: 2, minWidth: 120 }}>
          {data.vertragsbeginn || ' '}
        </Text>
      </View>

      <PageFooter pageNum={1} totalPages={4} />
    </Page>
  )
}

// Page 2: AGB + SEPA
function Page2({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="Allgemeine Geschäftsbedingungen (AGB)" />
      {AGB_SECTIONS.map((section) => (
        <View key={section.title}>
          <Text style={styles.agbTitle}>{section.title}</Text>
          <Text style={styles.agbText}>{section.text}</Text>
        </View>
      ))}

      {/* SEPA */}
      <SectionHeader title="SEPA-Lastschriftmandat" />
      <Text style={{ fontSize: 8, marginBottom: 8, color: '#333333' }}>
        Ich ermächtige das Salim Lee Boxing & Fitness Gym, Zahlungen mittels SEPA-Lastschrift einzuziehen.
      </Text>
      <FieldRow label="Kontoinhaber:" value={data.kontoinhaber} />
      <FieldRow label="IBAN:" value={data.iban} />
      <FieldRow label="BIC:" value={data.bic} />
      <FieldRow label="Bank:" value={data.bank} />

      <View style={{ flexDirection: 'row', marginTop: 15, gap: 30 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.signatureLabel}>Datum:</Text>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 9, paddingTop: 3 }}>{data.ortDatum}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.signatureLabel}>Unterschrift Kontoinhaber:</Text>
          <View style={styles.signatureBox}>
            {data.unterschriftMitglied && (
              <Image style={styles.signatureImage} src={data.unterschriftMitglied} />
            )}
          </View>
        </View>
      </View>

      <PageFooter pageNum={2} totalPages={4} />
    </Page>
  )
}

// Page 3: DSGVO + Foto-Einwilligung
function Page3({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="Datenschutzerklärung (DSGVO)" />

      <Text style={styles.agbTitle}>Verantwortlicher</Text>
      <Text style={styles.agbText}>
        {OWNER_INFO.name}, Inhaber: {OWNER_INFO.inhaber}, {OWNER_INFO.strasse}, {OWNER_INFO.plz}, E-Mail: {OWNER_INFO.email}, Tel: {OWNER_INFO.tel}
      </Text>

      <Text style={styles.agbTitle}>Zweck der Datenverarbeitung</Text>
      <Text style={styles.agbText}>
        Ihre personenbezogenen Daten werden ausschließlich zum Zweck der Vertragsdurchführung und -verwaltung, der Abwicklung von Zahlungen (SEPA-Lastschrift), der Kommunikation im Rahmen der Mitgliedschaft, der Erfüllung gesetzlicher Aufbewahrungspflichten sowie zur Gewährleistung der Sicherheit im Trainingsbetrieb verarbeitet.
      </Text>

      <Text style={styles.agbTitle}>Rechtsgrundlage</Text>
      <Text style={styles.agbText}>
        Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchführung), Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Verpflichtung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, z.B. für Foto-/Videoaufnahmen).
      </Text>

      <Text style={styles.agbTitle}>Empfänger der Daten</Text>
      <Text style={styles.agbText}>
        Ihre Daten werden weitergegeben an: das kontoführende Kreditinstitut (für SEPA-Lastschriften), ggf. Steuerberater (gesetzliche Pflicht), ggf. IT-Dienstleister (Auftragsverarbeitung mit AVV). Eine Weitergabe an Dritte zu Werbezwecken erfolgt nicht.
      </Text>

      <Text style={styles.agbTitle}>Speicherdauer</Text>
      <Text style={styles.agbText}>
        Ihre Daten werden für die Dauer der Mitgliedschaft und darüber hinaus für die gesetzlich vorgeschriebenen Aufbewahrungsfristen (i.d.R. 6–10 Jahre nach Vertragsende gemäß HGB/AO) gespeichert. Danach werden die Daten gelöscht.
      </Text>

      <Text style={styles.agbTitle}>Ihre Rechte</Text>
      <Text style={styles.agbText}>
        Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch (Art. 21 DSGVO). Erteilte Einwilligungen können jederzeit widerrufen werden.
      </Text>

      <Text style={styles.agbTitle}>Beschwerderecht</Text>
      <Text style={styles.agbText}>
        Sie haben das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren: Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg, Lautenschlagerstr. 20, 70173 Stuttgart, poststelle@lfdi.bwl.de
      </Text>

      <CheckboxItem label="Ich habe die Datenschutzerklärung gelesen und verstanden." checked={true} />

      {/* Foto-Einwilligung */}
      <SectionHeader title="Einwilligung Foto- und Videoaufnahmen (freiwillig)" />
      <Text style={styles.agbText}>
        Im Rahmen des Trainingsbetriebs können Foto- und Videoaufnahmen zu Zwecken der Öffentlichkeitsarbeit (z.B. Website, Social Media, Flyer) erstellt werden. Diese Einwilligung ist freiwillig und hat keinen Einfluss auf Ihre Mitgliedschaft. Sie kann jederzeit schriftlich oder per E-Mail widerrufen werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
      </Text>

      <CheckboxItem
        label="Ja, ich willige in Foto-/Videoaufnahmen zu den genannten Zwecken ein."
        checked={data.fotoEinwilligung === true}
      />
      <CheckboxItem
        label="Nein, ich möchte nicht fotografiert/gefilmt werden."
        checked={data.fotoEinwilligung === false}
      />

      <View style={{ flexDirection: 'row', marginTop: 15, gap: 30 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.signatureLabel}>Datum:</Text>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 9, paddingTop: 3 }}>{data.ortDatum}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.signatureLabel}>Unterschrift:</Text>
          <View style={styles.signatureBox}>
            {data.unterschriftMitglied && (
              <Image style={styles.signatureImage} src={data.unterschriftMitglied} />
            )}
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 7, color: BRAND_RED, fontStyle: 'italic', marginTop: 5 }}>
        Diese Einwilligung ist freiwillig. Eine Nicht-Einwilligung hat keine Auswirkung auf Ihre Mitgliedschaft.
      </Text>

      <PageFooter pageNum={3} totalPages={4} />
    </Page>
  )
}

// Page 4: Widerrufsbelehrung + Bestätigung & Unterschriften
function Page4({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="Widerrufsbelehrung (bei Fernabsatzverträgen)" />

      <Text style={styles.agbTitle}>Widerrufsrecht</Text>
      <Text style={styles.agbText}>
        Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsabschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung (z.B. per E-Mail oder Brief) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
      </Text>

      <Text style={styles.agbTitle}>Folgen des Widerrufs</Text>
      <Text style={styles.agbText}>
        Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen 14 Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
      </Text>

      <Text style={styles.agbTitle}>Adresse für den Widerruf</Text>
      <Text style={styles.agbText}>
        {OWNER_INFO.name}, {OWNER_INFO.inhaber}, {OWNER_INFO.strasse}, {OWNER_INFO.plz}, E-Mail: {OWNER_INFO.email}
      </Text>

      <Text style={styles.agbTitle}>Hinweis</Text>
      <Text style={styles.agbText}>
        Das Widerrufsrecht besteht nicht bei Verträgen, die in den Geschäftsräumen des Unternehmers abgeschlossen wurden (§ 312g Abs. 2 BGB).
      </Text>

      {/* Bestätigung */}
      <SectionHeader title="Bestätigung & Unterschriften" />
      <View style={{ border: '1px solid #eeeeee', marginBottom: 10 }}>
        <CheckboxItem label="Ich habe die AGB gelesen und akzeptiere diese." checked={true} />
        <CheckboxItem label="Ich habe die Datenschutzerklärung zur Kenntnis genommen." checked={true} />
        <CheckboxItem label="Ich verpflichte mich zur Einhaltung des Ehrenkodex." checked={true} />
        <CheckboxItem label="Ich habe die Widerrufsbelehrung zur Kenntnis genommen." checked={true} />
        <CheckboxItem label="Ich bin über die Servicepauschale (30 Euro/6 Monate) informiert." checked={true} />
      </View>

      {/* Unterschrift Mitglied */}
      <View style={{ border: '1px solid #eeeeee', padding: 10, marginBottom: 8 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>Unterschrift Mitglied</Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.signatureLabel}>Ort, Datum:</Text>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 9, paddingTop: 3 }}>{data.ortDatum}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.signatureLabel}>Unterschrift:</Text>
            <View style={styles.signatureBox}>
              {data.unterschriftMitglied && (
                <Image style={styles.signatureImage} src={data.unterschriftMitglied} />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Unterschrift Erziehungsberechtigter */}
      <View style={{ border: '1px solid #eeeeee', padding: 10, marginBottom: 8 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
          Unterschrift Erziehungsberechtigte/r (bei Minderjährigen)
        </Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.signatureLabel}>Ort, Datum:</Text>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 9, paddingTop: 3 }}>{data.ortDatum}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.signatureLabel}>Unterschrift:</Text>
            <View style={styles.signatureBox}>
              {data.unterschriftErziehungsberechtigter && (
                <Image style={styles.signatureImage} src={data.unterschriftErziehungsberechtigter} />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Unterschrift Inhaber */}
      <View style={{ borderTop: `2px solid ${BRAND_RED}`, paddingTop: 10, marginTop: 5 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>
          Studio – Inhaber: {OWNER_INFO.inhaber}
        </Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.signatureLabel}>Datum / Unterschrift:</Text>
            <View style={styles.signatureBox}>
              {data.unterschriftInhaber ? (
                <Image style={styles.signatureImage} src={data.unterschriftInhaber} />
              ) : (
                <Text style={{ fontSize: 9, paddingTop: 3 }}>{data.ortDatum}</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <PageFooter pageNum={4} totalPages={4} />
    </Page>
  )
}

export function ContractPDF({ data }: { data: ContractData }) {
  return (
    <Document>
      <Page1 data={data} />
      <Page2 data={data} />
      <Page3 data={data} />
      <Page4 data={data} />
    </Document>
  )
}
