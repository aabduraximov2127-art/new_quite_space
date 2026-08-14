function placeUrl(id) {
  return `place?id=${id}`;
}

function bookingUrl(placeId) {
  return `booking?place=${placeId}`;
}

function getUrlParam(name) {
  const fromSearch = new URLSearchParams(location.search).get(name);
  if (fromSearch) return fromSearch;
  if (location.hash) {
    const hash = location.hash.replace(/^#/, "");
    if (hash.includes("=")) {
      return new URLSearchParams(hash).get(name);
    }
    if (name === "id" && /^\d+$/.test(hash)) return hash;
    if (name === "place" && /^\d+$/.test(hash)) return hash;
  }
  return null;
}


const MOCK_PLACES = typeof REAL_PLACES !== "undefined" ? REAL_PLACES : [];

function getToken() {
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

function setTokens(access, refresh) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function getUserInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getUserHandle(user) {
  if (!user?.email) return "@quietspace_user";
  const base = user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return `@${base}`;
}

function updateLocalUser(updates) {
  const user = getUser();
  if (!user) return null;
  const updated = { ...user, ...updates };
  setUser(updated);
  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.email === user.email);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem("demo_users", JSON.stringify(users));
  }
  return updated;
}

function getDemoFavorites() {
  try {
    return JSON.parse(localStorage.getItem("demo_favorites") || "[]");
  } catch {
    return [];
  }
}

function toggleDemoFavorite(placeId) {
  const ids = getDemoFavorites();
  const id = Number(placeId);
  const idx = ids.indexOf(id);
  if (idx >= 0) ids.splice(idx, 1);
  else ids.push(id);
  localStorage.setItem("demo_favorites", JSON.stringify(ids));
  return idx < 0;
}

async function getProfileBookings() {
  const res = await apiFetch("/bookings/my/");
  if (res.ok) return res.data?.results || res.data || [];
  if (typeof getDemoBookings === "function") return getDemoBookings();
  return [];
}

async function getProfileFavorites() {
  const res = await apiFetch("/favorites/");
  if (res.ok) {
    const items = res.data?.results || res.data || [];
    return items.map((f) => f.place || f);
  }
  return getDemoFavorites()
    .map((id) => MOCK_PLACES.find((p) => p.id === id))
    .filter(Boolean);
}

function formatMemberSince(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    month: "long",
    year: "numeric",
  });
}

function isLoggedIn() {
  return !!getToken();
}

async function apiFetch(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && getRefreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${getToken()}`;
        const retry = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        return { ok: retry.ok, status: retry.status, data: await retry.json().catch(() => ({})) };
      }
    }

    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null, offline: true };
  }
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) { clearTokens(); return false; }
    const data = await res.json();
    setTokens(data.access, refresh);
    return true;
  } catch {
    return false;
  }
}

async function getPlaces(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/places/${qs ? "?" + qs : ""}`);
  if (res.ok && res.data?.results) return res.data.results;
  if (res.ok && Array.isArray(res.data)) return res.data;
  return MOCK_PLACES;
}

async function getPlace(id) {
  const mock = MOCK_PLACES.find((p) => p.id === Number(id)) || null;
  const res = await apiFetch(`/places/${id}/`);
  if (res.ok && res.data?.id) {
    return mock ? { ...mock, ...res.data } : res.data;
  }
  return mock;
}

function buildMockBookingOptions(place) {
  const now = new Date();
  const startHour = Math.min(now.getHours() + 1, 21);
  const endHour = Math.min(startHour + 3, 22);
  const pad = (n) => String(n).padStart(2, "0");
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(now.getTime() + 172800000).toISOString().split("T")[0];
  const startTime = `${pad(startHour)}:00`;
  const endTime = `${pad(endHour)}:00`;
  const freeSeats = Array.from({ length: Math.min(place.available_seats, 12) }, (_, i) => i + 1);
  const hours = Math.max(1, endHour - startHour);
  const estimated = Number(place.price) === 0 ? 0 : Number(place.price) * hours;

  return {
    success: true,
    place: {
      id: place.id,
      name: place.name,
      type: place.type,
      address: place.address,
      district: place.district,
      price: String(place.price),
      wifi_speed: place.wifi_speed,
      noise_level: place.noise_level,
      capacity: place.capacity,
      rating: String(place.rating),
      image: place.image,
    },
    availability: {
      total_seats: place.capacity,
      available_seats: place.available_seats,
      status: place.available_seats === 0 ? "full" : place.available_seats <= place.capacity * 0.2 ? "busy" : "available",
    },
    suggested: {
      date: today,
      start_time: startTime,
      end_time: endTime,
      seat_number: freeSeats[0] || 1,
    },
    duration_presets: [
      { label: "1 soat", hours: 1 },
      { label: "2 soat", hours: 2 },
      { label: "3 soat", hours: 3 },
      { label: "4 soat", hours: 4 },
    ],
    quick_dates: [
      { label: "Bugun", date: today },
      { label: "Ertaga", date: tomorrow },
      { label: "Indinga", date: dayAfter },
    ],
    available_seats: freeSeats.length ? freeSeats : [1, 2, 3],
    estimated_price: estimated,
    working_hours_hint: place.working_hours || {},
  };
}

