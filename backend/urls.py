from django.urls import path
from views import health, metadata, predict_view


urlpatterns = [
    path("api/health/", health),
    path("api/metadata/", metadata),
    path("api/predict/", predict_view),
]