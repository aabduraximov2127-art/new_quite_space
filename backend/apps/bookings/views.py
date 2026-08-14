from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer
from .services import get_booking_options


class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(
            {"success": True, "booking": BookingSerializer(booking).data},
            status=status.HTTP_201_CREATED,
        )


class MyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related("place")


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related("place")


class BookingCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        booking = Booking.objects.filter(pk=pk, user=request.user).first()
        if not booking:
            return Response({"success": False, "errors": {"detail": "Booking topilmadi"}}, status=404)
        if booking.status == Booking.Status.CANCELLED:
            return Response({"success": False, "errors": {"detail": "Booking allaqachon bekor qilingan"}}, status=400)

        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status", "updated_at"])

        availability = getattr(booking.place, "availability", None)
        if availability:
            availability.available_seats = min(availability.total_seats, availability.available_seats + 1)
            availability.recalculate()

        return Response({"success": True, "booking": BookingSerializer(booking).data})


class PlaceBookingOptionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, place_id):
        options = get_booking_options(
            place_id,
            date_str=request.query_params.get("date"),
            start_str=request.query_params.get("start_time"),
            end_str=request.query_params.get("end_time"),
        )
        if not options:
            return Response({"success": False, "errors": {"detail": "Joy topilmadi"}}, status=404)
        return Response({"success": True, **options})
