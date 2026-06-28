// V20 Institutional Portfolio Engine
// Random/pseudo veri kullanmaz. Senaryolar tamamen gerçek geçmiş OHLC günlük getirilerinden deterministik olarak üretilir.

function num(x,d=0){ const n=Number(x); return Number.isFinite(n)?n:d; }
function clamp(x,a=0,b=100){ return Math.max(a, Math.min(b, x)); }
function avg(a){ const b=a.filter(Number.isFinite); return b.length?b.reduce((s,x)=>s+x,0)/b.length:0; }
function std(a){ const m=avg(a); const b=a.filter(Number.isFinite); return b.length>1?Math.sqrt(b.reduce((s,x)=>s+(x-m)*(x-m),0)/(b.length-1)):0; }
function pctile(a,p){ const b=a.filter(Number.isFinite).sort((x,y)=>x-y); if(!b.length)return 0; const i=(b.length-1)*p; const lo=Math.floor(i), hi=Math.ceil(i); return lo===hi?b[lo]:b[lo]+(b[hi]-b[lo])*(i-lo); }
function corr(a,b){ const n=Math.min(a.length,b.length); if(n<8)return 0; const x=a.slice(-n), y=b.slice(-n), mx=avg(x), my=avg(y); let cov=0,vx=0,vy=0; for(let i=0;i<n;i++){ const dx=x[i]-mx, dy=y[i]-my; cov+=dx*dy; vx+=dx*dx; vy+=dy*dy; } return vx&&vy?cov/Math.sqrt(vx*vy):0; }
function returns(rows){ const out=[]; for(let i=1;i<(rows||[]).length;i++){ const p=num(rows[i-1].close), c=num(rows[i].close); if(p>0&&c>0)out.push({date:rows[i].date,r:c/p-1}); } return out; }
function alignReturns(seriesBySymbol){
  const dates=[...new Set(Object.values(seriesBySymbol).flat().map(x=>x.date))].sort();
  return dates.map(date=>{ const row={date}; let ok=true; for(const [s,arr] of Object.entries(seriesBySymbol)){ const hit=arr.find(x=>x.date===date); if(!hit){ok=false;break;} row[s]=hit.r; } return ok?row:null; }).filter(Boolean);
}
function valueOf(h, analysis){ return Math.max(0, num(h.lot)*num(analysis?.close || h.cost)); }
function makeScenario(aligned, weights, symbols, horizon, scenarioIndex){
  if(!aligned.length)return 0;
  let v=1;
  const seed=symbols.join('').split('').reduce((s,ch)=>s+ch.charCodeAt(0),0)+horizon*13;
  for(let d=0; d<horizon; d++){
    // Deterministik tarih örnekleme: geçmiş gerçek getirilerden seçer, Math.random kullanılmaz.
    const idx=(seed + scenarioIndex*37 + d*17 + (scenarioIndex%d+1||1)*11) % aligned.length;
    const day=aligned[idx];
    const pr=symbols.reduce((s,sym)=>s+(weights[sym]||0)*num(day[sym]),0);
    v*=1+pr;
  }
  return v-1;
}
function simulate(aligned, weights, symbols, horizon, count=500){
  const arr=[]; for(let i=0;i<count;i++)arr.push(makeScenario(aligned,weights,symbols,horizon,i));
  return {days:horizon, scenarios:arr.length, worst:pctile(arr,.05)*100, expected:avg(arr)*100, best:pctile(arr,.95)*100, positive:arr.filter(x=>x>0).length/Math.max(arr.length,1)*100};
}
function optimizeWeights(holdings, analyses, seriesBySymbol){
  const symbols=holdings.map(x=>x.symbol);
  const raw={};
  for(const h of holdings){
    const a=analyses[h.symbol]||{};
    const rs=returns(seriesBySymbol[h.symbol]||[]).map(x=>x.r);
    const vol=Math.max(std(rs)*Math.sqrt(22)*100, 3);
    const quality=clamp(num(a.finalScore,45)*0.45 + num(a.confidence,45)*0.30 + (100-num(a.risk,60))*0.25, 1, 100);
    raw[h.symbol]=quality/vol;
  }
  const sum=Object.values(raw).reduce((s,x)=>s+x,0)||1;
  const base={}; symbols.forEach(s=>base[s]=raw[s]/sum);
  // Tek hisse yoğunlaşmasını azalt: %35 tavan, kalanları tekrar dağıt.
  let capped={}, excess=0;
  symbols.forEach(s=>{ capped[s]=Math.min(base[s], .35); excess+=Math.max(0, base[s]-.35); });
  const roomSum=symbols.reduce((t,s)=>t+Math.max(0,.35-capped[s]),0)||1;
  symbols.forEach(s=>{ capped[s]+=excess*Math.max(0,.35-capped[s])/roomSum; });
  const finalSum=Object.values(capped).reduce((s,x)=>s+x,0)||1;
  return symbols.map(s=>({symbol:s, weight:capped[s]/finalSum*100, reason:`Skor ${Math.round(num(analyses[s]?.finalScore,0))}, güven ${Math.round(num(analyses[s]?.confidence,0))}, risk ${Math.round(num(analyses[s]?.risk,100))}`})).sort((a,b)=>b.weight-a.weight);
}

