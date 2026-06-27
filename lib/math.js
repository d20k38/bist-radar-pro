export const avg = a => { const b=a.filter(Number.isFinite); return b.length?b.reduce((s,x)=>s+x,0)/b.length:0; };
export const clamp = (x,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(Number.isFinite(x)?x:0)));
export const last = a => a[a.length-1];
export function sma(a,n){return a.map((_,i)=>i<n-1?null:avg(a.slice(i-n+1,i+1)));}
export function ema(a,n){const k=2/(n+1), out=[]; a.forEach((v,i)=>out[i]=i? v*k+out[i-1]*(1-k):v); return out;}
export function stdev(a){const m=avg(a); return Math.sqrt(avg(a.map(x=>(x-m)**2)));}
export function pct(a,b){return b?((a-b)/b)*100:0;}
