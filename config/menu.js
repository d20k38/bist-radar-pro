// BIST Radar Pro - merkezi menü tanımı
// Yeni modüller bundan sonra buraya tek satır eklenerek menüye alınacak.
export const MENU_ITEMS = [
  { id: "dashboard", label: "📊 Ana Kontrol" },
  { id: "analysis", label: "📈 Hisse Analizi" },
  { id: "strong", label: "🔥 En Güçlü 20" },
  { id: "safe", label: "💎 Güvenli Kazanç" },
  { id: "opportunity", label: "🚀 Fırsat Avcısı" },
  { id: "risk", label: "⚠️ Riskli Hisseler" },
  { id: "patterns", label: "🔎 Formasyonlar" },
  { id: "backtest", label: "📊 Backtest" },
  { id: "learning", label: "🧠 Öğrenen AI" },
  { id: "portfolio", label: "💼 Portföy" },
  { id: "portfolioAdvice", label: "🧺 Portföy Önerisi" },
  { id: "dailyReport", label: "📰 Günlük AI Raporu" },
  { id: "kapNews", label: "📢 KAP/Haber AI" },
  { id: "confidence", label: "🧩 Güven Katmanları" },
  { id: "committee", label: "🏛 AI Yatırım Komitesi" }

  // v17.1 burada açılacak:
  // { id: "dipHunter", label: "🎯 Dip Avcısı AI" }
];

if (typeof window !== "undefined") {
  window.BRP_MENU_ITEMS = MENU_ITEMS;
}
