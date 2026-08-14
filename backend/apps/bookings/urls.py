from django.urls import path

from .views import (
    BookingCancelView,
    BookingCreateView,
    BookingDetailView,
    MyBookingsView,
    PlaceBookingOptionsView,
)

urlpatterns = [
    path("places/<int:place_id>/booking-options/", PlaceBookingOptionsView.as_view(), name="booking-options"),
    path("bookings/", BookingCreateView.as_view(), name="booking-create"),
    path("bookings/my/", MyBookingsView.as_view(), name="booking-my"),
    path("bookings/<int:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("bookings/<int:pk>/cancel/", BookingCancelView.as_view(), name="booking-cancel"),
]
