from django.conf import settings
from django.db import models
from django.db.models import Avg

from apps.common.models import TimestampedModel
from apps.places.models import Place


class Review(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    wifi_rating = models.PositiveSmallIntegerField()
    noise_rating = models.PositiveSmallIntegerField()
    comfort_rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ("user", "place")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} -> {self.place.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_place_rating()

    def delete(self, *args, **kwargs):
        place = self.place
        super().delete(*args, **kwargs)
        self._update_place_rating_for(place)

    @staticmethod
    def _update_place_rating_for(place):
        avg = place.reviews.aggregate(avg=Avg("rating"))["avg"]
        place.rating = round(avg or 0, 2)
        place.save(update_fields=["rating"])

    def _update_place_rating(self):
        self._update_place_rating_for(self.place)
