export function trLower(s=''){
  return String(s||'').toLocaleLowerCase('tr-TR');
}

const RULES = [
  {type:'Yeni İş / Sözleşme', score:18, reliability:90, polarity:'Pozitif', keys:['yeni iş','iş ilişkisi','sözleşme','sipariş','ihale kazandı','ihale sonucu','satış sözleşmesi']},
  {type:'Yatırım / Kapasite Artışı', score:16, reliability:86, polarity:'Pozitif', keys:['yatırım','kapasite artışı','yeni tesis','üretim hattı','fabrika','modernizasyon']},
  {type:'Temettü', score:12, reliability:95, polarity:'Pozitif', keys:['temettü','kar payı','kâr payı','nakit kar payı']},
  {type:'Bedelsiz Sermaye Artırımı', score:15, reliability:92, polarity:'Pozitif', keys:['bedelsiz','iç kaynaklardan sermaye artırımı']},
  {type:'Geri Alım', score:14, reliability:88, polarity:'Pozitif', keys:['pay geri alım','geri alım programı','geri alınan pay']},
  {type:'Finansal Tablo / Faaliyet', score:8, reliability:96, polarity:'Nötr-Pozitif', keys:['finansal tablo','faaliyet raporu','bilanço','gelir tablosu','finansal rapor']},
  {type:'SPK / BIST Onayı', score:8, reliability:91, polarity:'Pozitif', keys:['spk onayı','borsa istanbul onayı','onaylandı','kotasyon']},
  {type:'Ortaklık / Satın Alma', score:13, reliability:86, polarity:'Pozitif', keys:['ortaklık','iş birliği','işbirliği','satın alma','devralma','birleşme']},
  {type:'Borç / Finansman Riski', score:-8, reliability:82, polarity:'Negatif', keys:['borç yapılandırması','kredi','finansman koşulları','temerrüt','refinansman']},
  {type:'Dava / Ceza / İnceleme', score:-20, reliability:90, polarity:'Negatif', keys:['dava','ceza','idari para cezası','inceleme','soruşturma','haciz','icra']},
  {type:'Üretim Durdurma / Afet', score:-35, reliability:94, polarity:'Negatif', keys:['üretim durdu','üretim durduruldu','yangın','sel','deprem','kaza','faaliyet durdurma']},
  {type:'İhale İptali / Sözleşme Feshi', score:-16, reliability:88, polarity:'Negatif', keys:['ihale iptali','sözleşme feshi','iptal edildi','feshedildi']},
  {type:'Genel Kurul / Yönetim', score:2, reliability:70, polarity:'Nötr', keys:['genel kurul','yönetim kurulu','imza yetkisi','adres değişikliği','komite']}
];

const SECTOR_HINTS = [
  {sector:'Enerji', keys:['enerji','elektrik','ges','res','doğalgaz','petrol'], beta:1.06},
  {sector:'Banka / Finans', keys:['banka','kredi','finansman','faktoring','leasing'], beta:1.12},
  {sector:'Sanayi', keys:['üretim','fabrika','kapasite','hammadde'], beta:1.05},
  {sector:'Teknoloji', keys:['yazılım','teknoloji','savunma','siber','veri'], beta:1.10},
  {sector:'GYO / İnşaat', keys:['gyo','gayrimenkul','inşaat','proje'], beta:1.03}
];

function matchRule(item){
  const text = trLower([item.title,item.summary,item.category,item.source].join(' '));
  const hits=[];
  let best = {type:'Diğer / Düşük Önem', score:0, reliability:45, polarity:'Nötr', keys:[]};
  for(const r of RULES){
    const found = r.keys.filter(k=>text.includes(k));
    if(found.length){ hits.push(...found.map(k=>`${r.type}: ${k}`)); if(Math.abs(r.score)>Math.abs(best.score)) best=r; }
  }
  return {rule:best, hits:hits.slice(0,8)};
}

function inferSector(item){
  const text = trLower([item.title,item.summary,item.category].join(' '));
  const hit = SECTOR_HINTS.find(s=>s.keys.some(k=>text.includes(k)));
  return hit || {sector:'Genel', beta:1};
}

