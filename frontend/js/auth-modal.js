/* Auth modal + oson bron qilish */
function ensureAuthModal() {
  if (document.getElementById("authModal")) return;

  const modal = document.createElement("div");
  modal.id = "authModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-card auth-modal">
      <button type="button" class="modal-close" onclick="closeAuthModal()">×</button>
      <div class="auth-modal-header">
        <div class="auth-modal-icon" aria-hidden="true">QS</div>
        <h2>Bron qilish uchun tizimga kiring</h2>
        <p>Joylarni ko'rish bepul. Bron qilish uchun ro'yxatdan o'ting yoki kiring.</p>
      </div>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" data-tab="login">Kirish</button>
        <button type="button" class="auth-tab" data-tab="register">Ro'yxatdan o'tish</button>
      </div>
      <form id="modalLoginForm" class="auth-tab-panel active">
        <div class="form-group"><label>Email</label><input class="form-input" type="email" name="email" required placeholder="email@example.com"></div>
        <div class="form-group"><label>Parol</label><input class="form-input" type="password" name="password" required placeholder="••••••••"></div>
        <div id="modalLoginError" class="form-error" style="display:none"></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Kirish va davom etish</button>
      </form>
      <form id="modalRegisterForm" class="auth-tab-panel">
        <div class="form-group"><label>Ism</label><input class="form-input" type="text" name="name" required placeholder="Ismingiz"></div>
        <div class="form-group"><label>Email</label><input class="form-input" type="email" name="email" required placeholder="email@example.com"></div>
        <div class="form-group"><label>Parol</label><input class="form-input" type="password" name="password" required minlength="8" placeholder="Kamida 8 belgi"></div>
        <div id="modalRegisterError" class="form-error" style="display:none"></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Ro'yxatdan o'tish va davom etish</button>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => { if (e.target === modal) closeAuthModal(); });

  modal.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      modal.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
      modal.querySelectorAll(".auth-tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      modal.querySelector(`#modal${tab.dataset.tab === "login" ? "Login" : "Register"}Form`).classList.add("active");
    });
  });

  document.getElementById("modalLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById("modalLoginError");
    const btn = e.target.querySelector('button[type="submit"]');
    errEl.style.display = "none";
    setButtonLoading(btn, true);
    const result = await login(fd.get("email"), fd.get("password"));
    setButtonLoading(btn, false, "Kirish va davom etish");
    if (result.ok) {
      celebrateSuccess(e.target);
      setTimeout(() => {
        closeAuthModal();
        initLayout(document.body.dataset.page || "");
        showToast(result.demo ? "Demo rejimda kirdingiz" : "Xush kelibsiz!");
        if (authModalCallback) authModalCallback();
        else if (authModalRedirect) location.href = authModalRedirect;
      }, 300);
    } else {
      errEl.textContent = result.error;
      errEl.style.display = "block";
      shakeElement(e.target);
    }
  });

  document.getElementById("modalRegisterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById("modalRegisterError");
    const btn = e.target.querySelector('button[type="submit"]');
    errEl.style.display = "none";
    setButtonLoading(btn, true);
    const result = await register(fd.get("name"), fd.get("email"), fd.get("password"));
    setButtonLoading(btn, false, "Ro'yxatdan o'tish va davom etish");
    if (result.ok) {
      celebrateSuccess(e.target);
      setTimeout(() => {
        closeAuthModal();
        initLayout(document.body.dataset.page || "");
        showToast(result.demo ? "Demo akkaunt yaratildi" : "Ro'yxatdan muvaffaqiyatli o'tdingiz");
        if (authModalCallback) authModalCallback();
        else if (authModalRedirect) location.href = authModalRedirect;
      }, 300);
    } else {
      errEl.textContent = result.error;
      errEl.style.display = "block";
      shakeElement(e.target);
    }
  });
}

let authModalRedirect = null;
let authModalCallback = null;

function openAuthModal(redirectUrl, callback, defaultTab = "login") {
  ensureAuthModal();
  authModalRedirect = redirectUrl || null;
  authModalCallback = callback || null;
  if (redirectUrl) sessionStorage.setItem("redirect_after_login", redirectUrl);

  const modal = document.getElementById("authModal");
  modal.querySelectorAll(".auth-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === defaultTab);
  });
  modal.querySelectorAll(".auth-tab-panel").forEach((p) => p.classList.remove("active"));
  modal.querySelector(`#modal${defaultTab === "login" ? "Login" : "Register"}Form`).classList.add("active");

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  document.getElementById("authModal")?.classList.remove("open");
  document.body.style.overflow = "";
  authModalRedirect = null;
  authModalCallback = null;
}

function handleBookPlace(placeId) {
  const url = bookingUrl(placeId);
  if (isLoggedIn()) {
    location.href = url;
    return;
  }
  openAuthModal(url);
}

