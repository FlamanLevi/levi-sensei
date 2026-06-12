import { useState, useEffect } from 'react';

export const PWAInstallPrompt = ({ t }) => {
  const [isIosBrowser, setIsIosBrowser] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Detect if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIos && !isStandalone) {
      setIsIosBrowser(true);
    }
  }, []);

  if (!isIosBrowser) return null;

  return (
    <div className="w-full max-w-md bg-blue-50 border-4 border-blue-400 text-blue-800 p-4 rounded-xl shadow-md mb-6 animate-in slide-in-from-top duration-500 text-center">
      <div className="text-3xl mb-2">📱</div>
      <h3 className="font-black text-xl mb-2">
        {t("Add to Home Screen!", "ホーム画面に追加しよう！")}
      </h3>
      <p className="font-bold text-sm opacity-90">
        {t("Tap the Share icon (square with arrow) at the top of Safari, then tap 'Add to Home Screen' to play fullscreen!", "Safariの右上にある「共有」アイコン（矢印のついた四角）をタップして、「ホーム画面に追加」を選んでね！フルスクリーンで遊べるよ！")}
      </p>
    </div>
  );
};
