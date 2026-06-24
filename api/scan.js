import { scanAll } from './engine.js';
export default function handler(req,res){
  const data=scanAll();
  res.status(200).json({success:true, count:data.length, top20:data.slice(0,20), safe:data.filter(x=>x.decision==='GÜVENLİ AL').slice(0,20), opportunity:data.filter(x=>x.decision==='FIRSAT AL').slice(0,20), data});
}
