import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AudioProvider } from './context/AudioContext';
import { LanguageProvider } from './context/LanguageContext';
import { ClassroomProvider } from './context/ClassroomContext';
import { VocabularyProvider } from './context/VocabularyContext';
import './index.css';

// Global Canvas roundRect Polyfill for iOS < 16.0 Safari (School iPads)
if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined' && !(CanvasRenderingContext2D.prototype as any).roundRect) {
  (CanvasRenderingContext2D.prototype as any).roundRect = function (x: number, y: number, w: number, h: number, radii?: number | number[]) {
    let r = 0;
    if (typeof radii === 'number') {
      r = radii;
    } else if (Array.isArray(radii)) {
      r = radii[0] || 0;
    }
    const maxR = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
    r = Math.min(Math.max(0, r), maxR);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x + r, y);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AudioProvider>
        <ClassroomProvider>
          <VocabularyProvider>
            <App />
          </VocabularyProvider>
        </ClassroomProvider>
      </AudioProvider>
    </LanguageProvider>
  </React.StrictMode>
);
