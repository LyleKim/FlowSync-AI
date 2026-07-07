from django.urls import path
from . import views

urlpatterns = [
    path('<str:task_id>/reviews/', views.review_list_create, name='review-list-create'),
    path('<str:task_id>/reviews/<str:review_id>/', views.review_detail, name='review-detail'),
]
