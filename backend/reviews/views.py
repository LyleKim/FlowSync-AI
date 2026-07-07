from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404

from api.decorators import api_view
from api.http import json_error, parse_json_body
from api.idempotency import finalize_idempotent_response, replay_idempotent_response
from tasks.models import Task

from .models import RoleReview
from .serializers import (
    serialize_review,
    create_review_from_body,
    update_review_from_body,
)


@api_view
@require_http_methods(['GET', 'POST'])
def review_list_create(request, task_id):
    """작업(Task)에 달린 역할별 검토(RoleReview) 컬렉션 리소스."""
    task = get_object_or_404(Task, pk=task_id)

    if request.method == 'GET':
        reviews = RoleReview.objects.filter(task_id=task.id)
        return JsonResponse([serialize_review(r) for r in reviews], safe=False)

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response
    body = {**body, 'taskId': task.id}

    replay_response, idempotency_key = replay_idempotent_response(
        request, f'tasks:{task_id}:reviews:POST'
    )
    if replay_response:
        return replay_response

    review, errors, outcome = create_review_from_body(body)
    if errors:
        status = 409 if (body.get('id') and RoleReview.objects.filter(pk=body['id']).exists()) else 400
        return json_error('Validation failed', status=status, details={'fields': errors})

    response_body = serialize_review(review)
    status = 201 if outcome == 'created' else 200
    return finalize_idempotent_response(
        request, f'tasks:{task_id}:reviews:POST', idempotency_key, status, response_body
    )


@api_view
@require_http_methods(['PATCH', 'DELETE'])
def review_detail(request, task_id, review_id):
    review = get_object_or_404(RoleReview, pk=review_id, task_id=task_id)

    if request.method == 'DELETE':
        review.delete()
        return JsonResponse({'message': 'Review deleted successfully'}, status=200)

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response

    updated_review, errors = update_review_from_body(review, body)
    if errors:
        return json_error('Validation failed', status=400, details={'fields': errors})

    return JsonResponse(serialize_review(updated_review))
