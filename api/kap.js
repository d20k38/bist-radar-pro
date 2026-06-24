export default function handler(req,res){
  res.status(200).json({success:true, data:[
    {symbol:'PAPIL',type:'Takip',title:'KAP haber entegrasyonu için hazır alan'},
    {symbol:'TEZOL',type:'Takip',title:'Gerçek KAP kaynağı bağlandığında haber riski hesaplanacak'}
  ]});
}
