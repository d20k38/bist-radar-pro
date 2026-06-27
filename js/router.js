// BIST Radar Pro v17.0.1 - Router
// Mevcut showPage fonksiyonunu bozmadan merkezi yönlendirme sağlar.
export function showPageById(id, button = null) {
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => {
    p.classList.add("hidden");
    p.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
  }

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  if (button) button.classList.add("active");
}

if (typeof window !== "undefined") {
  window.BRP_ROUTER = { showPageById };

  // Eski kod showPage kullanıyorsa uyumluluk sağla.
  if (!window.showPage) {
    window.showPage = function(id, button) {
      showPageById(id, button);
    };
  }
}
