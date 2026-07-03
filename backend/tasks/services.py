from django.db.models import Max

from .models import Task
from .serializers import serialize_task


def serialize_task_list():
    tasks = Task.objects.prefetch_related('subtasks').all()
    return [serialize_task(task) for task in tasks]


def get_tasks_last_modified():
    """목록 캐시 검증용 Last-Modified (가장 최근 task.updated_at). 작업 없으면 None."""
    return Task.objects.aggregate(latest=Max('updated_at'))['latest']
