"""
URL configuration for FlowSync AI backend.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('ai_services.urls')),
    path('api/v1/tasks/', include('tasks.urls')),
    path('api/v1/tasks/', include('reviews.urls')),
]
