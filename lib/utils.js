
export const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));
export const avg=arr=>arr&&arr.length?arr.reduce((a,b)=>a+(Number(b)||0),0)/arr.length:0;
export const last=arr=>arr&&arr.length?arr[arr.length-1]:null;
export const pct=(a,b)=>b?((a-b)/b)*100:0;
export const round=(n,d=2)=>Number((Number(n)||0).toFixed(d));
