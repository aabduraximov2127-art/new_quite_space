from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("user", "place", "date", "start_time", "end_time", "seat_number", "status", "created_at")
    list_filter = ("status", "date")
    search_fields = ("user__email", "place__name")