function ensureQuickBookModal() {
  if (document.getElementById("quickBookModal")) return;

  const modal = document.createElement("div");
  modal.id = "quickBookModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-card quick-book-modal">
      <button type="button" class="modal-close" onclick="closeQuickBook()">×</button>
      <div id="quickBookContent"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeQuickBook(); });
}

function closeQuickBook() {
  document.getElementById("quickBookModal")?.classList.remove("open");
  document.body.style.overflow = "";
}

async function openQuickBook(placeId) {
  if (!isLoggedIn()) {
    openAuthModal(null, () => openQuickBook(placeId));
    return;
  }

  ensureQuickBookModal();
  const options = await getBookingOptions(placeId);
  if (!options) { showToast("Joy topilmadi"); return; }

  const p = options.place;
  const s = options.suggested;
  const img = getPlaceImage(p.id) || getPlaceImageByType(p.type);
  const today = new Date().toISOString().split("T")[0];

  document.getElementById("quickBookContent").innerHTML = `
    <div class="quick-book-hero" style="background-image:url('${img}')"></div>
    <h2>${p.name}</h2>
    <p class="quick-book-sub">${p.district} · ${p.address}</p>

    <form id="quickBookForm" class="quick-book-form">
      <div class="form-group">
        <label>Sana</label>
        <input class="form-input" type="date" name="date" value="${s.date}" min="${today}" required>
      </div>
      <div class="booking-time-row">
        <div class="form-group">
          <label>Boshlanish</label>
          <input class="form-input" type="time" name="start_time" value="${s.start_time}" required>
        </div>
        <div class="form-group">
          <label>Tugash</label>
          <input class="form-input" type="time" name="end_time" value="${s.end_time}" required>
        </div>
      </div>
      <div class="form-group">
        <label>O'rindiq</label>
        <select class="form-input" name="seat_number" required>
          ${buildSeatOptions(options.available_seats, s.seat_number)}
        </select>
      </div>
      <div class="booking-price-box" id="quickBookPrice">
        <span>Taxminiy narx</span>
        <strong id="quickBookPriceValue">—</strong>
      </div>
      <div id="quickBookError" class="form-error" style="display:none"></div>
      <button type="submit" class="btn btn-primary btn-lg" id="confirmQuickBook" style="width:100%">
        Bron qilish
      </button>
    </form>
    <a href="${bookingUrl(placeId)}" class="quick-book-link">Batafsil sahifada ochish →</a>
  `;

  const form = document.getElementById("quickBookForm");
  const updatePrice = () => {
    const fd = new FormData(form);
    const err = validateBookingTimes(fd.get("date"), fd.get("start_time"), fd.get("end_time"));
    const priceEl = document.getElementById("quickBookPriceValue");
    const errEl = document.getElementById("quickBookError");
    if (err) {
      if (priceEl) priceEl.textContent = "—";
      if (errEl) { errEl.textContent = err; errEl.style.display = "block"; }
      return;
    }
    if (errEl) errEl.style.display = "none";
    const price = calcBookingPrice(p.price, fd.get("start_time"), fd.get("end_time"));
    const hours = calcBookingHours(fd.get("start_time"), fd.get("end_time"));
    if (priceEl) {
      priceEl.textContent =
        price === 0 ? `Bepul · ${hours} soat` : `${price.toLocaleString()} so'm · ${hours} soat`;
    }
  };

  form.querySelectorAll("input, select").forEach((el) => el.addEventListener("change", updatePrice));
  updatePrice();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      place: Number(placeId),
      date: fd.get("date"),
      start_time: fd.get("start_time"),
      end_time: fd.get("end_time"),
      seat_number: Number(fd.get("seat_number")),
    };
    const validationErr = validateBookingTimes(body.date, body.start_time, body.end_time);
    if (validationErr) {
      const errEl = document.getElementById("quickBookError");
      errEl.textContent = validationErr;
      errEl.style.display = "block";
      return;
    }

    const btn = document.getElementById("confirmQuickBook");
    btn.disabled = true;
    btn.textContent = "Kutilmoqda...";

    const res = await apiFetch("/bookings/", { method: "POST", body: JSON.stringify(body) });
    if (res.ok || res.offline) {
      if (res.offline) saveDemoBooking(body, p);
      closeQuickBook();
      showToast("Bron muvaffaqiyatli amalga oshirildi");
      setTimeout(() => (location.href = "bookings.html"), 800);
    } else {
      btn.disabled = false;
      btn.textContent = "Bron qilish";
      showToast("Xatolik — qayta urinib ko'ring");
    }
  });

  document.getElementById("quickBookModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function saveDemoBooking(body, place) {
  const bookings = JSON.parse(localStorage.getItem("demo_bookings") || "[]");
  bookings.unshift({
    id: Date.now(),
    place_name: place.name,
    ...body,
    status: "confirmed",
  });
  localStorage.setItem("demo_bookings", JSON.stringify(bookings));
}

function getDemoBookings() {
  return JSON.parse(localStorage.getItem("demo_bookings") || "[]");
}
