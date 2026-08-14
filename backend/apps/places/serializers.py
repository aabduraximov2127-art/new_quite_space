import django_filters
from rest_framework import serializers

from .models import Place, PlaceImage


class PlaceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceImage
        fields = ("id", "image", "is_primary")


class PlaceListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = (
            "id",
            "name",
            "type",
            "address",
            "district",
            "latitude",
            "longitude",
            "price",
            "wifi_speed",
            "noise_level",
            "sockets",
            "capacity",
            "available_seats",
            "rating",
            "primary_image",
        )

    def get_primary_image(self, obj):
        image = obj.images.filter(is_primary=True).first() or obj.images.first()
        if image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image.image.url)
            return image.image.url
        return None


class PlaceDetailSerializer(serializers.ModelSerializer):
    images = PlaceImageSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

    class Meta:
        model = Place
        fields = (
            "id",
            "name",
            "description",
            "type",
            "address",
            "district",
            "latitude",
            "longitude",
            "price",
            "working_hours",
            "wifi_speed",
            "noise_level",
            "sockets",
            "capacity",
            "available_seats",
            "rating",
            "amenities",
            "images",
            "is_approved",
            "created_by_name",
            "created_at",
            "updated_at",
        )


class PlaceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Place
        fields = (
            "name",
            "description",
            "type",
            "address",
            "district",
            "latitude",
            "longitude",
            "price",
            "working_hours",
            "wifi_speed",
            "noise_level",
            "sockets",
            "capacity",
            "available_seats",
            "amenities",
        )

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        validated_data["is_approved"] = False
        return super().create(validated_data)


class PlaceFilter(django_filters.FilterSet):
    district = django_filters.CharFilter(field_name="district", lookup_expr="icontains")
    type = django_filters.ChoiceFilter(choices=Place.PlaceType.choices)
    noise_level = django_filters.ChoiceFilter(choices=Place.NoiseLevel.choices)
    min_wifi = django_filters.NumberFilter(field_name="wifi_speed", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    has_sockets = django_filters.BooleanFilter(field_name="sockets")
    available = django_filters.BooleanFilter(method="filter_available")
    is_free = django_filters.BooleanFilter(method="filter_free")

    class Meta:
        model = Place
        fields = ["district", "type", "noise_level"]

    def filter_available(self, queryset, name, value):
        if value:
            return queryset.filter(available_seats__gt=0)
        return queryset

    def filter_free(self, queryset, name, value):
        if value:
            return queryset.filter(price=0)
        return queryset
