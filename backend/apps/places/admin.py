from django.contrib import admin

from .models import Place, PlaceImage


class PlaceImageInline(admin.TabularInline):
    model = PlaceImage
    extra = 1


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "district",
        "rating",
        "available_seats",
        "is_approved",
        "created_at",
    )
    list_filter = ("type", "district", "is_approved", "noise_level")
    search_fields = ("name", "address", "district")
    list_editable = ("is_approved",)
    inlines = [PlaceImageInline]
    actions = ["approve_places", "reject_places"]

    @admin.action(description="Tanlangan joylarni tasdiqlash")
    def approve_places(self, request, queryset):
        queryset.update(is_approved=True)

    @admin.action(description="Tanlangan joylarni rad etish")
    def reject_places(self, request, queryset):
        queryset.update(is_approved=False)
