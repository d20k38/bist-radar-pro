let providerCache = null;
function getProvider(){
  if(providerCache) return providerCache;
  providerCache = require('../lib/unified-provider');
  return providerCache;
}
function safeSymbols(){
  try{ return getProvider().SYMBOLS || []; }catch(_){ return []; }
}

function send(res, obj, cache='s-maxage=30, stale-while-revalidate=120'){
  try{ res.setHeader('Cache-Control', cache); }catch(_){ }
  res.status(200).json(obj);
}
function bad(res, msg){ send(res,{success:false,error:msg}); }
function symbolsFrom(q){ return String(q.symbols || q.symbol || '').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean); }
async function one(s, period='1y'){
  try{ const { master } = getProvider(); return await master(s,{period});}
  catch(e){return {success:false,symbol:s,error:e.message||String(e)}}
}
async function handleSymbols(req,res){
  const SYMBOLS = safeSymbols();
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit || SYMBOLS.length || 0)));
  const offset = Math.max(0, Number(req.query.offset || 0));
  const slice = SYMBOLS.slice(offset, offset+limit);
  send(res,{ success:true, total:SYMBOLS.length, offset, limit, symbols:slice }, 's-maxage=3600, stale-while-revalidate=86400');
}
async function handleStock(req,res){
  const symbol = String(req.query.symbol||'').toUpperCase().trim();
  if(!symbol) return bad(res,'symbol gerekli');
  const period = req.query.range || req.query.period || '1y';
  const m = await one(symbol, period);
  if(!m.success) return send(res,m);
  send(res,{ ...m, rows:m.ohlcv });
}
async function handleDecision(req,res){
  const symbols = symbolsFrom(req);
  if(!symbols.length) return bad(res,'symbol veya symbols gerekli');
  const limit = Math.max(1, Math.min(30, Number(req.query.limit||20)));
  const list = symbols.slice(0, limit);
  const results = await Promise.all(list.map(s=>one(s, req.query.range || req.query.period || '1y')));
  if(list.length===1 && !req.query.symbols) return send(res, results[0]);
  send(res,{success:true,count:results.filter(x=>x.success).length,total:list.length,results,data:results});
}
async function handleDip(req,res){
  const symbols = symbolsFrom(req).slice(0, Math.max(1, Math.min(30, Number(req.query.limit||20))));
  if(!symbols.length) return bad(res,'symbol gerekli');
  const rows = await Promise.all(symbols.map(async s=>{
    const m = await one(s, req.query.range || '1y');
    if(!m.success) return m;
    const ind=m.indicators||{};
    const dipScore = Math.max(0, Math.min(100, 100-(Number(ind.dipDistance)||0)*3));
    return {success:true,symbol:s,price:m.price,last:m.price,dipScore,score:dipScore,strongestDip:ind.low250,dipDistance:ind.dipDistance,decision:m.decision,aiScore:m.score,rvol:ind.rvol20,vwap:ind.vwap,cmf:ind.cmf,mfi:ind.mfi};
  }));
  if(symbols.length===1 && !req.query.symbols) return send(res, rows[0]);
  send(res,{success:true,results:rows,data:rows.filter(x=>x.success),errors:rows.filter(x=>!x.success)});
}
async function handleScan(req,res){
  const offset = Math.max(0, Number(req.query.offset || 0));
  const limit = Math.max(1, Math.min(30, Number(req.query.limit || 12)));
  const explicit = String(req.query.symbols||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  const SYMBOLS = safeSymbols();
  const universe = explicit.length ? explicit : SYMBOLS.slice(offset, offset+limit);
  const selected = universe.slice(0,limit);
  const started = Date.now();
  const stageSummary = { symbols:selected.length, ohlcvOk:0, volumeOk:0, indicatorOk:0, decisionOk:0, masterOk:0 };
  const results = [];
  const errors = [];
  for(const s of selected){
    try{
      const m = await one(s, req.query.range || req.query.period || '1y');
      if(m && m.success){
        const h=m.dataHealth||m.indicators?.health||{};
        stageSummary.ohlcvOk += (m.ohlcv||[]).length>0 ? 1 : 0;
        stageSummary.volumeOk += h.volume ? 1 : 0;
        stageSummary.indicatorOk += m.indicators ? 1 : 0;
        stageSummary.decisionOk += m.decision ? 1 : 0;
        stageSummary.masterOk += 1;
        results.push(m);
      }else{
        const err={success:false,symbol:s,error:m?.error||'master object üretilemedi',stage:m?.stage||'master'};
        errors.push(err);
      }
    }catch(e){
      errors.push({success:false,symbol:s,error:e.message||String(e),stage:'fatal'});
    }
  }
  const ok = results.filter(x=>x.success).sort((a,b)=>(Number(b.score||b.finalScore||0))-(Number(a.score||a.finalScore||0)));
  const total = explicit.length ? explicit.length : SYMBOLS.length;
  const nextOffset = explicit.length ? selected.length : Math.min(offset+limit,total);
  const done = explicit.length ? true : nextOffset>=total;
  const diagnostic = {
    message: ok.length ? 'R15 core zinciri çalıştı.' : 'R15: semboller işlendi ancak başarılı Master Stock Object üretilemedi.',
    chain: stageSummary,
    firstErrors: errors.slice(0,8),
    hint: ok.length ? '' : 'Diagnostic Mode ile ilk hatalı sembolü kontrol edin: /api/core?action=diagnostic&symbol='+(selected[0]||'PAPIL'),
    durationMs: Date.now()-started
  };
  send(res,{success:true,total,offset,limit,nextOffset,done,processed:selected.length,successCount:ok.length,errorCount:errors.length,stageSummary,diagnostic,results:ok,data:ok,errors});
}
async function handlePortfolio(req,res){
  try{
    const raw=String(req.query.portfolio||'');
    const items=raw.split(',').map(x=>{const [symbol,lot,cost]=x.split(':');return {symbol:(symbol||'').toUpperCase(),lot:Number(lot||0),cost:Number(cost||0)}}).filter(x=>x.symbol);
    const data=await Promise.all(items.map(async p=>{const m=await one(p.symbol); if(!m.success)return {...p,error:m.error}; const value=(m.price||0)*p.lot; const costValue=p.cost*p.lot; return {...p,price:m.price,value,pnl:value-costValue,pnlPct:costValue?((value-costValue)/costValue)*100:null,score:m.score,decision:m.decision,confidence:m.confidence};}));
    send(res,{success:true,portfolio:data,data,summary:{value:data.reduce((s,x)=>s+(x.value||0),0),pnl:data.reduce((s,x)=>s+(x.pnl||0),0)}});
  }catch(e){send(res,{success:false,error:e.message||String(e)})}
}
async function handleKap(req,res){
  try{
    const symbol = String(req.query.symbol || '').toUpperCase().trim();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));
    // R14.1: KAP tarafı asla Vercel HTML/error döndürmez. Canlı provider yoksa güvenli JSON döner.
    const items = [];
    return send(res,{
      success:true,
      live:false,
      source:'R14.1 kap-safe-json',
      symbol,
      limit,
      items,
      data:items,
      count:0,
      kapAI:null,
      institutional:{
        items,
        score:50,
        summary:'KAP canlı veri sağlayıcısı bağlı değil veya yanıt alınamadı. Demo/random haber üretilmedi; KAP etkisi nötr kabul edildi.'
      },
      ai:{
        impactScore:50,
        reliabilityScore:0,
        eventType:'Veri yok',
        summary:'Okunabilir gerçek KAP bildirimi bulunamadı.',
        comment:'KAP kaynağı güvenli JSON döndürdü ancak canlı haber içeriği yok. Karar motoru KAP katkısını nötr bırakmalıdır.'
      },
      demoData:false,
      timestamp:new Date().toISOString()
    }, 'no-store');
  }catch(e){
    return send(res,{
      success:false,
      source:'R14.1 kap-safe-json',
      error:e.message||String(e),
      items:[], data:[], count:0, demoData:false,
      institutional:{items:[],score:50,summary:'KAP modülü hata aldı; JSON dışı cevap engellendi.'}
    }, 'no-store');
  }
}
async function handleBacktest(req,res){
  const s=String(req.query.symbol||'').toUpperCase().trim();
  if(!s) return bad(res,'symbol gerekli');
  const m=await one(s, req.query.range || '2y');
  if(!m.success) return send(res,m);
  const rows=m.ohlcv||[]; const period=Math.max(2, Number(req.query.period||30));
  const rets=[]; for(let i=0;i+period<rows.length;i++){ const a=rows[i].close,b=rows[i+period].close; if(a>0&&b>0) rets.push((b/a-1)*100); }
  const wins=rets.filter(x=>x>0).length; const avg=rets.length?rets.reduce((a,b)=>a+b,0)/rets.length:0; const worst=rets.length?Math.min(...rets):0;
  send(res,{success:true,symbol:s,summary:{totalSignals:rets.length,successRate:rets.length?wins/rets.length*100:0,avgReturn:avg,maxDrawdown:worst},data:rets.slice(-100)});
}
async function handleLearning(req,res){
  const s=String(req.query.symbol||'').toUpperCase().trim();
  if(!s) return bad(res,'symbol gerekli');
  const m=await one(s,'2y');
  if(!m.success) return send(res,m);
  const ind=m.indicators||{};
  send(res,{success:true,symbol:s,learningScore:m.score||0,confidence:m.confidence,pattern:{rvol:ind.rvol20,cmf:ind.cmf,vwap:ind.vwap,mfi:ind.mfi},note:'R12.1 core öğrenme özeti gerçek OHLCV göstergelerinden türetildi.'});
}

