from django.urls import path

from .views import PlaceReviewListCreateView, ReviewDetailView

urlpatterns = [
    path(
        "places/<int:place_id>/reviews/",
        PlaceReviewListCreateView.as_view(),
        name="place-reviews",
    ),
    path("reviews/<int:pk>/", ReviewDetailView.as_view(), name="review-detail"),
]
