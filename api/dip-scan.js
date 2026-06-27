
import {getSymbols,getOhlcv} from '../lib/provider.js';
import {analyzeDip} from '../lib/dip-engine.js';
export default async function handler(req,res){
  try{
    const all=await getSymbols();
    const offset=Math.max(0,Number(req.query.offset||0));
    const limit=Math.min(8,Math.max(1,Number(req.query.limit||4)));
    const part=all.slice(offset,offset+limit);
    const data=[];
    for(const symbol of part){
      try{
        const rows=await getOhlcv(symbol,'1y','1d');
        const dip=analyzeDip(rows);
        data.push({symbol,...dip});
      }catch(e){data.push({symbol,error:e.message,confidence:0,dipProbability:0,label:'Veri yok'})}
    }
    data.sort((a,b)=>(b.confidence||0)-(a.confidence||0));
    res.status(200).json({success:true,total:all.length,offset,limit,count:data.length,data});
  }catch(e){res.status(200).json({success:false,error:e.message,data:[]})}
}
