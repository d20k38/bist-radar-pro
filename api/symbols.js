import { getSymbols } from '../lib/data-provider.js';
export default async function handler(req,res){
  try{const symbols=await getSymbols(); res.status(200).json({success:true,count:symbols.length,symbols});}
  catch(e){res.status(500).json({success:false,error:e.message,symbols:[]});}
}
