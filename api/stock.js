import scan from './scan.js';
export default async function handler(req,res){
 const {symbol='PAPIL'}=req.query;
 const fakeRes={status:()=>fakeRes,json:(x)=>x};
 const out=await scan(req,fakeRes);
 const list=out?.data||[];
 const item=list.find(x=>x.symbol.toUpperCase()===symbol.toUpperCase())||list[0];
 res.status(200).json({success:true,data:item});
}
