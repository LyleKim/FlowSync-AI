from django import forms
from .models import Task, SubTask

class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'creator', 'status', 'priority',
            'category', 'assignee_id', 'roles', 'has_unreflected_review',
            'last_review_added_at'
        ]

    def clean_title(self):
        title = self.cleaned_data.get('title')
        if title:
            title = title.strip()
        if not title:
            raise forms.ValidationError("제목은 공백일 수 없습니다.")
        return title

    def clean_description(self):
        desc = self.cleaned_data.get('description', '')
        return desc.strip() if desc else ''


class SubTaskForm(forms.ModelForm):
    class Meta:
        model = SubTask
        fields = ['id', 'task', 'title', 'completed']

    def clean_title(self):
        title = self.cleaned_data.get('title')
        if title:
            title = title.strip()
        if not title:
            raise forms.ValidationError("하위 작업 제목은 공백일 수 없습니다.")
        return title

