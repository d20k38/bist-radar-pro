import { getKapNews } from '../lib/data-provider.js';
export default async function handler(req,res){
  const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
  res.status(200).json({success:true,symbol,news:await getKapNews(symbol)});
}
