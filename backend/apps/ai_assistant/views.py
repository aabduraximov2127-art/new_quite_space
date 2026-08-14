from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.places.serializers import PlaceListSerializer

from .services import recommend_places


class RecommendRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1000)


class RecommendView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RecommendRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data["query"]

        result = recommend_places(query)
        data = []
        for item in result["recommendations"]:
            place_data = PlaceListSerializer(item["place"], context={"request": request}).data
            data.append(
                {
                    "place": place_data,
                    "match_score": item["score"],
                    "reasons": item["reasons"],
                }
            )

        return Response(
            {
                "success": True,
                "query": query,
                "count": len(data),
                "message": result.get("message"),
                "filters_used": result.get("filters_used"),
                "recommendations": data,
            },
            status=status.HTTP_200_OK,
        )