async function getBookingOptions(placeId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/places/${placeId}/booking-options/${qs ? "?" + qs : ""}`);
  if (res.ok && res.data?.place) return res.data;

  const place = await getPlace(placeId);
  if (place) return buildMockBookingOptions(place);
  return null;
}

function formatDateUz(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" });
}

function formatTimeRange(start, end) {
  return `${start} — ${end}`;
}

/* ——— Joylashuv va masofa ——— */
function getStoredUserLocation() {
  try {
    const raw = localStorage.getItem("user_location");
    if (!raw) return null;
    const loc = JSON.parse(raw);
    if (!loc?.lat || !loc?.lng) return null;
    return loc;
  } catch {
    return null;
  }
}

function setStoredUserLocation(lat, lng) {
  localStorage.setItem("user_location", JSON.stringify({ lat, lng, at: Date.now() }));
}

function requestUserLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStoredUserLocation(loc.lat, loc.lng);
        resolve(loc);
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: options.timeout || 12000,
        maximumAge: options.maximumAge ?? 300000,
      }
    );
  });
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPlaceCoords(place) {
  return {
    lat: parseFloat(place.latitude),
    lng: parseFloat(place.longitude),
  };
}

function withDistance(places, userLat, userLng) {
  return places.map((p) => {
    const c = getPlaceCoords(p);
    if (Number.isNaN(c.lat) || Number.isNaN(c.lng)) return { ...p, distance_km: null };
    return { ...p, distance_km: haversineKm(userLat, userLng, c.lat, c.lng) };
  });
}

function sortPlacesByDistance(places, userLat, userLng) {
  return withDistance(places, userLat, userLng).sort((a, b) => {
    if (a.distance_km == null) return 1;
    if (b.distance_km == null) return -1;
    return a.distance_km - b.distance_km;
  });
}

function formatDistance(km) {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

async function loadNearbyPlacesSection(containerId, statusId, limit = 4) {
  const el = document.getElementById(containerId);
  const status = statusId ? document.getElementById(statusId) : null;
  if (!el) return;

  const places = await getPlaces();
  el.innerHTML = `<div class="loading">Joylashuvingiz aniqlanmoqda...</div>`;
  if (status) status.textContent = "GPS orqali eng yaqin joylar qidirilmoqda...";

  try {
    const loc = await requestUserLocation();
    const sorted = sortPlacesByDistance(places, loc.lat, loc.lng);
    if (status) status.textContent = `Sizga eng yaqin ${Math.min(limit, sorted.length)} ta joy`;
    el.innerHTML = sorted.slice(0, limit).map(placeCardHTML).join("");
    if (typeof initDynamicCards === "function") initDynamicCards();
  } catch {
    const cached = getStoredUserLocation();
    if (cached) {
      const sorted = sortPlacesByDistance(places, cached.lat, cached.lng);
      if (status) status.textContent = "Saqlangan joylashuv bo'yicha yaqin joylar";
      el.innerHTML = sorted.slice(0, limit).map(placeCardHTML).join("");
      if (typeof initDynamicCards === "function") initDynamicCards();
    } else {
      const fallback = sortPlacesByDistance(places, 41.3111, 69.2797);
      if (status) {
        status.innerHTML =
          'Joylashuv ruxsati berilmadi. <button type="button" class="link-btn" onclick="loadNearbyPlacesSection(\'nearbyPlaces\', \'nearbyStatus\')">Qayta urinish</button>';
      }
      el.innerHTML = fallback.slice(0, limit).map(placeCardHTML).join("");
      if (typeof initDynamicCards === "function") initDynamicCards();
    }
  }
}

/* ——— Bron vaqti ——— */
function calcBookingHours(startTime, endTime) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let hours = eh + em / 60 - (sh + sm / 60);
  if (hours <= 0) hours += 24;
  return Math.max(hours, 0.5);
}

function calcBookingPrice(placePrice, startTime, endTime) {
  const price = Number(placePrice);
  if (price === 0) return 0;
  return Math.ceil(calcBookingHours(startTime, endTime)) * price;
}

function validateBookingTimes(date, startTime, endTime) {
  if (!date || !startTime || !endTime) return "Sana va vaqtni to'ldiring";
  const today = new Date().toISOString().split("T")[0];
  if (date < today) return "O'tmish sanani tanlab bo'lmaydi";

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  if (end <= start) return "Tugash vaqti boshlanishdan keyin bo'lishi kerak";

  if (date === today) {
    const now = new Date();
    if (start < now) return "Boshlanish vaqti hozirgi vaqtdan keyin bo'lishi kerak";
  }
  return null;
}

function buildSeatOptions(seats, selected) {
  const list = seats?.length ? seats : [1, 2, 3, 4, 5];
  return list
    .map((n) => `<option value="${n}" ${Number(selected) === n ? "selected" : ""}>№ ${n}</option>`)
    .join("");
}

const MARKER_COLORS = {
  cafe: "#e76f51",
  library: "#457b9d",
  coworking: "#7209b7",
  free_zone: "#2d6a4f",
};

const MARKER_LABELS = {
  cafe: "K",
  library: "L",
  coworking: "C",
  free_zone: "B",
};

const MARKER_TYPE_NAMES = {
  cafe: "Kafe",
  library: "Kutubxona",
  coworking: "Coworking",
  free_zone: "Bepul zona",
};

function createMapMarker(place, map, onClick) {
  const color = MARKER_COLORS[place.type] || "#2d6a4f";
  const label = MARKER_LABELS[place.type] || "J";
  const marker = L.marker([Number(place.latitude), Number(place.longitude)], {
    icon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:13px;font-weight:700;color:#fff;font-family:system-ui,sans-serif">${label}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    }),
  }).addTo(map);

  marker.bindPopup(`
    <div style="min-width:180px">
      <strong>${place.name}</strong><br>
      <span style="color:#666;font-size:12px">${place.district}</span><br>
      Reyting: ${place.rating} · Wi-Fi: ${place.wifi_speed} Mbps<br>
      Shovqin: ${formatNoise(place.noise_level)} · Narx: ${formatPrice(place.price)}<br>
      Bo'sh o'rindiq: ${place.available_seats} ta<br>
      <a href="${placeUrl(place.id)}" style="color:#2d6a4f;font-weight:600">Batafsil →</a>
    </div>
  `);

  if (onClick) marker.on("click", () => onClick(place));
  return marker;
}

function fitMapToPlaces(map, places) {
  if (!places.length) return;
  const bounds = L.latLngBounds(places.map((p) => [Number(p.latitude), Number(p.longitude)]));
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
}

async function login(email, password) {
  const check = validateAuthInput(null, email, password, false);
  if (!check.ok) return check;

  const res = await apiFetch("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  if (res.ok && res.data?.access) {
    setTokens(res.data.access, res.data.refresh);
    const me = await apiFetch("/auth/me/");
    if (me.ok) setUser(me.data.user || me.data);
    return { ok: true };
  }

  if (res.offline || res.status === 0) {
    return demoLogin(email, password);
  }

  return { ok: false, error: formatAuthError(res.data) || "Login xatolik" };
}

async function register(name, email, password) {
  const check = validateAuthInput(name, email, password, true);
  if (!check.ok) return check;

  const payload = { name: name.trim(), email: email.trim().toLowerCase(), password };

  const res = await apiFetch("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    return login(payload.email, password);
  }

  if (res.offline || res.status === 0) {
    return demoRegister(payload.name, payload.email, password);
  }

  return { ok: false, error: formatAuthError(res.data) || "Ro'yxatdan o'tish xatolik" };
}

function validateAuthInput(name, email, password, isRegister = true) {
  if (isRegister) {
    if (!name || name.trim().length < 2) {
      return { ok: false, error: "Ism kamida 2 belgidan iborat bo'lishi kerak" };
    }
  }
  const trimmedEmail = (email || "").trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, error: "To'g'ri email manzilini kiriting" };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: "Parol kamida 8 belgidan iborat bo'lishi kerak" };
  }
  return { ok: true };
}

function formatAuthError(data) {
  if (!data) return null;
  if (typeof data === "string") return data;

  const errors = data.errors || data;
  if (typeof errors === "string") return errors;
  if (errors.detail) {
    return typeof errors.detail === "string" ? errors.detail : JSON.stringify(errors.detail);
  }

  const labels = { email: "Email", password: "Parol", name: "Ism" };
  for (const [key, label] of Object.entries(labels)) {
    if (errors[key]) {
      const msg = errors[key];
      return `${label}: ${Array.isArray(msg) ? msg[0] : msg}`;
    }
  }

  for (const key of Object.keys(errors)) {
    const msg = errors[key];
    if (Array.isArray(msg) && msg[0]) return msg[0];
    if (typeof msg === "string") return msg;
  }
  return null;
}

function getDemoUsers() {
  try {
    return JSON.parse(localStorage.getItem("demo_users") || "[]");
  } catch {
    return [];
  }
}

function demoRegister(name, email, password) {
  const users = getDemoUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email === normalizedEmail)) {
    return { ok: false, error: "Bu email allaqachon ro'yxatdan o'tgan" };
  }

  const user = {
    id: Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    password,
    created_at: new Date().toISOString(),
  };

  users.push(user);
  localStorage.setItem("demo_users", JSON.stringify(users));
  return demoLogin(normalizedEmail, password);
}

function demoLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getDemoUsers().find(
    (u) => u.email === normalizedEmail && u.password === password
  );

  if (!user) {
    return { ok: false, error: "Email yoki parol noto'g'ri. Avval ro'yxatdan o'ting." };
  }

  setTokens(`demo_access_${user.id}`, `demo_refresh_${user.id}`);
  setUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: "user",
    created_at: user.created_at,
  });

  return { ok: true, demo: true };
}

async function aiRecommend(query) {
  const res = await apiFetch("/ai/recommend/", {
    method: "POST",
    body: JSON.stringify({ query }),
  });

  if (res.ok && res.data?.recommendations?.length) {
    return {
      items: res.data.recommendations,
      message: res.data.message,
      source: "Backend AI",
    };
  }

  if (typeof geminiRecommend === "function") {
    try {
      const gemini = await geminiRecommend(query);
      let items = gemini.recommendations.map((r) => ({
        place: r.place,
        match_score: r.match_score,
        reasons: r.reasons,
      }));
      const loc = getStoredUserLocation();
      if (loc) {
        items = sortPlacesByDistance(
          items.map((i) => i.place),
          loc.lat,
          loc.lng
        ).map((place) => {
          const orig = items.find((i) => i.place.id === place.id);
          return {
            place,
            match_score: orig?.match_score || 0,
            reasons: [...(orig?.reasons || []), `Sizdan ${formatDistance(place.distance_km)} uzoqlikda`],
          };
        });
      }
      return {
        items,
        message: gemini.message,
        source: "Gemini AI",
      };
    } catch (err) {
      console.warn("Gemini fallback:", err?.message || err);
    }
  }

  const q = query.toLowerCase();
  let filtered = [...MOCK_PLACES];
  if (q.includes("tinch") || q.includes("quiet")) filtered = filtered.filter((p) => p.noise_level === "quiet");
  if (q.includes("bepul") || q.includes("free")) filtered = filtered.filter((p) => Number(p.price) === 0);
  const wifiMatch = q.match(/(\d+)\s*mbps/);
  if (wifiMatch) filtered = filtered.filter((p) => p.wifi_speed >= Number(wifiMatch[1]));

  return {
    items: filtered.slice(0, 5).map((p) => ({
      place: p,
      match_score: 70,
      reasons: ["Mos joy topildi"],
    })),
    message: "AI vaqtincha ishlamayapti — oddiy qidiruv natijasi ko'rsatilmoqda.",
    source: "Oddiy qidiruv",
  };
}

function formatPrice(price) {
  const n = Number(price);
  return n === 0 ? "Bepul" : `${n.toLocaleString()} so'm`;
}

