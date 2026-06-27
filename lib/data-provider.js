
import fs from 'fs';
import path from 'path';
export async function getSymbols(){const p=path.join(process.cwd(),'data','symbols.json');return JSON.parse(fs.readFileSync(p,'utf8'));}
export async function getOhlcv(symbol='PAPIL',days=260){let seed=[...symbol].reduce((a,c)=>a+c.charCodeAt(0),0);const rand=()=>{seed=(seed*9301+49297)%233280;return seed/233280};let price=10+(seed%80);const rows=[];const now=new Date();for(let i=days*1.45;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);if(d.getDay()===0||d.getDay()===6)continue;const drift=(rand()-0.48)*2.2;const open=price;price=Math.max(1,price*(1+drift/100));const high=Math.max(open,price)*(1+rand()*0.025);const low=Math.min(open,price)*(1-rand()*0.025);const volume=Math.floor(500000+rand()*12000000);rows.push({date:d.toISOString().slice(0,10),open,high,low,close:price,volume});}return rows.slice(-days);}
