'use client'

import Image from 'next/image'
import salimImage from '@/assets/salim_lee_potrait.jpg'

export function About() {
  return (
    <section id="about" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-8 tracking-tight md:text-left text-center">
          ÜBER MICH
        </h2>
        
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          {/* Portrait Image (Left) */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-start animate-fade-in">
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border border-brand-500/20 shadow-[0_0_40px_rgba(var(--brand-500-rgb),0.1)]">
              <Image 
                src={salimImage} 
                alt="Salim Lee Portrait" 
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* About Text (Right) */}
          <div className="w-full md:w-1/2 space-y-4 animate-fade-in-delay">
            <p className="text-dark-200 text-lg leading-relaxed font-medium">
              Hallo, ich bin <span className="text-brand-500 font-bold">Salim Lee</span>, dein Trainer für professionelles Boxen und Fitness in Reutlingen.
            </p>
            <p className="text-dark-400 leading-relaxed text-sm md:text-base">
              Mit jahrelanger Erfahrung im Boxen und im Bereich der physischen Fitness ist es meine Leidenschaft, Menschen dabei zu helfen, ihre sportlichen Ziele zu erreichen – egal ob Du kompletter Anfänger bist oder bereits Erfahrung mitbringst.
            </p>
            <p className="text-dark-400 leading-relaxed text-sm md:text-base">
              In meinem Training setze ich auf Disziplin, saubere Technik und den unverzichtbaren Spaß an der Bewegung. Mein Ziel ist es nicht nur, dass Du körperlich spürbar fitter wirst, sondern auch echtes Selbstvertrauen aufbaust und im Alltag über dich hinauswächst.
            </p>
            <div className="pt-4">
              <span className="inline-block px-4 py-2 bg-brand-500/10 text-brand-500 rounded-lg text-sm font-semibold border border-brand-500/20">
                Lass uns gemeinsam anpacken!
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
