from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404

from api.decorators import api_view
from api.http import conditional_json_response, json_error, parse_json_body
from api.idempotency import (
    finalize_idempotent_response,
    replay_idempotent_response,
)
from .models import Task, SubTask
from .serializers import (
    serialize_task,
    serialize_subtask,
    create_task_from_body,
    update_task_from_body,
    create_subtask_from_body,
    update_subtask_from_body,
    save_subtasks,
)
from .services import get_tasks_last_modified, serialize_task_list


@api_view
@require_http_methods(['GET', 'POST'])
def task_list_create(request):
    if request.method == 'GET':
        payload = serialize_task_list()
        return conditional_json_response(
            request,
            payload,
            safe=False,
            last_modified=get_tasks_last_modified(),
        )

    replay_response, idempotency_key = replay_idempotent_response(request, 'tasks:POST')
    if replay_response:
        return replay_response

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response

    task, errors, outcome = create_task_from_body(body)
    if errors:
        status = 409 if (body.get('id') and Task.objects.filter(pk=body['id']).exists()) else 400
        return json_error('Validation failed', status=status, details={'fields': errors})

    response_body = serialize_task(task)
    status = 201 if outcome == 'created' else 200
    return finalize_idempotent_response(
        request, 'tasks:POST', idempotency_key, status, response_body
    )


@api_view
@require_http_methods(['GET', 'PATCH', 'DELETE'])
def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk)

    if request.method == 'GET':
        return conditional_json_response(
            request, serialize_task(task), last_modified=task.updated_at
        )

    if request.method == 'DELETE':
        task.delete()
        return JsonResponse({'message': 'Task deleted successfully'}, status=200)

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response

    updated_task, errors = update_task_from_body(task, body)
    if errors:
        return json_error('Validation failed', status=400, details={'fields': errors})

    return JsonResponse(serialize_task(updated_task))


@api_view
@require_http_methods(['GET', 'POST', 'PUT'])
def subtask_list_create(request, task_id):
    """
    하위 작업(SubTask) 컬렉션 리소스.
    GET: 목록 조회, POST: 항목 하나 생성, PUT: 컬렉션 전체 교체(예: AI 체크리스트 재생성).
    """
    task = get_object_or_404(Task, pk=task_id)

    if request.method == 'GET':
        return JsonResponse(
            [serialize_subtask(s) for s in task.subtasks.all()], safe=False
        )

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response

    if request.method == 'PUT':
        if not isinstance(body, list):
            return json_error('요청 본문은 배열이어야 합니다.', status=400)

        errors = save_subtasks(task, body, replace=True)
        if errors:
            return json_error('Validation failed', status=400, details={'fields': errors})

        # 체크리스트를 통째로 재생성한 시각을 기록한다. hasUnreflectedReview는
        # serialize_task에서 이 값과 최신 리뷰 시각을 비교해 그때그때 계산된다.
        task.checklist_generated_at = timezone.now()
        task.save(update_fields=['checklist_generated_at'])

        return JsonResponse(
            [serialize_subtask(s) for s in task.subtasks.all()], safe=False
        )

    replay_response, idempotency_key = replay_idempotent_response(
        request, f'tasks:{task_id}:subtasks:POST'
    )
    if replay_response:
        return replay_response

    subtask, errors, outcome = create_subtask_from_body(task, body)
    if errors:
        status = 409 if (body.get('id') and SubTask.objects.filter(pk=body['id']).exists()) else 400
        return json_error('Validation failed', status=status, details={'fields': errors})

    response_body = serialize_subtask(subtask)
    status = 201 if outcome == 'created' else 200
    return finalize_idempotent_response(
        request, f'tasks:{task_id}:subtasks:POST', idempotency_key, status, response_body
    )


@api_view
@require_http_methods(['PATCH', 'DELETE'])
def subtask_detail(request, task_id, subtask_id):
    subtask = get_object_or_404(SubTask, pk=subtask_id, task_id=task_id)

    if request.method == 'DELETE':
        subtask.delete()
        return JsonResponse({'message': 'Subtask deleted successfully'}, status=200)

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response

    updated_subtask, errors = update_subtask_from_body(subtask, body)
    if errors:
        return json_error('Validation failed', status=400, details={'fields': errors})

    return JsonResponse(serialize_subtask(updated_subtask))
