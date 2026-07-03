from django.db import models

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', '생성'),
        ('update', '수정'),
        ('delete', '삭제'),
        ('complete', '완료'),
        ('review', '검토'),
    ]

    task_id = models.CharField(max_length=100, null=True, blank=True, verbose_name="관련 작업 ID")
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="활동 종류")
    actor_name = models.CharField(max_length=100, default="NULL", verbose_name="수행자")
    message = models.TextField(verbose_name="활동 세부 메세지")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="발생 일시")

    # Class Meta가 원래 모델의 세부 옵션을 설정하는 곳이다.
    # create_at을 기준으로 정렬하겠다. -는 내림차순!
    # 데이터베이스에서 모델과 관련된 데이터들을 가져올 수 있다.
    # 이때 데이터를 가져올 때 created_at을 가지고 정렬한 결과를 보여주겠다는 것
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_action_type_display()}] {self.message} ({self.created_at})"
