from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "user_name",
            "place",
            "rating",
            "wifi_rating",
            "noise_rating",
            "comfort_rating",
            "comment",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "place", "created_at", "updated_at")

    def validate_rating(self, value):
        return self._validate_score(value)

    def validate_wifi_rating(self, value):
        return self._validate_score(value)

    def validate_noise_rating(self, value):
        return self._validate_score(value)

    def validate_comfort_rating(self, value):
        return self._validate_score(value)

    @staticmethod
    def _validate_score(value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating 1 dan 5 gacha bo'lishi kerak")
        return value
