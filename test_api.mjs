import symbols from './api/symbols.js';
import stock from './api/stock.js';
import scan from './api/scan.js';
import kap from './api/kap.js';
import learning from './api/learning.js';
const call=async(fn,query={})=>{let out={}; const res={headers:{},setHeader(k,v){this.headers[k]=v},status(c){out.status=c; return {json:j=>{out.json=j}}}}; await fn({query},res); return out;};
for (const [name,fn,q] of [['symbols',symbols,{}],['stock',stock,{symbol:'PAPIL',range:'3mo'}],['scan',scan,{limit:'1',offset:'0'}],['kap',kap,{symbol:'PAPIL'}],['learning',learning,{symbol:'PAPIL'}]]){
  const t=Date.now(); const o=await call(fn,q); console.log(name, Date.now()-t, o.status, o.json && o.json.success, o.json && (o.json.error||o.json.count||o.json.symbol||''));
}
