const { master } = require('./lib/unified-provider');
module.exports = async function handler(req,res){
  try{
    const raw=String(req.query.portfolio||'');
    const items=raw.split(',').map(x=>{const [symbol,lot,cost]=x.split(':');return {symbol:(symbol||'').toUpperCase(),lot:Number(lot||0),cost:Number(cost||0)}}).filter(x=>x.symbol);
    const data=await Promise.all(items.map(async p=>{try{const m=await master(p.symbol); const value=(m.price||0)*p.lot; const costValue=p.cost*p.lot; return {...p, price:m.price, value, pnl:value-costValue, pnlPct:costValue?((value-costValue)/costValue)*100:null, score:m.score, decision:m.decision, confidence:m.confidence};}catch(e){return {...p,error:e.message}}}));
    res.status(200).json({success:true, portfolio:data, data, summary:{value:data.reduce((s,x)=>s+(x.value||0),0), pnl:data.reduce((s,x)=>s+(x.pnl||0),0)}});
  }catch(e){res.status(200).json({success:false,error:e.message||String(e)})}
};
