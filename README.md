# 🥊 Salim Lee Boxing & Fitness Gym

Eine moderne, responsive Website für das Salim Lee Boxing & Fitness Gym in Reutlingen.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Ready-3ecf8e)

## 🚀 Features

- ⚡ **Next.js 14** mit App Router
- 🎨 **Tailwind CSS** für responsive Designs
- 📱 **Vollständig responsiv** (Mobile-First)
- 🗄️ **Supabase** Integration (Datenbank & Auth)
- 📝 **Form Validation** mit React Hook Form & Zod
- 🎬 **Animationen** mit Framer Motion
- 🌐 **SEO optimiert** mit Metadata API
- ☁️ **Vercel Deploy** ready

## 📁 Projektstruktur

```
salim-lee-gym/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root Layout
│   ├── page.tsx            # Homepage
│   └── globals.css         # Globale Styles
├── components/
│   ├── ui/                 # Wiederverwendbare UI-Komponenten
│   │   ├── Button.tsx
│   │   └── Modal.tsx
│   └── sections/           # Page Sections
│       ├── Header.tsx
│       ├── Hero.tsx
│       ├── Stats.tsx
│       ├── Services.tsx
│       ├── Pricing.tsx
│       ├── Contact.tsx
│       ├── Footer.tsx
│       └── BookingModal.tsx
├── lib/
│   ├── supabase/           # Supabase Client Setup
│   │   ├── client.ts
│   │   └── server.ts
│   ├── constants.ts        # Statische Daten
│   └── utils.ts            # Utility Functions
├── types/
│   ├── index.ts            # App Types
│   └── database.types.ts   # Supabase DB Types
├── supabase/
│   └── migrations/         # SQL Migrations
├── public/                 # Statische Assets
└── ...config files
```

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone https://github.com/dein-username/salim-lee-gym.git
cd salim-lee-gym
```

### 2. Dependencies installieren

```bash
npm install
# oder
yarn install
# oder
pnpm install
```

### 3. Environment Variables einrichten

```bash
cp .env.example .env.local
```

Fülle die `.env.local` mit deinen Supabase-Credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Development Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## 🗄️ Supabase Setup

### 1. Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Erstelle ein neues Projekt
3. Kopiere URL und Anon Key in deine `.env.local`

### 2. Datenbank Migration ausführen

Führe die SQL aus `supabase/migrations/001_initial_schema.sql` im Supabase SQL Editor aus.

Oder nutze die Supabase CLI:

```bash
# Supabase CLI installieren
npm install -g supabase

# Login
supabase login

# Mit Projekt verbinden
supabase link --project-ref your-project-ref

# Migration ausführen
supabase db push
```

### 3. Types generieren (optional)

```bash
npm run db:generate
```

## ☁️ Deployment auf Vercel

### 1. GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/dein-username/salim-lee-gym.git
git push -u origin main
```

### 2. Vercel verbinden

1. Gehe zu [vercel.com](https://vercel.com)
2. "Import Project" → GitHub Repository auswählen
3. Environment Variables hinzufügen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## 📝 Anpassungen

### Kontaktdaten ändern

Editiere `lib/constants.ts`:

```typescript
export const CONTACT_INFO: ContactInfo = {
  address: {
    street: 'Deine Straße 123',
    zip: '12345',
    city: 'Deine Stadt',
    country: 'Deutschland',
  },
  phone: '+49 123 456789',
  email: 'info@deine-domain.de',
  // ...
}
```

### Preise ändern

Ebenfalls in `lib/constants.ts` unter `PRICES`.

### Services ändern

Unter `SERVICES` in `lib/constants.ts`.

## 🎨 Farben anpassen

Die Hauptfarben sind in `tailwind.config.ts` definiert:

```typescript
colors: {
  brand: {
    500: '#f59e0b', // Haupt-Akzentfarbe (Amber)
    // ...
  },
  dark: {
    950: '#09090b', // Hintergrund
    // ...
  }
}
```

## 📧 Email-Benachrichtigungen (optional)

Für Email-Benachrichtigungen bei neuen Buchungen kannst du:

1. **Supabase Edge Functions** mit Resend/SendGrid nutzen
2. **Vercel Serverless Functions** mit Nodemailer
3. **Zapier/Make** Webhooks

## 🤝 Support

Bei Fragen oder Problemen erstelle ein GitHub Issue.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei.

---

Made with ❤️ für Salim Lee Boxing & Fitness Gym
