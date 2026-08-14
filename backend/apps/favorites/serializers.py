from rest_framework import serializers

from apps.places.serializers import PlaceListSerializer

from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    place = PlaceListSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ("id", "place", "created_at")
