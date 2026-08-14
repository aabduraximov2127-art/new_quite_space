from rest_framework import serializers

from .models import Availability


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = (
            "id",
            "place",
            "total_seats",
            "available_seats",
            "occupied_seats",
            "status",
            "updated_at",
        )