export function buildV20Portfolio({holdings=[], analyses={}, ohlcv={}}){
  const valid=holdings.map(h=>({symbol:String(h.symbol||'').toUpperCase().trim(), lot:num(h.lot), cost:num(h.cost)})).filter(h=>h.symbol&&h.lot>0);
  const total=valid.reduce((s,h)=>s+valueOf(h,analyses[h.symbol]),0)||1;
  const weights={}; valid.forEach(h=>weights[h.symbol]=valueOf(h,analyses[h.symbol])/total);
  const series={}; valid.forEach(h=>{ series[h.symbol]=returns(ohlcv[h.symbol]||[]); });
  const aligned=alignReturns(series);
  const symbols=valid.map(h=>h.symbol);
  const horizons=[5,10,22].map(d=>simulate(aligned,weights,symbols,d,500));
  const matrix=symbols.map(a=>symbols.map(b=>corr((series[a]||[]).map(x=>x.r),(series[b]||[]).map(x=>x.r))));
  const corrPairs=[]; for(let i=0;i<symbols.length;i++)for(let j=i+1;j<symbols.length;j++)corrPairs.push({a:symbols[i],b:symbols[j],corr:matrix[i][j]});
  corrPairs.sort((x,y)=>Math.abs(y.corr)-Math.abs(x.corr));
  const portDaily=aligned.map(day=>symbols.reduce((s,sym)=>s+(weights[sym]||0)*num(day[sym]),0));
  const monthlyVol=std(portDaily)*Math.sqrt(22)*100;
  const expectedMonth=horizons.find(x=>x.days===22)?.expected||0;
  const riskScore=clamp(monthlyVol*7 + Math.max(0, -pctile(portDaily,.05)*100)*4,0,100);
  const optimized=optimizeWeights(valid, analyses, ohlcv);
  const currentWeights=valid.map(h=>({symbol:h.symbol, weight:(weights[h.symbol]||0)*100}));
  const actions=currentWeights.map(c=>{ const opt=optimized.find(x=>x.symbol===c.symbol)?.weight||0; const diff=opt-c.weight; return {symbol:c.symbol,current:c.weight,suggested:opt,diff,action:diff>5?'Artır':diff<-5?'Azalt':'Koru'}; }).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
  return {success:true, engine:'V20 Institutional', totalValue:total, dataDays:aligned.length, horizons, riskScore, monthlyVol, correlation:{symbols,matrix,pairs:corrPairs.slice(0,10), maxPair:corrPairs[0]||null}, optimized, actions, note:'Senaryolar gerçek geçmiş günlük getirilerden deterministik olarak hesaplanır; random/pseudo veri kullanılmaz. Bu yatırım tavsiyesi değildir.'};
}
