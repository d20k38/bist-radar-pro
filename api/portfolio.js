export default async function handler(req,res){
 res.status(200).json({success:true,data:[
  {symbol:'MRSHL',lot:286,cost:2470},
  {symbol:'PAPIL',lot:7000,cost:27.50},
  {symbol:'TEZOL',lot:6156,cost:20.96},
  {symbol:'USAK',lot:29222,cost:3.05},
  {symbol:'VKING',lot:1000,cost:55}
 ]});
}
