/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mobile & Tablet Fullscreen Utilities
 * Dedicated to mobile devices (iPhones, iPads, Android phones & tablets).
 * Strictly excludes desktop and laptop browsers (Windows, macOS, Dynabook, etc.).
 */

/**
 * Detects whether the current device is a mobile or tablet touch device
 * (iPads, iPhones, Android phones, Android tablets).
 * Strictly returns false for standard desktop / laptop environments.
 */
export function isMobileOrTabletDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();

  // Strictly exclude desktop and laptop operating systems (Windows PCs/laptops/Surfaces, Mac desktops)
  if (ua.includes('windows') || (navigator.platform && navigator.platform.toLowerCase().includes('win'))) {
    return false;
  }
  if (ua.includes('macintosh') && (!navigator.maxTouchPoints || navigator.maxTouchPoints <= 1)) {
    return false;
  }

  // Explicit mobile / tablet user-agent keywords
  const isMobileUA = /ipad|iphone|ipod|android|mobile|tablet|silk|kindle/.test(ua);

  // iPadOS 13+ reports platform as "MacIntel" but has multiple touch points
  const isIPad = (navigator.platform === 'MacIntel' || ua.includes('macintosh')) && navigator.maxTouchPoints > 1;

  // Touch screen check with typical mobile / tablet screen size guard (<= 1024px min dimension)
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 1;
  const isSmallTouchFormFactor = isTouchDevice && Math.min(window.screen.width, window.screen.height) <= 1024;

  return isMobileUA || isIPad || isSmallTouchFormFactor;
}

/**
 * Attempts to request fullscreen exclusively on mobile and tablet devices
 * upon user interaction, safely handling browser rejections.
 * No-ops on desktop / laptop browsers.
 */
export function requestMobileFullscreen(): void {
  if (typeof document === 'undefined' || !isMobileOrTabletDevice()) return;

  // If already in fullscreen, nothing to do
  if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
    return;
  }

  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };

  try {
    if (typeof docEl.requestFullscreen === 'function') {
      docEl.requestFullscreen().catch(() => {});
    } else if (typeof docEl.webkitRequestFullscreen === 'function') {
      docEl.webkitRequestFullscreen().catch(() => {});
    }
  } catch {
    // Safely ignore platform restrictions
  }
}

/**
 * Attaches a one-time touch listener on mobile/tablet devices
 * to smoothly engage full screen on the first interaction.
 */
export function initMobileFullscreenOnFirstTouch(): () => void {
  if (typeof window === 'undefined' || !isMobileOrTabletDevice()) {
    return () => {};
  }

  const handleFirstInteraction = () => {
    requestMobileFullscreen();
    window.removeEventListener('touchend', handleFirstInteraction, true);
    window.removeEventListener('pointerup', handleFirstInteraction, true);
  };

  window.addEventListener('touchend', handleFirstInteraction, { capture: true, once: true });
  window.addEventListener('pointerup', handleFirstInteraction, { capture: true, once: true });

  return () => {
    window.removeEventListener('touchend', handleFirstInteraction, true);
    window.removeEventListener('pointerup', handleFirstInteraction, true);
  };
}
