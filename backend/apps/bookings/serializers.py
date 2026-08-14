from django.utils import timezone
from rest_framework import serializers

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    place_name = serializers.CharField(source="place.name", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "user",
            "place",
            "place_name",
            "date",
            "start_time",
            "end_time",
            "seat_number",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "status", "created_at", "updated_at")

    def validate(self, attrs):
        start_time = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end_time = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        date = attrs.get("date") or getattr(self.instance, "date", None)
        place = attrs.get("place") or getattr(self.instance, "place", None)
        seat_number = attrs.get("seat_number") or getattr(self.instance, "seat_number", None)

        if start_time >= end_time:
            raise serializers.ValidationError({"end_time": "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak"})

        if date and date < timezone.localdate():
            raise serializers.ValidationError({"date": "O'tmish sana uchun booking qilib bo'lmaydi"})

        if place and seat_number:
            if seat_number > place.capacity:
                raise serializers.ValidationError({"seat_number": "O'rindiq raqami sig'imdan oshib ketdi"})

            conflict = Booking.objects.filter(
                place=place,
                date=date,
                seat_number=seat_number,
                status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            ).exclude(pk=getattr(self.instance, "pk", None))

            for booking in conflict:
                if start_time < booking.end_time and end_time > booking.start_time:
                    raise serializers.ValidationError(
                        {"seat_number": "Bu o'rindiq tanlangan vaqt oralig'ida band"}
                    )

        return attrs

    def create(self, validated_data):
        place = validated_data["place"]
        availability = getattr(place, "availability", None)
        if availability and availability.available_seats <= 0:
            raise serializers.ValidationError({"place": "Bo'sh joy yo'q"})

        booking = Booking.objects.create(
            user=self.context["request"].user,
            status=Booking.Status.CONFIRMED,
            **validated_data,
        )

        if availability:
            availability.available_seats = max(0, availability.available_seats - 1)
            availability.recalculate()

        return booking


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ("place", "date", "start_time", "end_time", "seat_number")

    def validate(self, attrs):
        return BookingSerializer(context=self.context).validate(attrs)

    def create(self, validated_data):
        place = validated_data["place"]
        availability = getattr(place, "availability", None)
        if availability and availability.available_seats <= 0:
            raise serializers.ValidationError({"place": "Bo'sh joy yo'q"})

        booking = Booking.objects.create(
            user=self.context["request"].user,
            status=Booking.Status.CONFIRMED,
            **validated_data,
        )

        if availability:
            availability.available_seats = max(0, availability.available_seats - 1)
            availability.recalculate()

        return booking
