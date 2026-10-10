package com.example.tasks;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class TaskService {
    private final TaskRepository tasks;

    TaskService(TaskRepository tasks) {
        this.tasks = tasks;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list() {
        return tasks.findAll().stream()
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse get(UUID id) {
        return TaskResponse.from(findTask(id));
    }

    public TaskResponse create(TaskRequest request) {
        Task task = new Task(
                request.title().trim(),
                normalizeDescription(request.description()),
                request.status() == null ? TaskStatus.TODO : request.status(),
                request.priority() == null ? TaskPriority.MEDIUM : request.priority());
        return TaskResponse.from(tasks.save(task));
    }

    public TaskResponse update(UUID id, TaskRequest request) {
        Task task = findTask(id);
        task.update(
                request.title().trim(),
                normalizeDescription(request.description()),
                request.status() == null ? task.getStatus() : request.status(),
                request.priority() == null ? task.getPriority() : request.priority());
        return TaskResponse.from(tasks.save(task));
    }

    public void delete(UUID id) {
        tasks.delete(findTask(id));
    }

    private Task findTask(UUID id) {
        return tasks.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Task not found: " + id));
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return "";
        }
        return description.trim();
    }
}
