import { getSymbols } from '../lib/engine.js';
export default async function handler(req,res){res.status(200).json({success:true,total:getSymbols().length,symbols:getSymbols()});}