async function handleDiagnostic(req,res){
  const explicit = symbolsFrom(req);
  const symbol = String(req.query.symbol||'').toUpperCase().trim();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const offset = Math.max(0, Number(req.query.offset || 0));
  const period = req.query.range || req.query.period || '1y';
  try{
    if(explicit.length>1){
      const { diagnoseMany } = getProvider();
      const out = await diagnoseMany(explicit, {period, limit});
      return send(res, out, 'no-store');
    }
    if(symbol || explicit.length===1){
      const { diagnose } = getProvider();
      const out = await diagnose(symbol || explicit[0], {period});
      return send(res, out, 'no-store');
    }
    const SYMBOLS = safeSymbols();
    const { diagnoseMany } = getProvider();
    const list = SYMBOLS.slice(offset, offset+limit);
    const out = await diagnoseMany(list, {period, limit});
    out.totalUniverse = SYMBOLS.length;
    out.offset = offset;
    out.limit = limit;
    out.done = offset + limit >= SYMBOLS.length;
    return send(res, out, 'no-store');
  }catch(e){
    return send(res,{success:false,error:e.message||String(e), source:'R14 diagnostic'}, 'no-store');
  }
}

async function handleCommittee(req,res){
  const s=String(req.query.symbol||'').toUpperCase().trim();
  if(!s) return bad(res,'symbol gerekli');
  const m=await one(s,'1y');
  send(res,{success:m.success,symbol:s,committeeScore:m.score||0,decision:m.decision||'TUT',confidence:m.confidence||'C',data:m});
}
module.exports = async function handler(req,res){
  try{
    const action = String(req.query.action || req.query.a || '').toLowerCase();
    const map = {
      symbols:handleSymbols, stock:handleStock, quote:handleStock, decision:handleDecision,
      dip:handleDip, scan:handleScan, 'institutional-scan':handleScan, institutional:handleScan,
      'portfolio-advice':handlePortfolio, portfolio:handlePortfolio,
      kap:handleKap, news:handleKap, diagnostic:handleDiagnostic, diagnose:handleDiagnostic, health:handleDiagnostic, stabilize:handleDiagnostic, learning:handleLearning, backtest:handleBacktest, committee:handleCommittee
    };
    const fn = map[action];
    if(!fn) return bad(res,'Bilinmeyen core action: '+(action||'-'));
    return await fn(req,res);
  }catch(e){ return send(res,{success:false,error:e.message||String(e),source:'R15 core-stabilization'}); }
};
