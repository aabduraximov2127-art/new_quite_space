from django.db import models

from apps.places.models import Place


class Availability(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Bo'sh"
        BUSY = "busy", "Kam joy"
        FULL = "full", "To'liq"

    place = models.OneToOneField(Place, on_delete=models.CASCADE, related_name="availability")
    total_seats = models.PositiveIntegerField()
    available_seats = models.PositiveIntegerField()
    occupied_seats = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "availabilities"

    def __str__(self):
        return f"{self.place.name} — {self.available_seats}/{self.total_seats}"

    def recalculate(self):
        self.occupied_seats = self.total_seats - self.available_seats
        if self.available_seats == 0:
            self.status = self.Status.FULL
        elif self.available_seats <= self.total_seats * 0.2:
            self.status = self.Status.BUSY
        else:
            self.status = self.Status.AVAILABLE
        self.save()
        self.place.available_seats = self.available_seats
        self.place.save(update_fields=["available_seats"])
