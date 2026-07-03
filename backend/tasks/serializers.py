import json
import uuid

from django.utils import timezone

from reviews.models import RoleReview
from reviews.serializers import serialize_review, map_review_body_to_model
from reviews.forms import RoleReviewForm

from .models import Task, SubTask
from .forms import TaskForm, SubTaskForm


def _parse_roles(raw_roles):
    if isinstance(raw_roles, list):
        return raw_roles
    if not raw_roles:
        return []
    try:
        parsed = json.loads(raw_roles)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def serialize_task(task):
    """프론트엔드 Task 타입(camelCase)에 맞춘 직렬화."""
    reviews = RoleReview.objects.filter(task_id=task.id)

    return {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'priority': task.priority,
        'category': task.category,
        'assigneeId': task.creator or task.assignee_id,
        'subtasks': [
            {'id': subtask.id, 'title': subtask.title, 'completed': subtask.completed}
            for subtask in task.subtasks.all()
        ],
        'createdAt': task.created_at.isoformat() if task.created_at else None,
        'roles': _parse_roles(task.roles),
        'roleReviews': [serialize_review(review) for review in reviews],
        'hasUnreflectedReview': task.has_unreflected_review,
        'lastReviewAddedAt': task.last_review_added_at or None,
    }


def _normalize_roles_value(roles):
    if isinstance(roles, list):
        return json.dumps(roles, sort_keys=True)
    if isinstance(roles, str):
        try:
            return json.dumps(json.loads(roles or '[]'), sort_keys=True)
        except (TypeError, json.JSONDecodeError):
            return roles or '[]'
    return '[]'


def _normalized_subtasks(subtasks):
    return sorted(
        [
            {
                'id': item.get('id', ''),
                'title': item.get('title', ''),
                'completed': bool(item.get('completed', False)),
            }
            for item in (subtasks or [])
        ],
        key=lambda item: item['id'],
    )


def _existing_subtasks(task):
    return sorted(
        [
            {'id': subtask.id, 'title': subtask.title, 'completed': subtask.completed}
            for subtask in task.subtasks.all()
        ],
        key=lambda item: item['id'],
    )


def task_payload_matches(existing, body):
    """POST 재시도 시 동일 리소스인지 판별."""
    assignee = (body.get('assigneeId') or existing.creator or existing.assignee_id or '').strip()

    scalar_matches = all([
        existing.title == body.get('title', existing.title),
        existing.description == body.get('description', existing.description),
        existing.status == body.get('status', existing.status),
        existing.priority == body.get('priority', existing.priority),
        existing.category == body.get('category', existing.category),
        (existing.creator or '') == (assignee or existing.creator or ''),
        (existing.assignee_id or '') == (assignee or existing.assignee_id or ''),
        existing.has_unreflected_review == body.get(
            'hasUnreflectedReview', existing.has_unreflected_review
        ),
        (existing.last_review_added_at or '') == (
            body.get('lastReviewAddedAt', existing.last_review_added_at) or ''
        ),
    ])

    if not scalar_matches:
        return False

    if 'roles' in body:
        if _normalize_roles_value(existing.roles) != _normalize_roles_value(body.get('roles')):
            return False

    if 'subtasks' in body:
        if _existing_subtasks(existing) != _normalized_subtasks(body.get('subtasks')):
            return False

    return True


def _task_scalar_fields_changed(task, model_data):
    for field in (
        'title', 'description', 'creator', 'status', 'priority', 'category',
        'assignee_id', 'roles', 'has_unreflected_review', 'last_review_added_at',
    ):
        if getattr(task, field) != model_data.get(field):
            return True
    return False


def _subtasks_changed(task, subtasks_data):
    return _existing_subtasks(task) != _normalized_subtasks(subtasks_data)


def _role_reviews_changed(task, reviews_data):
    existing = sorted(
        [
            {
                'id': review.id,
                'role': review.role,
                'comment': review.comment,
                'reviewerId': review.reviewer_id or review.reviewer_name,
                'isAccepted': review.is_accepted,
                'acceptedAt': review.accepted_at or None,
                'urgency': review.urgency,
                'nextReviewerTag': review.next_reviewer_tag or None,
            }
            for review in RoleReview.objects.filter(task_id=task.id)
        ],
        key=lambda item: item['id'],
    )
    incoming = sorted(
        [
            {
                'id': review.get('id', ''),
                'role': review.get('role', ''),
                'comment': review.get('comment', ''),
                'reviewerId': review.get('reviewerId') or review.get('reviewer_id', ''),
                'isAccepted': review.get('isAccepted', review.get('is_accepted', False)),
                'acceptedAt': review.get('acceptedAt', review.get('accepted_at')) or None,
                'urgency': review.get('urgency', 'normal'),
                'nextReviewerTag': review.get('nextReviewerTag', review.get('next_reviewer_tag')) or None,
            }
            for review in (reviews_data or [])
        ],
        key=lambda item: item['id'],
    )
    return existing != incoming


