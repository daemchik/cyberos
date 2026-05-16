from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets
from rest_framework import serializers

from api.models import Item


class HealthView(APIView):
    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "cyberos-api",
            },
            status=status.HTTP_200_OK,
        )


class PingView(APIView):
    def get(self, request):
        return Response({"message": "pong"}, status=status.HTTP_200_OK)


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all().order_by("-created_at")
    serializer_class = ItemSerializer
