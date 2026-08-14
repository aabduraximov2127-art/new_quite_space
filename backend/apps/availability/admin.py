from django.contrib import admin

from .models import Availability


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ("place", "total_seats", "available_seats", "occupied_seats", "status", "updated_at")
    list_filter = ("status",)
