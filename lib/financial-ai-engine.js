function n(x,d=0){x=Number(x);return Number.isFinite(x)?x:d}
function clamp(x){return Math.max(0,Math.min(100,Math.round(n(x))))}
function norm(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function upper(s){return norm(s).toLocaleUpperCase('tr-TR')}
function pct(a,b){a=n(a);b=n(b);return b?((a-b)/Math.abs(b))*100:0}
function round(x,d=2){return Number.isFinite(Number(x))?+Number(x).toFixed(d):0}
function grade(s){s=clamp(s);return s>=90?'A+':s>=80?'A':s>=70?'B+':s>=60?'B':s>=50?'C':'D'}
function moneyHints(text){const out=[]; const re=/((?:\d{1,3}(?:[\.\s]\d{3})+|\d+)(?:,\d+)?\s*(?:TL|TRY|USD|EUR|AVRO|MİLYON\s*TL|MİLYAR\s*TL))/gi; let m; while((m=re.exec(text))&&out.length<6) out.push(norm(m[1])); return out;}
function findFinancialDisclosure(items=[]){
  const keys=['FİNANSAL RAPOR','FİNANSAL TABLO','BİLANÇO','FAALİYET RAPORU','KAR VEYA ZARAR','KÂR VEYA ZARAR','NET DÖNEM KARI','NET DÖNEM ZARARI'];
  return (Array.isArray(items)?items:[]).find(x=>keys.some(k=>upper([x.title,x.summary,x.category].join(' ')).includes(k)))||null;
}
function analyzeStatementObject(fin={}){
  const revenue=n(fin.revenue ?? fin.sales ?? fin.netSales, NaN);
  const prevRevenue=n(fin.prevRevenue ?? fin.previousRevenue ?? fin.prevSales, NaN);
  const netIncome=n(fin.netIncome ?? fin.netProfit ?? fin.profit, NaN);
  const prevNetIncome=n(fin.prevNetIncome ?? fin.previousNetIncome ?? fin.prevProfit, NaN);
  const equity=n(fin.equity ?? fin.shareholdersEquity, NaN);
  const assets=n(fin.assets ?? fin.totalAssets, NaN);
  const liabilities=n(fin.liabilities ?? fin.totalLiabilities, NaN);
  const cash=n(fin.cash ?? fin.cashAndEquivalents, NaN);
  const debt=n(fin.debt ?? fin.financialDebt ?? fin.totalDebt, NaN);
  const ebitda=n(fin.ebitda, NaN);
  const marketCap=n(fin.marketCap, NaN);
  const scores={};
  if(Number.isFinite(revenue)&&Number.isFinite(prevRevenue)) scores.growth=clamp(50+pct(revenue,prevRevenue)*1.2);
  if(Number.isFinite(netIncome)&&Number.isFinite(prevNetIncome)) scores.profitGrowth=clamp(50+pct(netIncome,prevNetIncome));
  if(Number.isFinite(revenue)&&Number.isFinite(netIncome)) scores.margin=clamp(50+(netIncome/revenue)*180);
  if(Number.isFinite(equity)&&Number.isFinite(netIncome)) scores.roe=clamp(50+(netIncome/equity)*170);
  if(Number.isFinite(assets)&&Number.isFinite(liabilities)) scores.leverage=clamp(100-(liabilities/assets)*85);
  if(Number.isFinite(cash)&&Number.isFinite(debt)) scores.cashDebt=clamp(50+((cash-debt)/Math.max(debt,1))*35);
  if(Number.isFinite(ebitda)&&Number.isFinite(debt)) scores.debtEbitda=clamp(100-(debt/Math.max(ebitda,1))*12);
  if(Number.isFinite(marketCap)&&Number.isFinite(netIncome)&&netIncome>0) scores.pe=clamp(90-(marketCap/netIncome)*1.8);
  const vals=Object.values(scores).filter(Number.isFinite);
  const score=vals.length?clamp(vals.reduce((a,b)=>a+b,0)/vals.length):50;
  return {available:vals.length>0,score,scores,ratios:{revenue,prevRevenue,netIncome,prevNetIncome,equity,assets,liabilities,cash,debt,ebitda,marketCap},coverage:vals.length};
}
function marketProxy(core={}){
  const a=core.analysis||{}; const q=core.quality||{}; const inst=core.institutional||{};
  const trend=clamp(a.trend||50), money=clamp(a.money||50), risk=clamp(100-n(a.risk,50));
  const quality=clamp(q.score||inst.score||a.confidence||50);
  const score=clamp(trend*.22+money*.22+risk*.24+quality*.32);
  return {score, components:{trend,money,risk,quality}, note:'Doğrudan finansal tablo kalemleri bulunamadığı için bu bölüm sadece piyasanın finansal kaliteyi nasıl fiyatladığını gösteren teknik/likidite destekli yardımcı okuma üretir; finansal tablo analizi yerine geçmez.'};
}
export function analyzeFinancialAI({symbol='GENEL', core={}, financialData=null, kapItems=[]}={}){
  const statement=financialData && typeof financialData==='object' ? analyzeStatementObject(financialData) : {available:false,score:50,scores:{},ratios:{},coverage:0};
  const disclosure=findFinancialDisclosure(kapItems);
  const proxy=marketProxy(core);
  let score=statement.available ? clamp(statement.score*.78 + proxy.score*.22) : clamp(proxy.score*.70 + (disclosure?62:50)*.30);
  const text=disclosure?[disclosure.title,disclosure.summary,disclosure.category].join(' '):'';
  const U=upper(text);
  const good=['KAR','KÂR','ARTIŞ','BÜYÜME','GELİR','HASILAT','FAVÖK','ÖZKAYNAK'].filter(k=>U.includes(k));
  const bad=['ZARAR','AZALIŞ','DÜŞÜŞ','BORÇ','NEGATİF','SERMAYE KAYBI'].filter(k=>U.includes(k));
  if(disclosure) score=clamp(score + good.length*3 - bad.length*5);
  const polarity=score>=68?'Olumlu':score<=45?'Zayıf':'Nötr';
  const amounts=moneyHints(text);
  const reasons=[];
  if(statement.available){
    const s=statement.scores;
    if(s.growth!==undefined) reasons.push(`Satış/büyüme skoru: ${s.growth}/100`);
    if(s.margin!==undefined) reasons.push(`Net kârlılık marjı skoru: ${s.margin}/100`);
    if(s.roe!==undefined) reasons.push(`Özkaynak kârlılığı skoru: ${s.roe}/100`);
    if(s.leverage!==undefined) reasons.push(`Borçluluk/kaldıraç skoru: ${s.leverage}/100`);
    if(s.cashDebt!==undefined) reasons.push(`Nakit/borç dengesi skoru: ${s.cashDebt}/100`);
  }else{
    reasons.push('Yapılandırılmış finansal tablo kalemleri bulunamadı; skor doğrudan bilanço kalemi yerine gerçek OHLC/hacimden türetilen piyasa kalite okuması ve son finansal KAP varlığıyla desteklendi.');
  }
  if(disclosure){ reasons.push(`Son finansal KAP: ${disclosure.title||'Finansal bildirim'}`); if(amounts.length) reasons.push(`Metinden yakalanan tutar/oranlar: ${amounts.join(', ')}`); }
  const risks=[];
  if(!statement.available) risks.push('Finansal tablo kalemleri yapılandırılmış veri olarak alınamadığı için kârlılık, borçluluk ve nakit akışı yorumu sınırlıdır.');
  if(bad.length) risks.push(`Finansal bildirim metninde risk kelimeleri görüldü: ${bad.join(', ')}`);
  if(score<55) risks.push('Finansal kalite / piyasa teyidi zayıf; teknik sinyal tek başına güçlü sayılmamalıdır.');
  const summary=statement.available?
    `${symbol} için Financial AI yapılandırılmış finansal tablo kalemlerini okuyarak ${score}/100 skor üretti. Kapsanan rasyo sayısı: ${statement.coverage}. Genel finansal görünüm: ${polarity}.`:
    `${symbol} için yapılandırılmış finansal tablo kalemi bulunamadı. Financial AI, son finansal KAP bildirimi ${disclosure?'bulundu':'bulunamadı'} ve gerçek OHLC/hacim tabanlı piyasa kalite okuması ile nötr/yardımcı değerlendirme yaptı.`;
  const comment=statement.available?
    `Finansal skor ${grade(score)} seviyesinde. Skoru en çok etkileyen alanlar: ${Object.entries(statement.scores).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}/100`).join(', ')||'sınırlı veri'}. Bu katman teknik AI kararını temel kalite açısından desteklemek için kullanılır.`:
    `Bu sürüm demo finansal veri üretmez. Finansal tablo verisi yoksa karar motoruna temkinli ve düşük ağırlıklı katkı verir. Gerçek bilanço verisi bağlandığında büyüme, kârlılık, borçluluk ve nakit kalemleri doğrudan puanlanacaktır.`;
  return {available:statement.available||!!disclosure,symbol,score,grade:grade(score),polarity,summary,comment,statement,marketProxy:proxy,latestFinancialKap:disclosure||null,amounts,reasons,risks,source:statement.available?'Yapılandırılmış finansal tablo verisi':'KAP finansal bildirim + gerçek OHLC/hacim yardımcı okuma',random:false};
}
export function financialScoreFromAI(fin){return clamp(fin?.score||50)}
