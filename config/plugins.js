// BIST Radar Pro V17 Plugin Mimarisi
// Vercel Hobby limitini aşmamak için yeni api/*.js dosyası eklenmez.
// Tüm yeni modüller tarayıcı tarafında js/plugins altında çalışır.

window.BRP_PLUGINS = [
  {
    id: "dipHunter",
    name: "🎯 Dip Avcısı AI",
    file: "js/plugins/dipHunter.js",
    enabled: true
  }

  // Sonraki modüller:
  // { id: "committee2", name: "🏛 AI Komitesi 2.0", file: "js/plugins/committee2.js", enabled: true },
  // { id: "portfolioAI", name: "💼 Portföy AI", file: "js/plugins/portfolioAI.js", enabled: true }
];
