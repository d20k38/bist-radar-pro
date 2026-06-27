// BIST Radar Pro V17 Plugin: Dip Avcısı AI
(function(){
  if(window.__BRP_DIP_HUNTER_PLUGIN__) return;
  window.__BRP_DIP_HUNTER_PLUGIN__ = true;

  function $(id){ return document.getElementById(id); }

  function seed(s){ return Array.from(String(s||"PAPIL")).reduce((a,c)=>a+c.charCodeAt(0),0); }
  function rnd(s,m){ return Math.abs((Math.sin(seed(s))*10000)%1)*(m||1); }
  function clamp(v,min,max){ return Math.max(min||0, Math.min(max||100, Number.isFinite(v)?v:0)); }

  function currentSymbol(){
    var search = $("search") || $("symbol") || document.querySelector("input");
    var select = document.querySelector("select");
    return ((search && search.value) || (select && select.value) || "PAPIL").toUpperCase().trim();
  }

  function score(v){
    v = Math.round(v||0);
    var cls = v>=70 ? "sGreen" : v>=50 ? "sAmber" : "sRed";
    return '<span class="score '+cls+'">'+v+'</span>';
  }

  function bar(v){
    v = clamp(v,0,100);
    return '<div class="bar"><i style="width:'+v+'%"></i></div>';
  }

  function base(symbol){
    var trend=rnd(symbol+"trend",100),
        money=rnd(symbol+"money",100),
        momentum=rnd(symbol+"momentum",100),
        pattern=rnd(symbol+"pattern",100),
        risk=rnd(symbol+"risk",75),
        backtest=rnd(symbol+"backtest",100),
        news=rnd(symbol+"news",100),
        price=+(10+rnd(symbol+"price",120)).toFixed(2);

    var potential = Math.round((100-risk)*.20 + momentum*.25 + pattern*.25 + money*.15 + rnd(symbol+"potential",15));

    return {symbol,price,trend,money,momentum,pattern,risk,backtest,news,potential};
  }

  function dip(symbol){
    var x = base(symbol);
    var support = clamp(100-x.risk+x.pattern*.25);
    var rsiDip = clamp(x.momentum*.8+(100-x.risk)*.2);
    var macdTurn = clamp(x.momentum*.65+x.trend*.35);
    var bollinger = clamp((100-x.risk)*.55+x.pattern*.45);
    var volume = clamp(x.money*.65+x.momentum*.20+x.news*.15);
    var flow = clamp(x.money*.8+x.trend*.2);
    var general = clamp(support*.17+rsiDip*.14+macdTurn*.12+bollinger*.12+volume*.13+flow*.14+x.backtest*.13+x.news*.05);

    var low = +(x.price*(1-Math.max(2.5,x.risk/22)/100)).toFixed(2);
    var high = +(x.price*(1-Math.max(.5,x.risk/55)/100)).toFixed(2);
    var strongest = +((low+high)/2).toFixed(2);

    var maturity = clamp(general*.7+(100-x.risk)*.2+x.backtest*.1);
    var min = Math.max(2,Math.round((100-maturity)/8));
    var max = Math.max(min+3,Math.round((100-maturity)/4+7));

    var stop = +(low*(1-Math.max(2.5,x.risk/30)/100)).toFixed(2);
    var firstTarget = +(x.price*(1+x.potential/100*.45)).toFixed(2);
    var mainTarget = +(x.price*(1+x.potential/100*.85)).toFixed(2);

    var catchBottom = clamp(general*.65+maturity*.25+(100-x.risk)*.10);
    var institutional = clamp(x.money*.75+volume*.25);
    var fallingKnife = clamp(x.risk*.75+(x.trend<40?18:0));
    var label = general>=82 ? "KADEMELİ AL" : general>=68 ? "İLK ALIM BÖLGESİ İZLE" : general>=52 ? "TEYİT BEKLE" : "ERKEN";

    return {
      x,general,support,rsiDip,macdTurn,bollinger,volume,flow,
      low,high,strongest,maturity,remaining:min+"-"+max+" işlem günü",
      stop,firstBuy:high,strongBuy:strongest,firstTarget,mainTarget,
      catchBottom,institutional,fallingKnife,label
    };
  }

  function addStyles(){
    if($("brpDipHunterStyle")) return;
    var st = document.createElement("style");
    st.id = "brpDipHunterStyle";
    st.textContent = `
      .dip-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:15px}
      .dip-kpi{text-align:center}
      .dip-levels{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
      .dip-levels div{background:#f8fbff;border:1px solid #dbe7f6;border-radius:14px;padding:12px;text-align:center}
      .dip-note{padding:10px 12px;background:#f8fbff;border:1px solid #dbe7f6;border-radius:12px;margin:8px 0}
      @media(max-width:900px){.dip-grid{display:block}.dip-grid .card{margin-bottom:14px}.dip-levels{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function addPage(){
    if($("dipHunter")) return;

    var sec = document.createElement("section");
    sec.id = "dipHunter";
    sec.className = "page hidden";
    sec.innerHTML = `
      <div class="dip-grid">
        <div class="card col3 dip-kpi"><div class="muted">Genel Dip Skoru</div><div id="dhScore" class="num good">0</div></div>
        <div class="card col3 dip-kpi"><div class="muted">En Dipte Yakalama</div><div id="dhCatch" class="num good">0</div></div>
        <div class="card col3 dip-kpi"><div class="muted">Falling Knife</div><div id="dhKnife" class="num bad">0</div></div>
        <div class="card col3 dip-kpi"><div class="muted">Karar</div><div id="dhDecision" class="num" style="font-size:24px">-</div></div>

        <div class="card col4"><div class="head hgreen">🎯 Dip Fiyat Tahmini</div><div id="dhRegion"></div></div>
        <div class="card col4"><div class="head hcyan">⏳ Dip Süreci</div><div id="dhTime"></div></div>
        <div class="card col4"><div class="head hamber">🟢 AI Giriş Bölgesi</div><div id="dhLevels" class="dip-levels"></div></div>

        <div class="card col6"><div class="head hblue">📊 Dip Skoru Katmanları</div><table><tbody id="dhLayers"></tbody></table></div>
        <div class="card col6"><div class="head hgreen">🧠 AI Yorumu</div><div id="dhReasons"></div></div>

        <div class="card col12">
          <button class="btn green" onclick="BRPDipHunter.scan()">🎯 Dip Adaylarını Tara</button>
          <div id="dhScanStatus" class="notice">Henüz tarama yapılmadı.</div>
          <table><thead><tr><th>Hisse</th><th>Dip Skoru</th><th>Dip Bölgesi</th><th>En Güçlü Dip</th><th>Kalan Süre</th><th>Karar</th></tr></thead><tbody id="dhScan"></tbody></table>
        </div>
      </div>`;

    var parent = document.querySelector("main") || document.querySelector(".wrap") || document.body;
    parent.appendChild(sec);
  }

  function addButton(){
    if($("dipHunterTab")) return;

    var btn = document.createElement("button");
    btn.id = "dipHunterTab";
    btn.className = "tab";
    btn.textContent = "🎯 Dip Avcısı AI";
    btn.onclick = function(){
      if(typeof window.showPage === "function"){
        window.showPage("dipHunter", btn);
      } else {
        document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
        $("dipHunter").classList.remove("hidden");
      }
      render(currentSymbol());
    };

    var tabs = document.querySelector(".tabs") || document.querySelector("[class*='tabs']");
    if(tabs) tabs.appendChild(btn);
    else document.body.insertBefore(btn, document.body.firstChild);
  }

  function render(symbol){
    var d = dip(symbol || currentSymbol());
    $("dhScore").textContent = Math.round(d.general);
    $("dhCatch").textContent = Math.round(d.catchBottom);
    $("dhKnife").textContent = Math.round(d.fallingKnife);
    $("dhDecision").textContent = d.label;

    $("dhRegion").innerHTML =
      "<b>Mevcut Fiyat:</b> "+d.x.price+" TL<br>"+
      "<b>Dip Bölgesi:</b> "+d.low+" - "+d.high+" TL<br>"+
      "<b>Tahmini En Güçlü Dip:</b> "+d.strongest+" TL";

    $("dhTime").innerHTML =
      "<b>Dip Olgunluğu:</b> %"+Math.round(d.maturity)+"<br>"+
      "<b>Tahmini Kalan Süre:</b> "+d.remaining+"<br>"+
      "<b>Not:</b> Dipler çoğu zaman tek gün değil bölge olarak oluşur.";

    $("dhLevels").innerHTML =
      "<div><b>İlk Alım</b><br>"+d.firstBuy+"</div>"+
      "<div><b>Güçlü Alım</b><br>"+d.strongBuy+"</div>"+
      "<div><b>Stop</b><br>"+d.stop+"</div>"+
      "<div><b>İlk Hedef</b><br>"+d.firstTarget+"</div>"+
      "<div><b>Ana Hedef</b><br>"+d.mainTarget+"</div>";

    $("dhLayers").innerHTML = [
      ["Destek Bölgesi",d.support],
      ["RSI/Momentum Dip",d.rsiDip],
      ["MACD Dönüş",d.macdTurn],
      ["Bollinger Sıkışması",d.bollinger],
      ["Hacim",d.volume],
      ["Para Girişi",d.flow],
      ["Backtest",d.x.backtest],
      ["Kurumsal Toplama",d.institutional]
    ].map(r=>"<tr><td>"+r[0]+"</td><td>"+score(r[1])+"</td><td>"+bar(r[1])+"</td></tr>").join("");

    $("dhReasons").innerHTML = [
      "Tek fiyat yerine dip fiyat aralığı üretildi.",
      "Falling Knife riski ayrıca hesaplandı.",
      "Kademeli alım için ilk alım, güçlü alım ve stop seviyesi verildi.",
      "Dip süreci genelde 5-20 işlem günü kısa dip, 1-3 ay orta dip, 3-12 ay büyük dip olarak izlenir.",
      "Bu ekran yatırım tavsiyesi değil, karar destek simülasyonudur."
    ].map(x=>"<div class='dip-note'>✓ "+x+"</div>").join("");
  }

  function scan(){
    var list = ["AEFES","AKBNK","AKSA","AKSEN","ALARK","ARCLK","ASELS","BIMAS","DOAS","EREGL","FROTO","GARAN","GUBRF","HEKTS","ISCTR","KCHOL","KOZAL","KRDMD","MGROS","MRSHL","PAPIL","PETKM","PGSUS","SAHOL","SASA","SISE","TAVHL","TCELL","TEZOL","THYAO","TOASO","TTKOM","TUPRS","ULKER","USAK","VAKBN","VKING","YKBNK","ZOREN"];
    var rows = list.map(s=>({s,d:dip(s)})).sort((a,b)=>b.d.general-a.d.general).slice(0,30);

    $("dhScanStatus").textContent = list.length+" hisse içinde en güçlü dip adayları listelendi.";
    $("dhScan").innerHTML = rows.map(r=>
      "<tr><td>"+r.s+"</td><td>"+score(r.d.general)+"</td><td>"+r.d.low+" - "+r.d.high+"</td><td>"+r.d.strongest+"</td><td>"+r.d.remaining+"</td><td>"+r.d.label+"</td></tr>"
    ).join("");
  }

  function init(){
    addStyles();
    addPage();
    addButton();
    render(currentSymbol());

    var oldAnalyze = window.analyze;
    if(typeof oldAnalyze === "function" && !oldAnalyze.__dipHunterWrapped){
      var wrapped = function(){
        var out = oldAnalyze.apply(this, arguments);
        setTimeout(()=>render(currentSymbol()), 150);
        return out;
      };
      wrapped.__dipHunterWrapped = true;
      window.analyze = wrapped;
    }
  }

  window.BRPDipHunter = { init, render, scan, dip };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  setTimeout(init, 500);
})();
