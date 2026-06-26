import {loadMemory,bestRules} from '../lib/learning-engine.js';
export default async function handler(req,res){res.setHeader('Content-Type','application/json; charset=utf-8'); const memory=await loadMemory(); res.status(200).json({success:true,memory,bestRules:bestRules(memory)});}