def map_body_to_model_data(body, instance=None):
    """프론트엔드 camelCase 요청을 Django 모델 필드로 변환."""
    assignee = body.get('assigneeId')
    if assignee is None and instance:
        assignee = instance.creator or instance.assignee_id
    assignee = (assignee or '').strip()

    data = {
        'id': body.get('id') or (instance.id if instance else f"task-{uuid.uuid4().hex[:8]}"),
        'title': body.get('title', instance.title if instance else ''),
        'description': body.get('description', instance.description if instance else ''),
        'creator': assignee or (instance.creator if instance else 'Unknown'),
        'status': body.get('status', instance.status if instance else 'todo'),
        'priority': body.get('priority', instance.priority if instance else 'medium'),
        'category': body.get('category', instance.category if instance else ''),
        'assignee_id': assignee or (instance.assignee_id if instance else ''),
        'has_unreflected_review': body.get(
            'hasUnreflectedReview',
            instance.has_unreflected_review if instance else False,
        ),
        'last_review_added_at': body.get(
            'lastReviewAddedAt',
            instance.last_review_added_at if instance else '',
        ) or '',
    }

    if 'roles' in body:
        data['roles'] = json.dumps(body['roles'] if body['roles'] is not None else [])
    elif instance:
        data['roles'] = instance.roles
    else:
        data['roles'] = '[]'

    return data


def save_subtasks(task, subtasks_data, *, replace=False):
    incoming_ids = []

    for subtask_data in subtasks_data or []:
        subtask_id = subtask_data.get('id') or f"sub-{uuid.uuid4().hex[:8]}"
        incoming_ids.append(subtask_id)

        try:
            subtask_instance = SubTask.objects.get(id=subtask_id, task=task)
        except SubTask.DoesNotExist:
            subtask_instance = None

        form = SubTaskForm(
            {
                'id': subtask_id,
                'task': task.id,
                'title': subtask_data.get('title', ''),
                'completed': subtask_data.get('completed', False),
            },
            instance=subtask_instance,
        )
        if not form.is_valid():
            return form.errors
        form.save()

    if replace:
        task.subtasks.exclude(id__in=incoming_ids).delete()

    return None


def save_role_reviews(task, reviews_data, *, replace=False):
    if replace:
        incoming_ids = [review.get('id') for review in reviews_data if review.get('id')]
        RoleReview.objects.filter(task_id=task.id).exclude(id__in=incoming_ids).delete()

    for review_data in reviews_data or []:
        review_id = review_data.get('id') or f"rev-{uuid.uuid4().hex[:8]}"
        review_data = {**review_data, 'id': review_id, 'taskId': task.id}

        try:
            review_instance = RoleReview.objects.get(id=review_id)
        except RoleReview.DoesNotExist:
            review_instance = None

        form = RoleReviewForm(
            map_review_body_to_model(review_data, instance=review_instance),
            instance=review_instance,
        )
        if not form.is_valid():
            return form.errors
        form.save()

    return None


def create_task_from_body(body):
    """
    작업 생성.
    반환: (task, errors, outcome)
    outcome: 'created' | 'replayed' | None(실패)
    """
    task_id = (body.get('id') or '').strip()
    if task_id:
        existing = Task.objects.prefetch_related('subtasks').filter(pk=task_id).first()
        if existing:
            if task_payload_matches(existing, body):
                return existing, None, 'replayed'
            return None, {
                'id': ['동일 ID의 작업이 이미 다른 내용으로 존재합니다.']
            }, None

    model_data = map_body_to_model_data(body)
    form = TaskForm(model_data)
    if not form.is_valid():
        return None, form.errors, None

    task = form.save()

    subtask_errors = save_subtasks(task, body.get('subtasks', []))
    if subtask_errors:
        task.delete()
        return None, subtask_errors, None

    if 'roleReviews' in body:
        review_errors = save_role_reviews(task, body.get('roleReviews', []))
        if review_errors:
            task.delete()
            return None, review_errors, None

    return task, None, 'created'


def update_task_from_body(task, body):
    """
    작업 수정(PATCH/PUT).
    동일 요청 재전송 시 불필요한 DB 쓰기를 건너뛰어 멱등하게 동작.
    """
    model_data = map_body_to_model_data(body, instance=task)

    scalar_changed = _task_scalar_fields_changed(task, model_data)
    subtasks_changed = 'subtasks' in body and _subtasks_changed(task, body.get('subtasks'))
    reviews_changed = 'roleReviews' in body and _role_reviews_changed(task, body.get('roleReviews'))

    if not scalar_changed and not subtasks_changed and not reviews_changed:
        return task, None

    if scalar_changed:
        form = TaskForm(model_data, instance=task)
        if not form.is_valid():
            return None, form.errors
        task = form.save()

    if subtasks_changed:
        subtask_errors = save_subtasks(task, body.get('subtasks', []), replace=True)
        if subtask_errors:
            return None, subtask_errors
        Task.objects.filter(pk=task.pk).update(updated_at=timezone.now())
        task.refresh_from_db()

    if reviews_changed:
        review_errors = save_role_reviews(task, body.get('roleReviews', []), replace=True)
        if review_errors:
            return None, review_errors
        Task.objects.filter(pk=task.pk).update(updated_at=timezone.now())
        task.refresh_from_db()

    return task, None
