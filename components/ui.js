// Ortak UI yardımcıları
window.BRP_UI = {
  scoreClass(value){
    value = Number(value) || 0;
    return value >= 70 ? "sGreen" : value >= 50 ? "sAmber" : "sRed";
  },
  formatNumber(value, digits = 0){
    return Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: digits });
  }
};
