from django.db import models

from apps.common.models import TimestampedModel
from apps.places.models import Place


class Booking(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="bookings")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    seat_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["place", "date", "seat_number"],
                condition=models.Q(status__in=["pending", "confirmed"]),
                name="unique_active_seat_booking",
            )
        ]

    def __str__(self):
        return f"{self.user.email} — {self.place.name} ({self.date})"

    @property
    def is_active(self):
        return self.status in (self.Status.PENDING, self.Status.CONFIRMED)
