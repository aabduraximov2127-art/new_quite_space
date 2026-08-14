from django.urls import path

from .views import PlaceAvailabilityView

urlpatterns = [
    path(
        "places/<int:place_id>/availability/",
        PlaceAvailabilityView.as_view(),
        name="place-availability",
    ),
]
