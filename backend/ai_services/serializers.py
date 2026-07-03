import json


def build_reviews_str(role_reviews):
    if not role_reviews:
        return ''

    lines = [
        f"- [{review.get('role', 'Unknown')}] {review.get('comment', '')} "
        f"(Approved: {review.get('isAccepted', False)})"
        for review in role_reviews
        if review.get('comment')
    ]
    return '\n'.join(lines)


def parse_checklist_request(body):
    title = (body.get('title') or '').strip()
    description = (body.get('description') or '').strip()
    role_reviews = body.get('roleReviews') or []

    if not title:
        return None, {'title': ['제목은 필수입니다.']}

    if not role_reviews:
        return None, {'roleReviews': ['검토 기록이 필요합니다.']}

    return {
        'title': title,
        'description': description,
        'reviews_str': build_reviews_str(role_reviews),
    }, None


def parse_checklist_response(raw_text):
    result_text = (raw_text or '').strip()

    if result_text.startswith('```'):
        lines = result_text.split('\n')
        if lines[0].startswith('```'):
            lines = lines[1:]
        if lines and lines[-1].startswith('```'):
            lines = lines[:-1]
        result_text = '\n'.join(lines).strip()

    parsed_result = json.loads(result_text)
    if not isinstance(parsed_result, dict) or 'checklist' not in parsed_result:
        raise ValueError('Invalid checklist response format')

    return parsed_result
