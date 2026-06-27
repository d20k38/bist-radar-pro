import {clamp} from './math.js';
export function quickBacktest(rows, signalScore){
  const c=rows.map(x=>x.close); let total=0, win=0, returns=[], waits=[];
  for(let i=80;i<c.length-21;i+=5){
    const past=c[i], future=c[i+20];
    const ret=((future-past)/past)*100;
    const synthetic = signalScore + Math.sin(i/7)*15;
    if(synthetic>60){ total++; returns.push(ret); waits.push(20); if(ret>0) win++; }
  }
  const avgReturn=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
  const maxDrawdown=Math.min(0,...returns);
  const successRate=total?Math.round(win/total*100):55;
  return {signals:total,success:win,successRate,avgReturn:+avgReturn.toFixed(2),avgWait: waits.length?20:0,maxDrawdown:+maxDrawdown.toFixed(2),riskReward:clamp(50+avgReturn*3+successRate/2)};
}
