/* ═══════════════════════════════════════════
   main.js — Amit Baghel · Shared Site Logic
   ═══════════════════════════════════════════ */

// ── Scroll reveal ──────────────────────────
const io = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }),
  { threshold: 0.1 }
);
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ── Nav: scroll behaviour ──────────────────
const nav = document.querySelector('nav');
const SCROLL_THRESHOLD = 60;

function updateNav() {
  nav.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav(); // run once on load
