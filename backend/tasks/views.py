from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404

from django.utils import timezone

from api.decorators import api_view
from api.http import conditional_json_response, json_error, parse_json_body
from api.idempotency import (
    finalize_idempotent_response,
    replay_idempotent_response,
)
from .models import Task
from .serializers import (
    serialize_task,
    create_task_from_body,
    update_task_from_body,
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
@require_http_methods(['PATCH', 'DELETE'])
def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk)

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