function formatType(type) {
  const map = { cafe: "Kafe", library: "Kutubxona", coworking: "Coworking", free_zone: "Bepul zona" };
  return map[type] || type;
}

function formatNoise(level) {
  const map = { quiet: "Tinch", moderate: "O'rtacha", noisy: "Shovqinli" };
  return map[level] || level;
}

function formatWorkingHours(hours) {
  if (!hours || typeof hours !== "object") return "Ma'lumot yo'q";
  const dayLabels = {
    "dush-juma": "Dushanba — Juma",
    "dush-yak": "Har kuni",
    shanba: "Shanba",
    yakshanba: "Yakshanba",
  };
  return Object.entries(hours)
    .map(([day, time]) => `<li><span>${dayLabels[day] || day}</span><strong>${time}</strong></li>`)
    .join("");
}

function getPlaceTypeInfo(type) {
  const map = {
    cafe: "Laptop bilan ishlash uchun mos kafe. Wi-Fi, rozetka va qulay o'rindiqlar mavjud.",
    library: "Tinch o'qish va uzoq muddatli ish uchun kutubxona muhiti.",
    coworking: "Professional coworking — meeting room, printer va barqaror internet.",
    free_zone: "Bepul Wi-Fi va o'tirish joyi. Qisqa muddatli ish uchun qulay.",
  };
  return map[type] || "";
}

