import React from 'react';
import { GamePhase } from './types';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CurtainAnimationProps {
  phase: GamePhase;
}

export const CurtainAnimation: React.FC<CurtainAnimationProps> = ({ phase }) => {
  const { t } = useLanguage();
  const isClosed = phase === 'CURTAIN_CLOSING' || phase === 'CURTAIN_CLOSED';
  const isTransitioning = phase === 'CURTAIN_CLOSING' || phase === 'CURTAIN_OPENING';

  // Do not render anything blocking when fully open
  const isVisible = isClosed || isTransitioning;

  return (
    <div
      className={`absolute inset-0 z-30 overflow-hidden rounded-3xl transition-opacity duration-300 ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      {/* 100% Opaque Blackout Backdrop behind curtains so zero card content can ever peek through */}
      <div
        className={`absolute inset-0 bg-slate-950 transition-opacity duration-300 z-0 ${
          isClosed ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Left Velvet Curtain */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 border-r-4 border-amber-400 shadow-[10px_0_30px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-in-out z-10 flex flex-col justify-between ${
          isClosed ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: '#4a0508',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0px, rgba(40,2,4,0.3) 15px, rgba(255,255,255,0.18) 30px, rgba(60,4,6,0.6) 45px, rgba(0,0,0,0.55) 60px), linear-gradient(to right, #1f0204 0%, #4a0509 25%, #7d0d14 65%, #9c131c 90%, #5c070c 100%)'
        }}
      >
        {/* Top Gold Valance Tassel */}
        <div className="h-4 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md flex items-center justify-around px-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-1.5 h-3 bg-amber-400 rounded-b-full shadow-sm" />
          ))}
        </div>
        {/* Bottom Gold Fringe */}
        <div className="h-5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-md flex items-center justify-around px-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="w-1.5 h-4 bg-amber-300 rounded-b-full shadow-sm" />
          ))}
        </div>
      </div>

      {/* Right Velvet Curtain */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 border-l-4 border-amber-400 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-in-out z-10 flex flex-col justify-between ${
          isClosed ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: '#4a0508',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0px, rgba(60,4,6,0.6) 15px, rgba(255,255,255,0.18) 30px, rgba(40,2,4,0.3) 45px, rgba(0,0,0,0.55) 60px), linear-gradient(to left, #1f0204 0%, #4a0509 25%, #7d0d14 65%, #9c131c 90%, #5c070c 100%)'
        }}
      >
        {/* Top Gold Valance Tassel */}
        <div className="h-4 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md flex items-center justify-around px-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-1.5 h-3 bg-amber-400 rounded-b-full shadow-sm" />
          ))}
        </div>
        {/* Bottom Gold Fringe */}
        <div className="h-5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-md flex items-center justify-around px-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="w-1.5 h-4 bg-amber-300 rounded-b-full shadow-sm" />
          ))}
        </div>
      </div>

      {/* Center "Close your eyes" Theatrical Badge */}
      {isClosed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none select-none animate-fadeIn">
          <div className="relative bg-slate-950/95 px-8 py-6 rounded-3xl border-4 border-amber-400 shadow-2xl flex flex-col items-center max-w-lg mx-4 text-center">
            {/* Sparkle decorative icons */}
            <div className="absolute -top-4 -left-4 text-amber-300 animate-bounce">
              <Sparkles size={36} />
            </div>
            <div className="absolute -bottom-4 -right-4 text-amber-300 animate-bounce">
              <Sparkles size={36} />
            </div>

            {/* Bouncing 🙈 Monkey */}
            <div className="text-7xl sm:text-8xl md:text-9xl mb-2 animate-bounce drop-shadow-2xl">
              🙈
            </div>

            {/* Main Stage Instruction */}
            <h2 className="text-2xl sm:text-4xl font-black text-amber-300 tracking-wide drop-shadow-md mb-1">
              {t('CLOSE YOUR EYES!', <><ruby>目<rt>め</rt></ruby>を つむってね！</>)}
            </h2>

            {/* Sub-Instruction */}
            <p className="text-xl sm:text-3xl font-black text-white tracking-wider drop-shadow-lg">
              {t('NO PEEKING!', <>ぜったい <ruby>見<rt>み</rt></ruby>ちゃダメだよ！</>)}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs sm:text-sm font-bold text-amber-200/90">
                {t('Cards are secretly vanishing...', <>カードが こっそり きえちゃうよ...</>)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
