import {clamp} from './math.js';
export function detectPatterns(rows){
  const c=rows.map(x=>x.close), n=c.length-1;
  const last=c[n], min60=Math.min(...c.slice(-60)), max60=Math.max(...c.slice(-60));
  const left=c[Math.max(0,n-55)], mid=c[Math.max(0,n-28)];
  let best={name:'Belirgin formasyon yok',score:35,confidence:35,targetPct:6,notes:[]};
  const cup = left>mid*1.08 && last>mid*1.08 && last<left*1.08;
  const doubleBottom = Math.abs(min60-mid)/Math.max(1,min60)<0.08 && last>min60*1.10;
  const squeeze = (max60-min60)/Math.max(1,last)<0.18;
  if(cup) best={name:'Çanak / Çanak-Kulp adayı',score:78,confidence:72,targetPct:18,notes:['Dipten toparlanma','Kırılım teyidi izlenmeli']};
  if(doubleBottom && best.score<82) best={name:'İkili dip adayı',score:82,confidence:76,targetPct:16,notes:['Dip bölgesi korunmuş','Boyun çizgisi takip edilmeli']};
  if(squeeze && best.score<65) best={name:'Sıkışma / flama adayı',score:65,confidence:62,targetPct:12,notes:['Volatilite daralıyor','Hacimle kırılım beklenmeli']};
  best.stop = last * (1 - Math.max(4, best.targetPct/3)/100);
  best.target = last * (1 + best.targetPct/100);
  return best;
}
