// BIST Radar Pro v17.0 Modular Stable
export function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden')); const el=document.getElementById(id); if(el) el.classList.remove('hidden');}
