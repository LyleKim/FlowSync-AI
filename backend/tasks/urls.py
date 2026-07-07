from django.urls import path
from . import views

urlpatterns = [
    path('', views.task_list_create, name='task-list-create'),
    path('<str:task_id>/subtasks/', views.subtask_list_create, name='subtask-list-create'),
    path('<str:task_id>/subtasks/<str:subtask_id>/', views.subtask_detail, name='subtask-detail'),
    path('<str:pk>/', views.task_detail, name='task-detail'),
]
