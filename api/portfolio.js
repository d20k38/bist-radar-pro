import { analyze } from './engine.js';
const holdings=[{symbol:'MRSHL',lot:286,cost:2470},{symbol:'PAPIL',lot:7000,cost:27.5},{symbol:'TEZOL',lot:6156,cost:20.96},{symbol:'USAK',lot:29222,cost:3.05},{symbol:'VKING',lot:1000,cost:55}];
export default function handler(req,res){
  const data=holdings.map(h=>{const a=analyze(h.symbol); return {...h, ...a, pnlPct:Number(((a.price/h.cost-1)*100).toFixed(2))};});
  res.status(200).json({success:true,data});
}
