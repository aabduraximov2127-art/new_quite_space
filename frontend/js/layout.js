function renderNavbar(active = "") {
  const user = getUser();
  const loggedIn = isLoggedIn();

  const links = [
    { href: "index.html", label: "Bosh sahifa", key: "home" },
    { href: "places.html", label: "Joylar ro'yxati", key: "places" },
    { href: "map.html", label: "Xarita", key: "map" },
    { href: "index.html#ai", label: "Yordamchi", key: "ai" },
  ];

  if (loggedIn) {
    links.push(
      { href: "favorites.html", label: "Sevimlilar", key: "favorites" },
      { href: "bookings.html", label: "Mening bronlarim", key: "bookings" },
      { href: "profile.html", label: "Shaxsiy kabinet", key: "profile" }
    );
  }

  const navLinks = links
    .map(
      (l) =>
        `<a href="${l.href}" class="nav-link ${active === l.key ? "active" : ""}" data-nav="${l.key}">${l.label}</a>`
    )
    .join("");

  const authBtns = loggedIn
    ? `<span class="nav-user">${user?.name || "User"}</span>
       <button class="btn btn-ghost btn-sm" onclick="logout()">Chiqish</button>`
    : `<a href="login.html" class="btn btn-ghost btn-sm">Kirish</a>
       <a href="register.html" class="btn btn-primary btn-sm">Ro'yxatdan o'tish</a>`;

  return `
    <div class="nav-header-wrap" id="navHeaderWrap">
      <div class="nav-top-strip">
        <strong>QuietSpace Tashkent</strong> — Toshkentdagi tinch ish joylarini toping va onlayn bron qiling
      </div>
      <nav class="navbar">
        <div class="container nav-inner">
          <a href="index.html" class="logo">
            <img src="assets/logo-icon.png" alt="QuietSpace" class="logo-img">
            <span class="logo-text">Quiet<span>Space</span></span>
          </a>
          <button class="mobile-toggle" id="mobileToggle" onclick="toggleMobileNav()" aria-label="Menyuni ochish"><span class="mobile-toggle-bars" aria-hidden="true"></span><span class="mobile-toggle-label">Menyu</span></button>
          <div class="nav-links" id="navLinks">${navLinks}</div>
          <div class="nav-actions">${authBtns}</div>
        </div>
      </nav>
    </div>`;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-shelf" aria-hidden="true"></div>
      <div class="container footer-inner">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="assets/logo-icon.png" alt="QuietSpace" class="footer-logo">
            <div>
              <strong>QuietSpace Tashkent</strong>
              <p>Tinch joy. Samarali ish.</p>
            </div>
          </div>
          <div class="footer-links">
            <a href="places">Joylar</a>
            <a href="map">Xarita</a>
            <a href="index.html#ai">Yordamchi</a>
          </div>
        <div class="footer-features">
          <span>Wi-Fi</span>
          <span>Rozetka</span>
          <span>O'rindiq</span>
          <span>Tinch muhit</span>
        </div>
        </div>
        <p class="footer-copy">© 2026 QuietSpace Tashkent · Toshkent ish joylari platformasi</p>
      </div>
    </footer>`;
}

function initLayout(active) {
  const nav = document.getElementById("navbar");
  const footer = document.getElementById("footer");
  if (nav) nav.innerHTML = renderNavbar(active);
  if (footer) footer.innerHTML = renderFooter();
  if (typeof initNavEffects === "function") initNavEffects();
}

function toggleMobileNav() {
  const links = document.getElementById("navLinks");
  const toggle = document.getElementById("mobileToggle");
  links?.classList.toggle("open");
  toggle?.classList.toggle("open");
}

function logout() {
  clearTokens();
  showToast("Tizimdan chiqdingiz");
  setTimeout(() => (location.href = "index.html"), 500);
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page) initLayout(page);
});
