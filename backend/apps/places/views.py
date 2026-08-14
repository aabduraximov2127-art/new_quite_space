from rest_framework import permissions, viewsets

from apps.common.permissions import IsAdminUser

from .models import Place
from .serializers import (
    PlaceCreateUpdateSerializer,
    PlaceDetailSerializer,
    PlaceFilter,
    PlaceListSerializer,
)


class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.filter(is_approved=True).prefetch_related("images")
    filterset_class = PlaceFilter
    search_fields = ["name", "district", "address"]
    ordering_fields = ["rating", "price", "wifi_speed", "available_seats", "created_at"]
    ordering = ["-rating"]

    def get_queryset(self):
        qs = Place.objects.prefetch_related("images")
        if self.action in ("list", "retrieve"):
            if self.request.user.is_authenticated and self.request.user.role == "admin":
                return qs
            return qs.filter(is_approved=True)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PlaceListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PlaceCreateUpdateSerializer
        return PlaceDetailSerializer

    def get_permissions(self):
        if self.action in ("create",):
            return [permissions.IsAuthenticated()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminUser()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        place = serializer.save()
        from apps.availability.models import Availability

        Availability.objects.create(
            place=place,
            total_seats=place.capacity,
            available_seats=place.available_seats,
            occupied_seats=place.capacity - place.available_seats,
        )
