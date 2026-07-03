import hashlib
import json

from django.http import HttpResponseNotModified, JsonResponse
from django.utils.http import http_date, parse_http_date


def json_error(message, status=400, **details):
    payload = {'error': message}
    if details:
        payload.update(details)
    return JsonResponse(payload, status=status)


def parse_json_body(request):
    try:
        return json.loads(request.body or b'{}'), None
    except json.JSONDecodeError:
        return None, json_error('Invalid JSON', status=400)


def method_not_allowed():
    return json_error('Method not allowed', status=405)


def compute_etag(payload):
    """응답 본문 기준 ETag (쌍따옴표 포함)."""
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    digest = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    return f'"{digest}"'


def _is_not_modified_since(request, last_modified):
    header = request.META.get('HTTP_IF_MODIFIED_SINCE')
    if not header or not last_modified:
        return False

    parsed = parse_http_date(header)
    if parsed is None:
        return False

    return last_modified.timestamp() <= parsed


def conditional_json_response(request, payload, *, safe=True, last_modified=None):
    """
    ETag / Last-Modified 기반 조건부 GET.
    변경 없으면 304 Not Modified (본문 없음).
    """
    etag = compute_etag(payload)
    if_none_match = request.META.get('HTTP_IF_NONE_MATCH')

    if if_none_match and if_none_match == etag:
        response = HttpResponseNotModified()
        response['ETag'] = etag
        if last_modified:
            response['Last-Modified'] = http_date(last_modified.timestamp())
        return response

    if _is_not_modified_since(request, last_modified):
        response = HttpResponseNotModified()
        response['ETag'] = etag
        response['Last-Modified'] = http_date(last_modified.timestamp())
        return response

    response = JsonResponse(payload, safe=safe)
    response['ETag'] = etag
    if last_modified:
        response['Last-Modified'] = http_date(last_modified.timestamp())
    response['Cache-Control'] = 'private, must-revalidate'
    return response
