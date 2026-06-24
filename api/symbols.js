import { getSymbols } from '../lib/data-provider.js';
export default async function handler(req,res){
  try{res.status(200).json({success:true,symbols:await getSymbols()});}
  catch(e){res.status(500).json({success:false,error:e.message,symbols:[]});}
}
