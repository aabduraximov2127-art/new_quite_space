# QuietSpace Tashkent — Django Backend

## Talablar

- Python 3.11+
- PostgreSQL 14+

## O'rnatish

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env         # sozlamalarni tahrirlang
```

PostgreSQL'da `quietspace` nomli database yarating, keyin:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`

## API Endpointlar

| Method | URL | Auth |
|--------|-----|------|
| POST | `/api/auth/register/` | Yo'q |
| POST | `/api/auth/login/` | Yo'q |
| POST | `/api/auth/refresh/` | Yo'q |
| GET | `/api/auth/me/` | Ha |
| GET | `/api/places/` | Yo'q |
| GET | `/api/places/<id>/` | Yo'q |
| POST | `/api/places/` | Ha |
| GET | `/api/places/<id>/reviews/` | Yo'q |
| POST | `/api/places/<id>/reviews/` | Ha |
| POST | `/api/bookings/` | Ha |
| GET | `/api/bookings/my/` | Ha |
| PATCH | `/api/bookings/<id>/cancel/` | Ha |
| GET | `/api/favorites/` | Ha |
| POST/DELETE | `/api/favorites/<place_id>/` | Ha |
| GET | `/api/places/<id>/availability/` | Yo'q |
| GET | `/api/places/<id>/booking-options/` | Yo'q |
| POST | `/api/ai/recommend/` | Yo'q |

## Filter misollari

```
GET /api/places/?district=yunusobod
GET /api/places/?type=cafe&min_wifi=50&noise_level=quiet&has_sockets=true
GET /api/places/?ordering=-rating
```

## Admin panel

`http://127.0.0.1:8000/admin/`
