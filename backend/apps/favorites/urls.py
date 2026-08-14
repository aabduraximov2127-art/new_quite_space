from django.urls import path

from .views import FavoriteListView, FavoriteToggleView

urlpatterns = [
    path("favorites/", FavoriteListView.as_view(), name="favorites-list"),
    path("favorites/<int:place_id>/", FavoriteToggleView.as_view(), name="favorites-toggle"),
]
