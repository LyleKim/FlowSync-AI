from functools import wraps

from django.views.decorators.csrf import csrf_exempt


def api_view(view_func):
    """
    JSON API 공통 데코레이터.

    CSRF 면제: 세션 쿠키 기반이 아닌 JSON API입니다.
    인증은 추후 로그인 기능 추가 시 별도로 적용합니다.
    """

    @csrf_exempt
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        return view_func(request, *args, **kwargs)

    return wrapper