function daysAgo(dateStr){
  const d = new Date(dateStr || Date.now());
  if(Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((Date.now()-d.getTime())/86400000));
}

function decayScores(base, age){
  const d1 = Math.round(base);
  const d3 = Math.round(50 + (base-50)*Math.exp(-Math.max(0,age-0)/9));
  const w1 = Math.round(50 + (base-50)*Math.exp(-Math.max(0,age-0)/18));
  const m1 = Math.round(50 + (base-50)*Math.exp(-Math.max(0,age-0)/45));
  return {today:clamp(d1), threeDays:clamp(d3), oneWeek:clamp(w1), oneMonth:clamp(m1)};
}

function clamp(x){ return Math.max(0, Math.min(100, Math.round(x))); }

export function analyzeCorporateNews(items=[], symbol='GENEL'){
  const enriched = (items||[]).map((item,idx)=>{
    const {rule,hits} = matchRule(item);
    const sector = inferSector(item);
    const age = daysAgo(item.date);
    const raw = 50 + rule.score*sector.beta;
    const impactScore = clamp(raw);
    const urgency = age<=1 ? 'Anlık izlenmeli' : age<=7 ? 'Kısa vade etkili' : age<=30 ? 'Orta vade izleme' : 'Arşiv etkisi';
    const timeImpact = decayScores(impactScore, age);
    const decisionEffect = impactScore>=72 ? 'Teknik AL sinyalini güçlendirir' : impactScore<=38 ? 'Pozisyon azalt / stop sıkılaştır uyarısı' : 'Teknik teyit bekler';
    return {...item, rank:idx+1, eventType:rule.type, polarity:rule.polarity, reliabilityScore:rule.reliability, materialityScore:Math.min(100, Math.max(10, Math.abs(rule.score)*4 + rule.reliability/2)), sector:sector.sector, impactScore, urgency, timeImpact, decisionEffect, reasons:hits.length?hits:['Belirgin yüksek etkili anahtar eşleşme yok']};
  });
  const count = enriched.length;
  const avgImpact = count ? clamp(enriched.reduce((s,x)=>s+x.impactScore,0)/count) : 50;
  const avgReliability = count ? clamp(enriched.reduce((s,x)=>s+x.reliabilityScore,0)/count) : 0;
  const positive = enriched.filter(x=>x.impactScore>=62).length;
  const negative = enriched.filter(x=>x.impactScore<=42).length;
  const neutral = count-positive-negative;
  const mostImportant = enriched.slice().sort((a,b)=>(b.materialityScore+b.reliabilityScore+b.impactScore)-(a.materialityScore+a.reliabilityScore+a.impactScore))[0] || null;
  const timeline = enriched.map(x=>({date:x.date, symbol:x.symbol, title:x.title, eventType:x.eventType, impactScore:x.impactScore}));
  const sectorMap = {};
  enriched.forEach(x=>{ sectorMap[x.sector]=sectorMap[x.sector]||{sector:x.sector,count:0,avg:0}; sectorMap[x.sector].count++; sectorMap[x.sector].avg+=x.impactScore; });
  const sectors = Object.values(sectorMap).map(s=>({...s,avg:clamp(s.avg/s.count)})).sort((a,b)=>b.avg-a.avg);
  const institutionalScore = count ? clamp(avgImpact*0.55 + avgReliability*0.25 + 70*0.20) : 50;
  const summary = !count
    ? 'Gerçek KAP/Haber kaydı bulunamadı. Canlı KAP bağlantısı yanıt verirse bu alan otomatik dolar; demo veri kullanılmaz.'
    : institutionalScore>=70
      ? 'Kurumsal haber akışı güçlü. Teknik trend, hacim ve para girişi de destekliyorsa karar güveni artar.'
      : institutionalScore<=42
        ? 'Kurumsal haber akışı riskli. Portföy ağırlığı, stop ve haber sonrası volatilite yakından izlenmeli.'
        : 'Kurumsal haber akışı nötr/karışık. Tek başına karar üretmez; teknik ve portföy riski ile birlikte okunmalı.';
  return {symbol, count, avgImpact, avgReliability, positive, negative, neutral, institutionalScore, summary, mostImportant, timeline, sectors, items:enriched};
}
