export const avg=a=>{const b=a.filter(Number.isFinite);return b.length?b.reduce((s,x)=>s+x,0)/b.length:null};
export const sma=(a,n)=>a.map((_,i)=>i<n-1?null:avg(a.slice(i-n+1,i+1)));
export function ema(a,n){const k=2/(n+1),out=[];a.forEach((v,i)=>out[i]=i? v*k+out[i-1]*(1-k):v);return out}
export function rsi(c,n=14){const out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let g=0,l=0;for(let j=i-n+1;j<=i;j++){const d=c[j]-c[j-1];d>0?g+=d:l-=d}const rs=l===0?100:g/l;out[i]=100-100/(1+rs)}return out}
export function macd(c){const e12=ema(c,12),e26=ema(c,26),m=c.map((_,i)=>e12[i]-e26[i]),s=ema(m,9),h=m.map((v,i)=>v-s[i]);return{m,s,h}}
export function atr(h,l,c,n=14){const tr=c.map((_,i)=>i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]);return sma(tr,n)}
export function obv(c,v){const o=[0];for(let i=1;i<c.length;i++)o[i]=o[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0);return o}
export function roc(c,n=12){return c.map((x,i)=>i<n?null:((x-c[i-n])/c[i-n])*100)}
export function adx(h,l,c,n=14){const p=Array(c.length).fill(null),m=Array(c.length).fill(null),dx=Array(c.length).fill(null);for(let i=1;i<c.length;i++){const up=h[i]-h[i-1],dn=l[i-1]-l[i],tr=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));const pdm=up>dn&&up>0?up:0,mdm=dn>up&&dn>0?dn:0;p[i]=tr?100*pdm/tr:0;m[i]=tr?100*mdm/tr:0;dx[i]=(p[i]+m[i])?100*Math.abs(p[i]-m[i])/(p[i]+m[i]):0}return{adx:sma(dx.map(x=>x??0),n),pdi:sma(p.map(x=>x??0),n),mdi:sma(m.map(x=>x??0),n)}}
export function supertrend(h,l,c,n=10,mul=3){const at=atr(h,l,c,n),dir=Array(c.length).fill(1),st=Array(c.length).fill(null);for(let i=0;i<c.length;i++){const mid=(h[i]+l[i])/2,ub=mid+(at[i]||0)*mul,lb=mid-(at[i]||0)*mul;if(i===0){st[i]=lb;continue}dir[i]=c[i]>(st[i-1]??lb)?1:c[i]<(st[i-1]??ub)?-1:dir[i-1];st[i]=dir[i]===1?Math.max(lb,st[i-1]??lb):Math.min(ub,st[i-1]??ub)}return{st,dir}}
