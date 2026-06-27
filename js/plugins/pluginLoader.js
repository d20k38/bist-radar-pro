// BIST Radar Pro V17 Plugin Loader
(function(){
  function loadScript(src){
    return new Promise(function(resolve, reject){
      if(document.querySelector('script[src="'+src+'"]')) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  async function initPlugins(){
    var plugins = window.BRP_PLUGINS || [];
    for (var i=0; i<plugins.length; i++){
      var p = plugins[i];
      if(!p.enabled) continue;
      try {
        await loadScript(p.file);
        console.log("[BIST Radar Plugin]", p.name, "yüklendi");
      } catch(e) {
        console.error("[BIST Radar Plugin] yüklenemedi:", p.name, e);
      }
    }
  }

  if(document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPlugins);
  } else {
    initPlugins();
  }
})();
