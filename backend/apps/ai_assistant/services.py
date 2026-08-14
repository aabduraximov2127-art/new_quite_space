import json
import re

import requests
from django.conf import settings

from apps.places.models import Place


def _parse_query_rules(query: str) -> dict:
    q = query.lower()
    params = {}

    districts = [
        "yunusobod", "chilonzor", "mirzo ulug'bek", "yakkasaroy",
        "shayxontohur", "olmazor", "sergeli", "yashnobod",
        "bektemir", "uchtepa", "mirobad", "yangihayot",
    ]
    for district in districts:
        if district in q:
            params["district"] = district
            break

    wifi_match = re.search(r"(\d+)\s*mbps?", q)
    if wifi_match:
        params["min_wifi"] = int(wifi_match.group(1))

    price_match = re.search(r"(\d[\d\s]*)\s*(so'?m|sum)", q)
    if price_match:
        params["max_price"] = int(price_match.group(1).replace(" ", ""))

    if any(w in q for w in ["tinch", "quiet", "jim"]):
        params["noise_level"] = Place.NoiseLevel.QUIET
    if any(w in q for w in ["rozetka", "socket", "rozetkasi"]):
        params["has_sockets"] = True
    if any(w in q for w in ["bepul", "free", "tekin"]):
        params["is_free"] = True
    if "kafe" in q or "cafe" in q:
        params["type"] = Place.PlaceType.CAFE
    if "kutubxona" in q or "library" in q:
        params["type"] = Place.PlaceType.LIBRARY
    if "coworking" in q:
        params["type"] = Place.PlaceType.COWORKING

    return params


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _call_gemini(prompt: str) -> str:
    model = settings.AI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    response = requests.post(
        url,
        headers={
            "x-goog-api-key": settings.AI_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1},
        },
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def _parse_query_ai(query: str) -> dict:
    if not settings.AI_API_KEY:
        return _parse_query_rules(query)

    prompt = (
        "Sen QuietSpace Tashkent platformasining AI assistentisan. "
        "Foydalanuvchi ish joyi qidiruv so'rovini tushun va faqat JSON qaytaring. "
        "Kalitlar: district, min_wifi, max_price, noise_level (quiet/moderate/noisy), "
        "has_sockets (true/false), is_free (true/false), type (cafe/library/coworking/free_zone). "
        "Bo'sh kalitlarni qo'shmang.\n\nSo'rov: "
        + query
    )

    try:
        content = _call_gemini(prompt)
        return _extract_json(content)
    except Exception:
        return _parse_query_rules(query)


def _build_places_context(places) -> str:
    lines = []
    for p in places[:20]:
        lines.append(
            f"- ID:{p.id} | {p.name} | {p.district} | {p.type} | "
            f"Wi-Fi:{p.wifi_speed}Mbps | shovqin:{p.noise_level} | "
            f"narx:{p.price} | bo'sh:{p.available_seats} | reyting:{p.rating}"
        )
    return "\n".join(lines)


def _parse_query_ai_with_places(query: str, places) -> tuple[dict, str | None]:
    """Gemini orqali parametrlar + qisqa javob matni."""
    if not settings.AI_API_KEY:
        return _parse_query_rules(query), None

    context = _build_places_context(places)
    prompt = (
        "Sen QuietSpace Tashkent AI assistentisan. Faqat mavjud joylardan tavsiya ber.\n"
        "1) Foydalanuvchi talablarini JSON formatda ajrat (district, min_wifi, max_price, "
        "noise_level, has_sockets, is_free, type).\n"
        "2) Qisqa o'zbekcha javob matni yoz.\n"
        "Javobni quyidagi JSON formatda qaytaring:\n"
        '{"filters": {...}, "message": "..."}\n\n'
        f"Mavjud joylar:\n{context}\n\nFoydalanuvchi so'rovi: {query}"
    )

    try:
        content = _call_gemini(prompt)
        parsed = _extract_json(content)
        return parsed.get("filters", {}), parsed.get("message")
    except Exception:
        return _parse_query_rules(query), None


def _score_place(place: Place, params: dict) -> tuple[int, list[str]]:
    score = 0
    reasons = []

    if params.get("district") and params["district"].lower() in place.district.lower():
        score += 30
        reasons.append(f"{place.district} tumanda joylashgan")

    min_wifi = params.get("min_wifi")
    if min_wifi and place.wifi_speed >= min_wifi:
        score += 25
        reasons.append(f"Wi-Fi tezligi {place.wifi_speed} Mbps")

    max_price = params.get("max_price")
    if max_price is not None and float(place.price) <= max_price:
        score += 20
        reasons.append(f"Narxi {place.price} so'm")

    if params.get("noise_level") == place.noise_level:
        score += 15
        reasons.append("Shovqin darajasi mos")

    if params.get("has_sockets") and place.sockets:
        score += 10
        reasons.append("Rozetka mavjud")

    if params.get("is_free") and float(place.price) == 0:
        score += 15
        reasons.append("Bepul joy")

    if params.get("type") == place.type:
        score += 10
        reasons.append(f"Joy turi: {place.get_type_display()}")

    if place.available_seats > 0:
        score += 5
        reasons.append(f"Hozir {place.available_seats} ta bo'sh joy")

    return score, reasons


def recommend_places(query: str, limit: int = 5) -> dict:
    all_places = list(Place.objects.filter(is_approved=True).prefetch_related("images"))
    params, ai_message = _parse_query_ai_with_places(query, all_places)
    if not params:
        params = _parse_query_ai(query)

    places = Place.objects.filter(is_approved=True).prefetch_related("images")

    if params.get("district"):
        places = places.filter(district__icontains=params["district"])
    if params.get("min_wifi"):
        places = places.filter(wifi_speed__gte=params["min_wifi"])
    if params.get("max_price") is not None:
        places = places.filter(price__lte=params["max_price"])
    if params.get("noise_level"):
        places = places.filter(noise_level=params["noise_level"])
    if params.get("has_sockets"):
        places = places.filter(sockets=True)
    if params.get("is_free"):
        places = places.filter(price=0)
    if params.get("type"):
        places = places.filter(type=params["type"])

    results = []
    for place in places:
        score, reasons = _score_place(place, params)
        if score > 0:
            results.append({"place": place, "score": score, "reasons": reasons})

    if not results and all_places:
        for place in all_places[:limit]:
            score, reasons = _score_place(place, params)
            results.append({
                "place": place,
                "score": max(score, 10),
                "reasons": reasons or ["Mos joylar qidirilmoqda"],
            })

    results.sort(key=lambda x: (x["score"], float(x["place"].rating)), reverse=True)
    return {
        "recommendations": results[:limit],
        "message": ai_message,
        "filters_used": params,
    }
