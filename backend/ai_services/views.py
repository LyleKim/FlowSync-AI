from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from api.decorators import api_view
from api.http import json_error, parse_json_body
from api.idempotency import finalize_idempotent_response, replay_idempotent_response
from .serializers import parse_checklist_request, parse_checklist_response
from .services import run_checklist_generation


@api_view
@require_http_methods(['POST'])
def generate_checklist(request):
    replay_response, idempotency_key = replay_idempotent_response(request, 'ai:generate-checklist')
    if replay_response:
        return replay_response

    body, error_response = parse_json_body(request)
    if error_response:
        return error_response

    parsed, errors = parse_checklist_request(body)
    if errors:
        return json_error('Validation failed', status=400, details={'fields': errors})

    try:
        result_text = run_checklist_generation(
            parsed['title'],
            parsed['description'],
            parsed['reviews_str'],
        )
        payload = parse_checklist_response(result_text)
        return finalize_idempotent_response(
            request, 'ai:generate-checklist', idempotency_key, 200, payload
        )
    except ValueError as exc:
        return json_error(str(exc), status=502)
    except Exception as exc:
        return json_error(f'체크리스트 생성에 실패했습니다: {exc}', status=500)
