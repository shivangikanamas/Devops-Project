package com.example.tasks;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 500) String description,
        TaskStatus status,
        TaskPriority priority) {
}
