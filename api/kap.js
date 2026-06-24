export default async function handler(req,res){
 res.status(200).json({success:true,note:'KAP entegrasyonu için olumlu/olumsuz haber anahtar kelime taraması burada yapılacak.',data:[
  {symbol:'PAPIL',type:'nötr',title:'Demo KAP izleme alanı'},
  {symbol:'MRSHL',type:'nötr',title:'Canlı KAP bağlantısı eklenebilir'}
 ]});
}
