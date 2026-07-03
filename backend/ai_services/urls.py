from django.urls import path
from . import views

urlpatterns = [
    path('generate-checklist/', views.generate_checklist, name='generate-checklist'),
]
