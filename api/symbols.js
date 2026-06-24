import { BIST_SYMBOLS } from './lib/symbols.js';
export default function handler(req,res){ res.status(200).json({success:true,count:BIST_SYMBOLS.length,data:BIST_SYMBOLS}); }
