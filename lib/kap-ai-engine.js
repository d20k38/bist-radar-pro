function n(x,d=0){x=Number(x);return Number.isFinite(x)?x:d}
function clamp(x){return Math.max(0,Math.min(100,Math.round(n(x))))}
function norm(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function upper(s){return norm(s).toLocaleUpperCase('tr-TR')}
function moneyHints(text){
  const out=[]; const re=/((?:\d{1,3}(?:[\.\s]\d{3})+|\d+)(?:,\d+)?\s*(?:TL|TRY|USD|EUR|AVRO|MİLYON\s*TL|MİLYAR\s*TL))/gi;
  let m; while((m=re.exec(text))&&out.length<5) out.push(norm(m[1]));
  return out;
}
const rules=[
  {type:'Yeni İş / Sözleşme',pos:['YENİ İŞ','SÖZLEŞME','ANLAŞMA','İHALE KAZAN','SİPARİŞ','SATIŞ SÖZLEŞMESİ'],neg:['İPTAL','FESİH'],base:76,impact:12},
  {type:'Temettü',pos:['TEMETTÜ','KAR PAYI','KÂR PAYI'],neg:['DAĞITILMAMASINA','DAĞITMAMA'],base:70,impact:8},
  {type:'Bedelsiz / Sermaye Artırımı',pos:['BEDELSİZ','İÇ KAYNAKLARDAN','SERMAYE ARTIRIMI'],neg:['BEDELLİ'],base:72,impact:9},
  {type:'Finansal Sonuç / Bilanço',pos:['FİNANSAL RAPOR','FİNANSAL TABLO','BİLANÇO','KAR','KÂR','NET DÖNEM KARI'],neg:['ZARAR','NET DÖNEM ZARARI'],base:66,impact:7},
  {type:'Yatırım / Kapasite',pos:['YATIRIM','KAPASİTE','ÜRETİM HATTI','FABRİKA','TESİS'],neg:['ERTELEN','DURDUR'],base:68,impact:8},
  {type:'Geri Alım',pos:['GERİ ALIM','PAY ALIM'],neg:['SATIM'],base:74,impact:9},
  {type:'Ortaklık / Satın Alma',pos:['SATIN ALMA','DEVRALMA','BAĞLI ORTAKLIK','İŞTİRAK','ORTAKLIK'],neg:['SATIŞ','DEVİR'],base:65,impact:6},
  {type:'SPK / Onay / İzin',pos:['SPK','ONAY','İZİN','BAŞVURU'],neg:['RED','OLUMSUZ'],base:60,impact:4},
  {type:'Dava / Ceza / Hukuki Risk',pos:['DAVA','CEZA','SORUŞTURMA','İNCELEME','İCRA'],neg:['LEHE','KAZANILDI'],base:40,impact:-10},
  {type:'Üretim Durdurma / Afet',pos:['ÜRETİM DURDUR','YANGIN','PATLAMA','HASAR','GREYV','LOKAVT'],neg:[],base:32,impact:-16},
  {type:'Yönetim / Genel Kurul',pos:['GENEL KURUL','YÖNETİM KURULU','ATAMA','İSTİFA'],neg:[],base:50,impact:0}
];
function classify(text){
  const U=upper(text); let best={type:'Genel KAP Bildirimi',score:50,impact:0,matched:[]};
  for(const r of rules){
    const pos=r.pos.filter(k=>U.includes(k)); const neg=r.neg.filter(k=>U.includes(k));
    if(pos.length||neg.length){
      let score=r.base + pos.length*4 - neg.length*12;
      let impact=r.impact + pos.length*2 - neg.length*10;
      if(score>best.score || Math.abs(impact)>Math.abs(best.impact)) best={type:r.type,score:clamp(score),impact,matched:[...pos,...neg]};
    }
  }
  const bad=['İPTAL','FESİH','ZARAR','CEZA','DAVA','İCRA','DURDUR','YANGIN','HASAR','RED'].filter(k=>U.includes(k));
  const good=['KAZAN','SÖZLEŞME','TEMETTÜ','BEDELSİZ','GERİ ALIM','KAR','KÂR','YATIRIM'].filter(k=>U.includes(k));
  const sentiment=clamp(best.score + good.length*3 - bad.length*9);
  return {...best, sentiment, polarity: sentiment>=62?'Pozitif':sentiment<=42?'Negatif':'Nötr'};
}
function effectHorizon(score){
  score=clamp(score);
  return {
    today: clamp(score),
    threeDays: clamp(score*0.88+6),
    oneWeek: clamp(score*0.76+10),
    oneMonth: clamp(score*0.58+18)
  };
}
function makeSummary(item, cls){
  const text=norm([item.title,item.summary].join(' - '));
  const money=moneyHints(text);
  const first=text.length>260?text.slice(0,257)+'...':text;
  const amount=money.length?` Bildirimde öne çıkan tutar/oran bilgisi: ${money.join(', ')}.`:'';
  return `${item.symbol||'Seçili hisse'} için son KAP bildirimi "${item.title||'KAP bildirimi'}" başlığıyla geldi. AI sınıflandırması: ${cls.type} (${cls.polarity}).${amount} ${first}`;
}
function makeComment(item, cls, technical={}){
  const techScore=clamp(technical.score||technical.finalScore||technical.confidence||50);
  const techLabel=techScore>=70?'teknik görünüm güçlü':techScore>=50?'teknik görünüm nötr/izleme seviyesinde':'teknik görünüm zayıf';
  const align=(cls.sentiment>=62&&techScore>=65)?'Haber etkisi ile teknik görünüm aynı yönde destekleyici.':(cls.sentiment<=42&&techScore>=65)?'Teknik görünüm güçlü olsa da haber tarafı risk uyarısı veriyor.':(cls.sentiment>=62&&techScore<50)?'Haber pozitif; ancak teknik teyit henüz zayıf.':'Haber ve teknik taraf birlikte güçlü bir teyit üretmiyor.';
  const risk=cls.sentiment<=42?'Bu bildirim kısa vadede risk ve volatiliteyi artırabilir.':cls.sentiment>=70?'Bildirim kısa vadede izleme ilgisini ve hacmi destekleyebilir.':'Bildirim tek başına güçlü al/sat gerekçesi değildir; fiyat-hacim teyidi aranmalıdır.';
  return `${cls.polarity} etki. ${align} ${risk} ${techLabel.charAt(0).toUpperCase()+techLabel.slice(1)}.`;
}
export function analyzeLatestKapAI(items=[], symbol='GENEL', technical={}){
  const list=Array.isArray(items)?items:[];
  const latest=list[0]||null;
  if(!latest){
    return {available:false,symbol,impactScore:50,reliabilityScore:0,eventType:'KAP yok',polarity:'Nötr',summary:'Seçilen hisse için canlı KAP veya gerçek yerel arşivde bildirim bulunamadı.',comment:'KAP katkısı nötr kabul edildi; demo/random haber kullanılmadı.',effectHorizon:effectHorizon(50),reasons:['KAP verisi yok'],risks:['Canlı KAP bağlantısı/yerel arşiv sınırlı olabilir.']};
  }
  const text=[latest.title,latest.summary,latest.category,latest.company].join(' ');
  const cls=classify(text);
  const amount=moneyHints(text);
  const ageBoost=latest.date?4:0;
  const reliability=clamp(62 + (latest.source==='KAP'?18:8) + (cls.matched?.length||0)*4 + (amount.length?6:0) + ageBoost);
  const techScore=clamp(technical.score||technical.finalScore||technical.confidence||50);
  const alignBoost=(cls.sentiment>=62&&techScore>=65)?7:(cls.sentiment<=42&&techScore<50)?4:0;
  const impactScore=clamp(cls.sentiment + alignBoost);
  const ai={
    available:true,
    symbol:latest.symbol||symbol,
    date:latest.date||'',
    title:latest.title||'KAP bildirimi',
    url:latest.url||'',
    source:latest.source||'KAP',
    eventType:cls.type,
    polarity:cls.polarity,
    impactScore,
    reliabilityScore:reliability,
    effectHorizon:effectHorizon(impactScore),
    summary:makeSummary(latest,cls),
    comment:makeComment(latest,cls,technical),
    extracted: {amounts:amount, matchedKeywords:cls.matched||[]},
    reasons:[
      `Olay türü: ${cls.type}`,
      `Duyarlılık: ${cls.polarity} (${impactScore}/100)`,
      amount.length?`Önemli tutar/oran: ${amount.join(', ')}`:'Önemli tutar/oran bilgisi otomatik yakalanamadı.',
      `Teknik uyum skoru: ${techScore}/100`
    ],
    risks: cls.polarity==='Negatif' ? ['Negatif haber etkisi fiyatlamada baskı oluşturabilir.','Pozisyon büyüklüğü ve stop seviyesi ayrıca kontrol edilmelidir.'] : ['Haber olumlu olsa bile fiyat-hacim teyidi olmadan tek başına karar gerekçesi yapılmamalıdır.']
  };
  return ai;
}
export function kapScoreFromAI(ai){return clamp(ai?.impactScore||50)}
