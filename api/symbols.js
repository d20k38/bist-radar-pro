import {getSymbols,getSymbolMeta} from '../lib/provider.js';
export default async function handler(req,res){const symbols=await getSymbols();res.status(200).json({success:true,symbols,count:symbols.length,meta:getSymbolMeta()})}
