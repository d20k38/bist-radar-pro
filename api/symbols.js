import {getSymbols} from '../lib/provider.js';export default async function handler(req,res){res.status(200).json({success:true,symbols:await getSymbols()})}
