from datetime import datetime, time, timedelta

from django.utils import timezone

from apps.places.models import Place

from .models import Booking


DURATION_PRESETS = [
    {"label": "1 soat", "hours": 1},
    {"label": "2 soat", "hours": 2},
    {"label": "3 soat", "hours": 3},
    {"label": "4 soat", "hours": 4},
]


def _round_up_hour(now):
    if now.minute > 0 or now.second > 0:
        return now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    return now.replace(minute=0, second=0, microsecond=0)


def _default_slot(now=None):
    now = now or timezone.localtime()
    start_dt = _round_up_hour(now)
    if start_dt.hour >= 21:
        start_dt = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(hours=3)
    if end_dt.hour > 22 or (end_dt.hour == 22 and end_dt.minute > 0):
        end_dt = start_dt.replace(hour=22, minute=0)
    return start_dt.date(), start_dt.time(), end_dt.time()


def _times_overlap(start_a, end_a, start_b, end_b):
    return start_a < end_b and end_a > start_b


def get_available_seats(place, date, start_time, end_time):
    booked = Booking.objects.filter(
        place=place,
        date=date,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
    )
    occupied = set()
    for booking in booked:
        if _times_overlap(start_time, end_time, booking.start_time, booking.end_time):
            occupied.add(booking.seat_number)
    free = [seat for seat in range(1, place.capacity + 1) if seat not in occupied]
    return free[:16]


def _estimate_price(place, start_time, end_time):
    price = float(place.price)
    if price == 0:
        return 0
    start_dt = datetime.combine(timezone.localdate(), start_time)
    end_dt = datetime.combine(timezone.localdate(), end_time)
    hours = max(1, (end_dt - start_dt).total_seconds() / 3600)
    return int(price * hours)


def get_booking_options(place_id, date_str=None, start_str=None, end_str=None):
    place = Place.objects.filter(pk=place_id, is_approved=True).first()
    if not place:
        return None

    today = timezone.localdate()
    default_date, default_start, default_end = _default_slot()

    if date_str:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        date = default_date

    if date < today:
        date = today

    start_time = default_start
    end_time = default_end
    if start_str:
        start_time = datetime.strptime(start_str, "%H:%M").time()
    if end_str:
        end_time = datetime.strptime(end_str, "%H:%M").time()

    if start_time >= end_time:
        end_time = (datetime.combine(date, start_time) + timedelta(hours=3)).time()

    available_seats = get_available_seats(place, date, start_time, end_time)
    availability = getattr(place, "availability", None)

    quick_dates = [
        {"label": "Bugun", "date": today.isoformat()},
        {"label": "Ertaga", "date": (today + timedelta(days=1)).isoformat()},
        {"label": "Indinga", "date": (today + timedelta(days=2)).isoformat()},
    ]

    return {
        "place": {
            "id": place.id,
            "name": place.name,
            "type": place.type,
            "address": place.address,
            "district": place.district,
            "price": str(place.price),
            "wifi_speed": place.wifi_speed,
            "noise_level": place.noise_level,
            "capacity": place.capacity,
            "rating": str(place.rating),
        },
        "availability": {
            "total_seats": availability.total_seats if availability else place.capacity,
            "available_seats": availability.available_seats if availability else place.available_seats,
            "status": availability.status if availability else "available",
        },
        "suggested": {
            "date": date.isoformat(),
            "start_time": start_time.strftime("%H:%M"),
            "end_time": end_time.strftime("%H:%M"),
            "seat_number": available_seats[0] if available_seats else None,
        },
        "duration_presets": DURATION_PRESETS,
        "quick_dates": quick_dates,
        "available_seats": available_seats,
        "estimated_price": _estimate_price(place, start_time, end_time),
        "working_hours_hint": place.working_hours or {},
    }
