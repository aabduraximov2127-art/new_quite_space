let bookingState = null;

const placeId = getUrlParam("place");

if (!placeId) {
  location.href = "places.html";
} else if (!requireAuth(bookingUrl(placeId))) {
  // auth modal ochiladi
} else {
  initBookingPage();
}

async function initBookingPage() {
  const options = await getBookingOptions(placeId);
  if (!options) {
    document.getElementById("bookingContent").innerHTML =
      '<div class="empty-state">Joy topilmadi</div>';
    return;
  }
  bookingState = options;
  renderBookingForm();
  loadBookingNearby(options.place);
}

function renderBookingForm() {
  const p = bookingState.place;
  const s = bookingState.suggested;
  const img = getPlaceImage(p.id) || getPlaceImageByType(p.type);
  const today = new Date().toISOString().split("T")[0];

  document.getElementById("bookingContent").innerHTML = `
    <div class="easy-booking">
      <div class="easy-booking-hero" style="background-image:url('${img}')">
        <div class="easy-booking-hero-overlay">
          <span class="tag tag-verified">Bron qilish</span>
          <h2>${p.name}</h2>
          <p>${p.district} · ${p.address}</p>
        </div>
      </div>

      <div class="easy-booking-body">
        <h3 class="booking-form-title">Qachon kelasiz?</h3>
        <p class="booking-form-sub">Sana va vaqtni tanlang — narx avtomatik hisoblanadi</p>

        <form id="bookingForm" class="booking-time-form">
          <input type="hidden" name="place" value="${p.id}">

          <div class="form-group">
            <label for="bookDate">Sana</label>
            <input class="form-input" type="date" id="bookDate" name="date" value="${s.date}" min="${today}" required>
          </div>

          <div class="booking-time-row">
            <div class="form-group">
              <label for="bookStart">Boshlanish vaqti</label>
              <input class="form-input" type="time" id="bookStart" name="start_time" value="${s.start_time}" required>
            </div>
            <div class="form-group">
              <label for="bookEnd">Tugash vaqti</label>
              <input class="form-input" type="time" id="bookEnd" name="end_time" value="${s.end_time}" required>
            </div>
          </div>

          <div class="duration-chips" id="durationChips">
            ${(bookingState.duration_presets || [])
              .map(
                (d) =>
                  `<button type="button" class="duration-chip" data-hours="${d.hours}">${d.label}</button>`
              )
              .join("")}
          </div>

          <div class="form-group">
            <label for="bookSeat">O'rindiq</label>
            <select class="form-input" id="bookSeat" name="seat_number" required>
              ${buildSeatOptions(bookingState.available_seats, s.seat_number)}
            </select>
          </div>

          <div class="booking-price-box" id="bookingPriceBox">
            <span>Taxminiy narx</span>
            <strong id="bookingPriceValue">—</strong>
          </div>

          <div id="bookingError" class="form-error" style="display:none"></div>

          <button type="submit" class="btn btn-primary btn-lg" id="easyConfirmBtn">
            Bron qilish
          </button>
        </form>
      </div>
    </div>

    <section class="booking-nearby-section">
      <h3>Sizga yaqin boshqa joylar</h3>
      <p id="bookingNearbyStatus" class="booking-nearby-status">Joylashuv aniqlanmoqda...</p>
      <div id="bookingNearbyList" class="cards-grid"></div>
    </section>`;

  const form = document.getElementById("bookingForm");
  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("change", updateBookingPricePreview);
  });

  document.querySelectorAll(".duration-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hours = Number(btn.dataset.hours);
      const startEl = document.getElementById("bookStart");
      const endEl = document.getElementById("bookEnd");
      const [sh, sm] = startEl.value.split(":").map(Number);
      let endH = sh + hours;
      if (endH > 23) endH = 23;
      endEl.value = `${String(endH).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
      document.querySelectorAll(".duration-chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateBookingPricePreview();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    submitBooking({
      place: Number(fd.get("place")),
      date: fd.get("date"),
      start_time: fd.get("start_time"),
      end_time: fd.get("end_time"),
      seat_number: Number(fd.get("seat_number")),
    });
  });

  updateBookingPricePreview();
}

function updateBookingPricePreview() {
  const start = document.getElementById("bookStart")?.value;
  const end = document.getElementById("bookEnd")?.value;
  const date = document.getElementById("bookDate")?.value;
  const priceEl = document.getElementById("bookingPriceValue");
  const errEl = document.getElementById("bookingError");
  if (!priceEl || !bookingState) return;

  const err = validateBookingTimes(date, start, end);
  if (err) {
    priceEl.textContent = "—";
    if (errEl) {
      errEl.textContent = err;
      errEl.style.display = "block";
    }
    return;
  }
  if (errEl) errEl.style.display = "none";

  const price = calcBookingPrice(bookingState.place.price, start, end);
  const hours = calcBookingHours(start, end);
  priceEl.textContent =
    price === 0 ? `Bepul · ${hours} soat` : `${price.toLocaleString()} so'm · ${hours} soat`;
}

async function loadBookingNearby(currentPlace) {
  const el = document.getElementById("bookingNearbyList");
  const status = document.getElementById("bookingNearbyStatus");
  if (!el) return;

  const places = (await getPlaces()).filter((p) => p.id !== Number(currentPlace.id));

  try {
    const loc = await requestUserLocation();
    const sorted = sortPlacesByDistance(places, loc.lat, loc.lng);
    if (status) status.textContent = "Joylashuvingizga eng yaqin joylar";
    el.innerHTML = sorted.slice(0, 3).map(placeCardHTML).join("");
  } catch {
    const cached = getStoredUserLocation();
    if (cached) {
      const sorted = sortPlacesByDistance(places, cached.lat, cached.lng);
      if (status) status.textContent = "Saqlangan joylashuv bo'yicha";
      el.innerHTML = sorted.slice(0, 3).map(placeCardHTML).join("");
    } else {
      if (status) status.textContent = "Toshkent markazi bo'yicha tavsiya";
      el.innerHTML = sortPlacesByDistance(places, 41.3111, 69.2797)
        .slice(0, 3)
        .map(placeCardHTML)
        .join("");
    }
  }
}

async function submitBooking(body) {
  const errEl = document.getElementById("bookingError");
  errEl.style.display = "none";

  const validationErr = validateBookingTimes(body.date, body.start_time, body.end_time);
  if (validationErr) {
    errEl.textContent = validationErr;
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("easyConfirmBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Kutilmoqda...";
  }

  const res = await apiFetch("/bookings/", { method: "POST", body: JSON.stringify(body) });
  if (res.ok || res.offline) {
    if (res.offline) {
      const place = MOCK_PLACES.find((p) => p.id === body.place);
      saveDemoBooking(body, place || { name: "Joy" });
    }
    showToast("Bron muvaffaqiyatli amalga oshirildi");
    setTimeout(() => (location.href = "bookings.html"), 800);
  } else {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Bron qilish";
    }
    const err = res.data?.errors || res.data?.detail || "Booking xatolik";
    errEl.textContent = typeof err === "string" ? err : JSON.stringify(err);
    errEl.style.display = "block";
  }
}
