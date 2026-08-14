from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound

from apps.places.models import Place

from .models import Availability
from .serializers import AvailabilitySerializer


class PlaceAvailabilityView(generics.RetrieveAPIView):
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        place = Place.objects.filter(pk=self.kwargs["place_id"], is_approved=True).first()
        if not place:
            raise NotFound("Joy topilmadi")
        availability, _ = Availability.objects.get_or_create(
            place=place,
            defaults={
                "total_seats": place.capacity,
                "available_seats": place.available_seats,
                "occupied_seats": place.capacity - place.available_seats,
            },
        )
        availability.recalculate()
        return availability