function getNoiseDetail(level) {
  const map = {
    quiet: "Juda tinch muhit — qo'ng'iroq qilish va diqqat talab qiladigan ish uchun ideal.",
    moderate: "O'rtacha shovqin — fon musiqasi yoki suhbatlar bo'lishi mumkin.",
    noisy: "Faol muhit — g'ovur va jonli joylar uchun mos.",
  };
  return map[level] || "";
}

function getOccupancyInfo(place) {
  const cap = Number(place.capacity) || 1;
  const free = Number(place.available_seats) || 0;
  const used = cap - free;
  const pct = Math.round((used / cap) * 100);
  if (free === 0) return { label: "To'liq band", pct, class: "full" };
  if (pct >= 75) return { label: "Juda band", pct, class: "busy" };
  if (pct >= 45) return { label: "O'rtacha band", pct, class: "busy" };
  return { label: "Bo'sh joy ko'p", pct, class: "available" };
}

function getMapsLinks(lat, lng, name) {
  const q = encodeURIComponent(name || "Joy");
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    yandex: `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
  };
}

function buildPlaceDetailHTML(place) {
  const img = place.image || getPlaceImageByType(place.type);
  const occ = getOccupancyInfo(place);
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  const maps = getMapsLinks(lat, lng, place.name);
  const amenities = place.amenities || [];
  const priceNum = Number(place.price);

  return `
    <div class="place-detail-header">
      <div class="place-detail-tags">
        <span class="tag">${formatType(place.type)}</span>
        ${place.is_real ? '<span class="tag tag-verified">Tasdiqlangan joy</span>' : ""}
        <span class="tag tag-${occ.class}">${occ.label}</span>
        <span class="rating">Reyting: ${place.rating || "—"}</span>
      </div>
      <h1>${place.name}</h1>
      <p class="place-detail-address">${place.district} tumani · ${place.address}</p>
    </div>

    <div class="detail-grid">
      <div class="detail-main">
        <div class="detail-gallery">
          <img src="${img}" alt="${place.name}" onerror="this.src='${getPlaceImageByType(place.type)}'">
          <span class="detail-gallery-badge">${formatType(place.type)} · ${formatPrice(place.price)}</span>
        </div>

        <div class="info-box detail-section">
          <h2>Joy haqida</h2>
          <p class="detail-description">${place.description || "Tavsif mavjud emas."}</p>
          <p class="detail-type-info">${getPlaceTypeInfo(place.type)}</p>
        </div>

        <div class="detail-stats-grid">
          <div class="detail-stat-card">
            <span class="detail-stat-icon">Wi-Fi</span>
            <strong>${place.wifi_speed} Mbps</strong>
            <span>Internet tezligi</span>
          </div>
          <div class="detail-stat-card">
            <span class="detail-stat-icon">Shovqin</span>
            <strong>${formatNoise(place.noise_level)}</strong>
            <span>Atrofdagi shovqin</span>
          </div>
          <div class="detail-stat-card">
            <span class="detail-stat-icon">O'rindiq</span>
            <strong>${place.available_seats} / ${place.capacity}</strong>
            <span>Bo'sh / jami</span>
          </div>
          <div class="detail-stat-card">
            <span class="detail-stat-icon">Narx</span>
            <strong>${formatPrice(place.price)}</strong>
            <span>${priceNum === 0 ? "Butunlay bepul" : "Soatlik narx"}</span>
          </div>
        </div>

        <div class="info-box detail-section">
          <h2>Ishlash sharoiti</h2>
          <ul class="detail-feature-list">
            <li>
              <span>Wi-Fi</span>
              <div><strong>${place.wifi_speed} Mbps</strong><small>Video qo'ng'iroq va yuklab olish uchun ${place.wifi_speed >= 50 ? "yetarli" : "o'rtacha"}</small></div>
            </li>
            <li>
              <span>Shovqin</span>
              <div><strong>${formatNoise(place.noise_level)}</strong><small>${getNoiseDetail(place.noise_level)}</small></div>
            </li>
            <li>
              <span>Rozetka</span>
              <div><strong>${place.sockets ? "Bor" : "Yo'q"}</strong><small>${place.sockets ? "Laptop zaryadlash mumkin" : "Powerbank olib keling"}</small></div>
            </li>
            <li>
              <span>Bandlik</span>
              <div><strong>${occ.label} (${occ.pct}% band)</strong><small>Hozir ${place.available_seats} ta bo'sh o'rindiq</small></div>
            </li>
          </ul>
        </div>

        ${amenities.length ? `
        <div class="info-box detail-section">
          <h2>Qulayliklar</h2>
          <div class="amenities-grid">
            ${amenities.map((a) => `<span class="amenity-chip">${a}</span>`).join("")}
          </div>
        </div>` : ""}

        <div class="info-box detail-section">
          <h2>Ish vaqti</h2>
          <ul class="info-list working-hours-list">${formatWorkingHours(place.working_hours)}</ul>
        </div>

        <div class="info-box detail-section reviews">
          <h2>Foydalanuvchi sharhlari</h2>
          <div id="reviewsList"><div class="loading">Yuklanmoqda...</div></div>
          ${isLoggedIn() ? `
            <form id="reviewForm" class="review-form">
              <h3>Sharh qoldirish</h3>
              <div class="review-form-grid">
                <div class="form-group"><label>Umumiy (1-5)</label><input class="form-input" type="number" name="rating" min="1" max="5" required></div>
                <div class="form-group"><label>Wi-Fi (1-5)</label><input class="form-input" type="number" name="wifi_rating" min="1" max="5" required></div>
                <div class="form-group"><label>Shovqin (1-5)</label><input class="form-input" type="number" name="noise_rating" min="1" max="5" required></div>
                <div class="form-group"><label>Qulaylik (1-5)</label><input class="form-input" type="number" name="comfort_rating" min="1" max="5" required></div>
              </div>
              <div class="form-group"><label>Izoh</label><textarea class="form-input" name="comment" rows="3" placeholder="Tajribangizni yozing..."></textarea></div>
              <button type="submit" class="btn btn-primary">Sharh yuborish</button>
            </form>
          ` : '<p class="review-login-hint">Sharh yozish uchun <a href="login.html">tizimga kiring</a></p>'}
        </div>
      </div>

      <div class="detail-sidebar">
        <div class="info-box detail-booking-card">
          <h2>Bron qilish</h2>
          <ul class="info-list compact-info-list">
            <li><span>Narx</span><strong>${formatPrice(place.price)}${priceNum > 0 ? " / soat" : ""}</strong></li>
            <li><span>Bo'sh joy</span><strong>${place.available_seats} ta</strong></li>
            <li id="placeDistanceRow" style="display:none"><span>Sizdan</span><strong id="placeDistanceValue">—</strong></li>
          </ul>
          <div class="detail-booking-actions">
            <button type="button" onclick="openQuickBook(${place.id})" class="btn btn-primary btn-lg">Vaqt tanlab bron qilish</button>
            <button type="button" onclick="handleBookPlace(${place.id})" class="btn btn-outline">To'liq bron sahifasi</button>
            ${!isLoggedIn() ? '<p class="booking-hint">Bron qilish uchun avval tizimga kiring yoki ro\'yxatdan o\'ting</p>' : ""}
            ${isLoggedIn() ? `<button class="btn btn-ghost" onclick="toggleFavorite(${place.id})">Sevimlilarga qo'shish</button>` : ""}
          </div>
        </div>

        <div class="info-box detail-section">
          <h2>Manzil va xarita</h2>
          <ul class="info-list compact-info-list">
            <li><span>Tuman</span><strong>${place.district}</strong></li>
            <li><span>Manzil</span><strong>${place.address}</strong></li>
            <li><span>Koordinata</span><strong>${lat.toFixed(5)}, ${lng.toFixed(5)}</strong></li>
          </ul>
          <div id="placeMap" class="place-detail-map"></div>
          <div class="map-links">
            <a href="${maps.google}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Google Maps</a>
            <a href="${maps.yandex}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Yandex Maps</a>
            <a href="${maps.osm}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">OpenStreetMap</a>
          </div>
        </div>

        <div class="info-box detail-section">
          <h2>Tezkor ma'lumot</h2>
          <ul class="info-list compact-info-list">
            <li><span>Joy turi</span><strong>${formatType(place.type)}</strong></li>
            <li><span>Reyting</span><strong class="rating">${place.rating || "—"} / 5</strong></li>
            <li><span>Sig'im</span><strong>${place.capacity} o'rindiq</strong></li>
            <li><span>Wi-Fi</span><strong>${place.wifi_speed} Mbps</strong></li>
            <li><span>Shovqin</span><strong>${formatNoise(place.noise_level)}</strong></li>
            <li><span>Rozetka</span><strong>${place.sockets ? "Bor" : "Yo'q"}</strong></li>
            <li><span>Holati</span><strong>${place.available_seats === 0 ? "To'liq band" : place.available_seats <= place.capacity * 0.2 ? "Kam joy" : "Bo'sh joy bor"}</strong></li>
          </ul>
        </div>
      </div>
    </div>

    <section class="detail-nearby-section">
      <h2>Yaqin atrofdagi boshqa joylar</h2>
      <p id="placeNearbyStatus" class="booking-nearby-status">Joylashuv aniqlanmoqda...</p>
      <div id="placeNearbyList" class="cards-grid"></div>
    </section>`;
}

function availabilityTag(seats, capacity) {
  if (seats === 0) return '<span class="tag full">Joy yo\'q</span>';
  if (seats <= capacity * 0.2) return '<span class="tag busy">Kam joy</span>';
  return '<span class="tag available">Bo\'sh</span>';
}

function getPlaceImage(placeId) {
  const place = MOCK_PLACES.find((p) => p.id === Number(placeId));
  return place?.image || null;
}

function getPlaceImageByType(type) {
  const fallbacks = {
    cafe: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    library: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80",
    coworking: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    free_zone: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  };
  return fallbacks[type] || fallbacks.cafe;
}

function placeImageHTML(place) {
  const img = place.image || place.primary_image || getPlaceImageByType(place.type);
  return `<img src="${img}" alt="${place.name}" loading="lazy" onerror="this.src='${getPlaceImageByType(place.type)}'">`;
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function placeCardHTML(place) {
  return `
    <article class="place-card">
      <div class="place-card-image">${placeImageHTML(place)}</div>
      <div class="place-card-body">
        <h3>${place.name}</h3>
        <div class="place-meta">
          <span class="tag">${formatType(place.type)}</span>
          ${place.is_real ? '<span class="tag tag-verified">Tasdiqlangan</span>' : ""}
          ${place.distance_km != null ? `<span class="tag tag-nearby">${formatDistance(place.distance_km)} uzoqda</span>` : ""}
          <span class="rating">Reyting: ${place.rating || "—"}</span>
          ${availabilityTag(place.available_seats, place.capacity)}
        </div>
        <p class="place-address">${place.district}, ${place.address}</p>
        <div class="place-meta place-meta-details">
          <span>Wi-Fi: ${place.wifi_speed} Mbps</span>
          <span>Shovqin: ${formatNoise(place.noise_level)}</span>
          <span>Narx: ${formatPrice(place.price)}</span>
        </div>
        <div class="card-actions">
          <a href="${placeUrl(place.id)}" class="btn btn-outline">Batafsil ma'lumot</a>
          <button type="button" onclick="openQuickBook(${place.id})" class="btn btn-primary">Bron qilish</button>
        </div>
      </div>
    </article>`;
}

function requireAuth(redirectUrl) {
  if (!isLoggedIn()) {
    openAuthModal(redirectUrl || location.href);
    return false;
  }
  return true;
}
