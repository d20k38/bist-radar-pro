// BIST Radar Pro v9 - Data Provider
// Bu dosya veri kaynaklarını tek yerde toplar.
// Gerçek canlı veri bağlantıları burada geliştirilecektir.

const SYMBOLS = [
  'AEFES','AGHOL','AKBNK','AKSA','AKSEN','ALARK','ARCLK','ASELS','ASTOR','BIMAS',
  'BRSAN','DOAS','DOHOL','EKGYO','ENKAI','EREGL','FROTO','GARAN','GUBRF','HALKB',
  'ISCTR','KCHOL','KOZAA','KOZAL','KRDMD','MGROS','ODAS','OYAKC','PAPIL','PETKM',
  'PGSUS','SAHOL','SASA','SISE','TCELL','TEZOL','THYAO','TOASO','TTKOM','TUPRS',
  'USAK','VAKBN','VESTL','VKING','YKBNK','ZOREN'
];

function seededRandom(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x += seed.charCodeAt(i) * (i + 1);
  return function () {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function makeOhlcv(symbol, days = 180) {
  // Geçici yedek veri üretici. Canlı veri gelmediğinde ekranın boş kalmaması için.
  // Canlı sistemde bu fonksiyon yerine gerçek OHLCV kaynağı bağlanmalı.
  const rnd = seededRandom(symbol);
  const rows = [];
  let price = 10 + rnd() * 250;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const open = price;
    const change = (rnd() - 0.48) * 0.045;
    price = Math.max(1, price * (1 + change));
    const high = Math.max(open, price) * (1 + rnd() * 0.025);
    const low = Math.min(open, price) * (1 - rnd() * 0.025);
    const volume = Math.round(250000 + rnd() * 7000000);
    rows.push({
      date: date.toISOString().slice(0, 10),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +price.toFixed(2),
      volume
    });
  }
  return rows;
}

export async function getSymbols() {
  return SYMBOLS;
}

export async function getOhlcv(symbol, timeframe = '1D', days = 180) {
  // Buraya gerçek kaynak bağlanabilir:
  // 1) TradingView Screener / teknik göstergeler
  // 2) Mynet Finans / son fiyat-hacim doğrulama
  // 3) CollectAPI / API anahtarlı kaynak
  // 4) İş Yatırım / fiyat-hacim tablosu
  return makeOhlcv(symbol, days);
}

export async function getKapNews(symbol) {
  // KAP entegrasyonu burada yapılacak.
  return [
    { symbol, title: 'KAP haber taraması hazır', effect: 'NÖTR', confidence: 50, date: new Date().toISOString().slice(0, 10) }
  ];
}
