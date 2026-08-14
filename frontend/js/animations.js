/* QuietSpace — Animatsiyalar */

document.addEventListener("DOMContentLoaded", () => {
  initPageAnimations();
  initScrollReveal();
  initNavbarScroll();
  initNavEffects();
});

function initNavEffects() {
  initDynamicCards();
}

function initPageAnimations() {
  document.body.classList.add("page-loaded");

  document.querySelectorAll(".hero-badge, .hero h1, .hero-lead, .search-box, .hero-card, .hero-features").forEach((el, i) => {
    el.classList.add("fade-up");
    el.style.animationDelay = `${0.08 + i * 0.1}s`;
  });

  document.querySelectorAll(".section-header").forEach((el, i) => {
    el.classList.add("fade-up");
    el.style.animationDelay = `${0.05 + i * 0.08}s`;
  });

  document.querySelectorAll(".auth-card, .easy-booking, .info-box").forEach((el) => {
    el.classList.add("scale-in");
  });
}

function initDynamicCards() {
  document.querySelectorAll(".place-card:not(.fade-up)").forEach((el, i) => {
    el.classList.add("fade-up");
    el.style.animationDelay = `${Math.min(i * 0.07, 0.4)}s`;
  });
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
  );

  document.querySelectorAll(".scroll-reveal, section, .ai-panel, .hero-card, .place-card").forEach((el) => {
    if (!el.classList.contains("scroll-reveal")) el.classList.add("scroll-reveal");
    observer.observe(el);
  });
}

function initNavbarScroll() {
  const nav = document.querySelector(".navbar");
  const wrap = document.getElementById("navHeaderWrap");
  if (!nav) return;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("navbar-scrolled", y > 20);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setButtonLoading(btn, loading, defaultText) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle("btn-loading", loading);
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Kutilmoqda...';
  } else {
    btn.textContent = defaultText || btn.dataset.originalText || "Yuborish";
  }
}

function shakeElement(el) {
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  setTimeout(() => el.classList.remove("shake"), 500);
}

function celebrateSuccess(el) {
  if (!el) return;
  el.classList.add("success-pop");
  setTimeout(() => el.classList.remove("success-pop"), 600);
}
