// BIST Radar Pro v17.0.1 component
export function card(title, body, className = "") {
  return `<div class="card ${className}"><div class="head">${title}</div>${body}</div>`;
}
