from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.sql_urls import urlpatterns as sql_urlpatterns
from api.views import ItemViewSet

router = DefaultRouter()
router.register(r"items", ItemViewSet, basename="item")

urlpatterns = [
    *sql_urlpatterns,
    path("", include(router.urls)),
]
