from django.db import models

class Task(models.Model):
    STATUS_CHOICES = [
        ('todo', 'To-Do'),
        ('inprogress', 'In Progress'),
        ('review', 'Review'),
        ('done', 'Done'),
    ]

    id = models.CharField(max_length=100, primary_key=True, verbose_name="작업 ID")
    title = models.CharField(max_length=255, verbose_name="작업 제목")
    description = models.TextField(blank=True, default="", verbose_name="작업 설명")
    creator = models.CharField(max_length=100, default="Unknown", verbose_name="작업 생성자")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo', verbose_name="진행 상태")
    priority = models.CharField(max_length=20, default='medium', verbose_name="우선순위")
    category = models.CharField(max_length=100, blank=True, default="", verbose_name="카테고리")
    assignee_id = models.CharField(max_length=100, blank=True, default="", verbose_name="담당자 ID")
    roles = models.TextField(blank=True, default="[]", verbose_name="관련 역할군들 (JSON)")
    checklist_generated_at = models.DateTimeField(
        null=True, blank=True, verbose_name="체크리스트 마지막 생성 일시"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정 일시")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# 작업 카드를 클릭하여 "작업 상세 정보" 창(모달)을 열면, 하단에 "작업 체크리스트"에서 사용
# AI로 작업 체크리스트 생성 시 이 model이 사용되어 작업 체크리스트가 생성된다.
# 체크리스트 생성 시, 작업 카드 내 프로그레스 바 계산에 사용된다.
class SubTask(models.Model):
    id = models.CharField(max_length=100, primary_key=True, verbose_name="하위 작업 ID")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='subtasks', verbose_name="상위 작업")
    title = models.CharField(max_length=255, verbose_name="하위 작업 제목")
    completed = models.BooleanField(default=False, verbose_name="완료 여부")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 일시")

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{'V' if self.completed else ' '}] {self.title}"

