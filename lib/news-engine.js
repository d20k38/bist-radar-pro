export function normalizeText(s=''){
  return String(s||'').toLowerCase('tr-TR');
}

const POSITIVE = ['yeni iş','sözleşme','ihale kazandı','sipariş','kapasite artışı','yatırım','temettü','geri alım','bedelsiz','olumlu','kar artışı','ciro artışı','ortaklık','ihracat'];
const NEGATIVE = ['dava','ceza','zarar','bedelli','borç','haciz','iflas','olumsuz','üretim durdu','pay satışı','sermaye azaltımı','denetim görüşü','risk'];
const NEUTRAL = ['genel kurul','özel durum','açıklama','bildirim','faaliyet raporu','finansal rapor'];

export function scoreNewsItem(item={}){
  const text = normalizeText([item.title,item.summary,item.category].join(' '));
  let score = 50;
  const hits = [];
  for(const k of POSITIVE){ if(text.includes(k)){ score += 9; hits.push('Pozitif: '+k); } }
  for(const k of NEGATIVE){ if(text.includes(k)){ score -= 11; hits.push('Negatif: '+k); } }
  for(const k of NEUTRAL){ if(text.includes(k)){ score += 1; } }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const sentiment = score >= 62 ? 'Pozitif' : score <= 42 ? 'Negatif' : 'Nötr';
  const effect = score >= 70 ? 'Güçlü pozitif' : score >= 58 ? 'Pozitif' : score <= 30 ? 'Güçlü negatif' : score <= 44 ? 'Negatif' : 'Nötr / izlenmeli';
  return {...item, sentiment, effect, impactScore: score, reasons: hits.slice(0,5)};
}

export function analyzeNewsImpact(items=[], symbol=''){
  const scored = items.map(scoreNewsItem);
  const avg = scored.length ? scored.reduce((s,x)=>s+(x.impactScore||50),0)/scored.length : 50;
  const positive = scored.filter(x=>x.sentiment==='Pozitif').length;
  const negative = scored.filter(x=>x.sentiment==='Negatif').length;
  const neutral = scored.length - positive - negative;
  const summary = avg >= 62
    ? 'Haber/KAP akışı genel olarak olumlu. Teknik sinyal varsa güveni artırabilir.'
    : avg <= 42
      ? 'Haber/KAP akışı riskli görünüyor. Teknik sinyal olsa bile temkinli olunmalı.'
      : 'Haber/KAP akışı nötr. Karar için teknik teyitler daha belirleyici.';
  return {symbol, count: scored.length, avgImpact: Math.round(avg), positive, negative, neutral, summary, items: scored};
}
