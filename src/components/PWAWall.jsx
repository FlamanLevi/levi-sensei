import { useState, useEffect } from 'react';

export const PWAWall = ({ children, t }) => {
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

  if (isIosBrowser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in zoom-in-95 duration-500">
        <div className="bg-blue-50 border-4 border-blue-400 text-blue-900 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
          {/* Decorative background pulse */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-blue-400/20 rounded-full blur-3xl -z-10 animate-pulse pointer-events-none"></div>
          
          <div className="text-8xl mb-6 drop-shadow-md">🛑</div>
          
          <h2 className="text-3xl font-black mb-4">
            {t("Wait! Add to Home Screen First", "ちょっと待って！先にホーム画面に追加してね")}
          </h2>
          
          <div className="bg-white p-6 rounded-2xl shadow-inner border-2 border-blue-100 mb-6 text-left">
            <p className="font-bold text-lg mb-4 text-blue-800">
              {t(
                "To stop Apple from deleting your data every week, you MUST install this app.", 
                "Appleによるデータの自動削除を防ぐため、必ずアプリとしてインストールしてください。"
              )}
            </p>
            
            <ol className="list-decimal pl-5 font-bold space-y-3 text-blue-700">
              <li>{t("Tap the Share icon (square with an arrow) at the top right of Safari.", "Safariの右上にある「共有」アイコン（矢印のついた四角）をタップします。")}</li>
              <li>{t("Scroll down and tap 'Add to Home Screen'.", "少し下にスクロールして「ホーム画面に追加」をタップします。")}</li>
              <li>{t("Close Safari and open the new app from your iPad home screen!", "Safariを閉じて、iPadのホーム画面から新しいアプリを開いてください！")}</li>
            </ol>
          </div>
          
          <div className="bg-blue-600 text-white font-black py-4 px-6 rounded-xl shadow-lg border-2 border-blue-800">
            {t("You cannot play until you do this!", "インストールするまで遊べません！")}
          </div>
        </div>
      </div>
    );
  }

  return children;
};
