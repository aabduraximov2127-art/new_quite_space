from rest_framework import generics, permissions

from apps.common.permissions import IsOwnerOrReadOnly

from .models import Review
from .serializers import ReviewSerializer


class PlaceReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Review.objects.filter(place_id=self.kwargs["place_id"]).select_related("user")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, place_id=self.kwargs["place_id"])


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    queryset = Review.objects.all()
