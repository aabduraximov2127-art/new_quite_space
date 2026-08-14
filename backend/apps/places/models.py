from django.conf import settings
from django.db import models

from apps.common.models import TimestampedModel


class Place(TimestampedModel):
    class PlaceType(models.TextChoices):
        CAFE = "cafe", "Cafe"
        LIBRARY = "library", "Library"
        COWORKING = "coworking", "Coworking"
        FREE_ZONE = "free_zone", "Free Zone"

    class NoiseLevel(models.TextChoices):
        QUIET = "quiet", "Tinch"
        MODERATE = "moderate", "O'rtacha"
        NOISY = "noisy", "Shovqinli"

    name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=PlaceType.choices)
    address = models.CharField(max_length=500)
    district = models.CharField(max_length=100, db_index=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    working_hours = models.JSONField(default=dict, blank=True)
    wifi_speed = models.PositiveIntegerField(help_text="Mbps")
    noise_level = models.CharField(max_length=20, choices=NoiseLevel.choices)
    sockets = models.BooleanField(default=True)
    capacity = models.PositiveIntegerField()
    available_seats = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    amenities = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="places",
    )
    is_approved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-rating", "-created_at"]

    def __str__(self):
        return self.name


class PlaceImage(models.Model):
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="places/")
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "-created_at"]

    def __str__(self):
        return f"{self.place.name} image"
