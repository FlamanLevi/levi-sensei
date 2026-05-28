export const OfflineBanner = ({ isConnected, t }) => (
  !isConnected && (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white font-bold text-center py-3 z-[100] animate-pulse text-xl shadow-lg border-b-4 border-red-700">
      {t("📶 Reconnecting to Wi-Fi...", "📶 ネットワークに再接続中...")}
    </div>
  )
);
