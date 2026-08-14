from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.places.models import Place

from .models import Favorite
from .serializers import FavoriteSerializer


class FavoriteListView(generics.ListAPIView):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related("place")


class FavoriteToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, place_id):
        place = Place.objects.filter(pk=place_id, is_approved=True).first()
        if not place:
            return Response({"success": False, "errors": {"detail": "Joy topilmadi"}}, status=404)
        favorite, created = Favorite.objects.get_or_create(user=request.user, place=place)
        if created:
            return Response(
                {"success": True, "favorite": FavoriteSerializer(favorite, context={"request": request}).data},
                status=status.HTTP_201_CREATED,
            )
        return Response({"success": True, "message": "Allaqachon favorite'da"})

    def delete(self, request, place_id):
        deleted, _ = Favorite.objects.filter(user=request.user, place_id=place_id).delete()
        if not deleted:
            return Response({"success": False, "errors": {"detail": "Favorite topilmadi"}}, status=404)
        return Response({"success": True, "message": "Favorite o'chirildi"})
