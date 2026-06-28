// R11 Data Integrity Engine
// Amaç: OHLC, hacim ve hacim tabanlı indikatörlerin gerçekten hesaplanabilir olduğunu doğrulamak.
// Random/demo veri üretmez; yalnızca mevcut gerçek veri akışını denetler.
function n(x){ const v=Number(x); return Number.isFinite(v) ? v : null; }
function round(x,d=2){ const v=n(x); return v===null ? null : Number(v.toFixed(d)); }
function pct(ok,total){ return total ? Math.round((ok/total)*100) : 0; }
function isFinitePositive(x){ const v=n(x); return v!==null && v>0; }
function lastPositive(arr){ for(let i=(arr?.length||0)-1;i>=0;i--){ if(isFinitePositive(arr[i])) return Number(arr[i]); } return null; }
function avgPositive(arr, count=20){ const vals=[]; for(let i=(arr?.length||0)-1;i>=0 && vals.length<count;i--){ if(isFinitePositive(arr[i])) vals.push(Number(arr[i])); } if(!vals.length) return null; return vals.reduce((a,b)=>a+b,0)/vals.length; }

export function assessDataIntegrity(rows=[], indicatorBundle={}, dayTrading={}){
  const issues=[]; const warnings=[]; const checks=[];
  const clean=(rows||[]).filter(r=>r && Number.isFinite(Number(r.close)) && Number.isFinite(Number(r.high)) && Number.isFinite(Number(r.low)));
  const volumes=clean.map(r=>Number(r.volume)).filter(Number.isFinite);
  const positiveVolumes=clean.map(r=>r.volume).filter(isFinitePositive);
  const ohlcOk=clean.length>=60;
  const history250=clean.length>=240;
  const volumeOk=positiveVolumes.length>=20;
  const latestVolume=lastPositive(clean.map(r=>r.volume));
  const avgVol20=avgPositive(clean.map(r=>r.volume),20);
  const v=indicatorBundle?.values||{};
  const dt=dayTrading||{};
  const rvol= n(dt.rvol20) ?? n(v.rvol20);
  const vwap= n(dt.vwap20) ?? n(v.vwap20);
  const cmf= n(dt.cmf20) ?? n(v.cmf20);
  const mfi= n(dt.mfi14) ?? n(v.mfi14);
  const rvolOk = rvol!==null && rvol>0;
  const vwapOk = vwap!==null && vwap>0;
  const cmfOk = cmf!==null;
  const mfiOk = mfi!==null && mfi>0;
  if(!ohlcOk) issues.push(`OHLC geçmişi yetersiz: ${clean.length} gün`);
  if(!history250) warnings.push(`250 günlük analiz için veri sınırlı: ${clean.length} gün`);
  if(!volumeOk) issues.push(`Hacim dizisi yetersiz: ${positiveVolumes.length} pozitif hacimli gün`);
  if(!rvolOk) issues.push('RVOL hesaplanamadı: 20 günlük pozitif hacim ortalaması yok veya son hacim yok');
  if(!vwapOk) issues.push('VWAP hesaplanamadı: hacim toplamı yok');
  if(!cmfOk) issues.push('CMF hesaplanamadı: hacim/HL aralığı eksik');
  if(!mfiOk) issues.push('MFI hesaplanamadı: para akışı için hacim verisi yok');
  checks.push({key:'ohlc',label:'OHLC',ok:ohlcOk,detail:`${clean.length} gün`});
  checks.push({key:'history250',label:'250 Gün Hafıza',ok:history250,detail:`${clean.length} gün`});
  checks.push({key:'volume',label:'Hacim Dizisi',ok:volumeOk,detail:`${positiveVolumes.length} pozitif gün`});
  checks.push({key:'rvol',label:'RVOL',ok:rvolOk,detail:rvolOk?`${round(rvol,2)}x`:'veri yetersiz'});
  checks.push({key:'vwap',label:'VWAP',ok:vwapOk,detail:vwapOk?`${round(vwap,2)} TL`:'veri yetersiz'});
  checks.push({key:'cmf',label:'CMF',ok:cmfOk,detail:cmfOk?String(round(cmf,4)):'veri yetersiz'});
  checks.push({key:'mfi',label:'MFI',ok:mfiOk,detail:mfiOk?String(round(mfi,1)):'veri yetersiz'});
  const okCount=checks.filter(c=>c.ok).length;
  const health=pct(okCount,checks.length);
  return {
    success:true,
    schema:'R11_DATA_INTEGRITY_ENGINE',
    health,
    status: health>=85?'SAĞLIKLI':health>=65?'KISMİ':health>=45?'ZAYIF':'KRİTİK',
    checks,
    issues,
    warnings,
    values:{rows:clean.length, positiveVolumeDays:positiveVolumes.length, latestVolume, avgVol20:round(avgVol20,0), rvol20:round(rvol,2), vwap20:round(vwap,2), cmf20:round(cmf,4), mfi14:round(mfi,1)},
    note: issues.length ? issues.join(' • ') : 'OHLC ve hacim tabanlı göstergeler hesaplanabilir görünüyor.',
    random:false,
    computedAt:new Date().toISOString()
  };
}
