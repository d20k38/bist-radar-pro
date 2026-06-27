// BIST Radar Pro v17.0.1 component
export function progress(value = 0) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="bar"><i style="width:${v}%"></i></div>`;
}
