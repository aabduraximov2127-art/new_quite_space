from django.http import JsonResponse

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


def health_check(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("api/health/", health_check),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.places.urls")),
    path("api/", include("apps.reviews.urls")),
    path("api/", include("apps.bookings.urls")),
    path("api/", include("apps.favorites.urls")),
    path("api/", include("apps.availability.urls")),
    path("api/ai/", include("apps.ai_assistant.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
