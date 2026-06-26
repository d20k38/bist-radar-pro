import {getSymbols} from '../lib/data-provider.js';
export default async function handler(req,res){res.setHeader('Content-Type','application/json; charset=utf-8'); const symbols=await getSymbols(); res.status(200).json({success:true,total:symbols.length,symbols});}
