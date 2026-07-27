/**
 * Geteiltes E-Mail-Template für die Vertrags-Erinnerung (Mindestlaufzeit endet bald →
 * Mitgliedschaft läuft automatisch monatlich kündbar weiter). Genutzt von der manuellen
 * Route und vom automatischen Cron — damit beide identisch aussehen.
 */
export function buildContractReminderEmail(params: {
  memberName: string
  subscriptionName?: string | null
  endDate?: string | null
}): { subject: string; html: string } {
  const { memberName, subscriptionName, endDate } = params
  const endeDE = endDate
    ? new Date(endDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;background:#09090b;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#18181b;border-radius:16px;overflow:hidden;border:1px solid rgba(176,0,0,0.3)">
    <div style="background:linear-gradient(to right,#b00000,#900000);padding:30px;text-align:center">
      <div style="font-size:32px;font-weight:900;color:#fff">SALIM LEE</div>
      <div style="color:#fff;letter-spacing:3px;font-size:12px;opacity:.9">BOXING &amp; FITNESS GYM</div>
    </div>
    <div style="padding:40px 30px">
      <h2 style="color:#ffa500;margin:0 0 10px">Dein Vertrag läuft bald aus</h2>
      <p style="color:#a1a1aa;line-height:1.8">Hallo <strong style="color:#fafafa">${memberName}</strong>,<br><br>
      deine <strong style="color:#fafafa">Mindestvertragslaufzeit</strong>${subscriptionName ? ` für <strong style="color:#fafafa">${subscriptionName}</strong>` : ''}
      ${endeDE ? `endet am <strong style="color:#fafafa">${endeDE}</strong>` : 'endet bald'}.</p>
      <div style="background:#0f2a1a;border:1px solid #1f5c3a;border-radius:10px;padding:16px 18px;margin:18px 0">
        <p style="color:#7ee2a8;margin:0;line-height:1.7">✔ Gute Nachricht: Deine Mitgliedschaft läuft <strong>automatisch weiter</strong> — ab dann
        <strong>monatlich kündbar</strong> (die Mindestlaufzeit ist erfüllt). Du musst nichts tun, um weiter zu trainieren.</p>
      </div>
      <p style="color:#a1a1aa;line-height:1.8">Möchtest du ein <strong style="color:#fafafa">neues Angebot</strong> oder einen neuen Vertrag
      (z.B. mit besseren Konditionen)? Oder hast du Fragen? Melde dich einfach bei uns:</p>
      <div style="text-align:center;margin:26px 0">
        <a href="mailto:info@salimlee-gym.de" style="display:inline-block;padding:14px 34px;background:linear-gradient(to right,#b00000,#900000);color:#fff;font-weight:bold;text-decoration:none;border-radius:8px">Coach kontaktieren</a>
      </div>
      <p style="color:#a1a1aa;line-height:1.8">Oder telefonisch: <strong style="color:#fafafa">+49 151 68457943</strong> ·
      <a href="mailto:info@salimlee-gym.de" style="color:#b00000">info@salimlee-gym.de</a></p>
      <p style="color:#a1a1aa;margin-top:24px">Sportliche Grüße,<br><strong style="color:#b00000">Dein Salim Lee Team</strong></p>
    </div>
    <div style="background:#09090b;padding:20px;text-align:center;color:#71717a;font-size:12px">Wörthstrasse 17, 72764 Reutlingen</div>
  </div></body></html>`

  return { subject: 'Deine Mindestlaufzeit endet bald – Salim Lee Gym', html }
}
