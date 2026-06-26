import fs from 'fs/promises';
import path from 'path';
export async function loadMemory(){
  try { return JSON.parse(await fs.readFile(path.join(process.cwd(),'data','ai-memory.json'),'utf8')); }
  catch { return {weights:{trend:.15,momentum:.1,money:.15,pattern:.1,backtest:.15,kapNews:.1,financial:.1,sector:.05,learning:.1}, yearlyPerformance:[], ruleStats:[]}; }
}
export function learningScore(memory){
  const stats=memory.ruleStats||[];
  if(!stats.length) return 60;
  return Math.round(stats.reduce((s,x)=>s+(x.successRate||50),0)/stats.length);
}
export function bestRules(memory){ return [...(memory.ruleStats||[])].sort((a,b)=>b.successRate-a.successRate).slice(0,3); }
