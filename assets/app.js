(() => {
  "use strict";

  const STORAGE_KEY = "daymark-demo-tasks-v1";
  const isHostedDemo = window.location.hostname.endsWith("github.io");
  const elements = {
    list: document.querySelector("#task-list"),
    count: document.querySelector("#task-count"),
    total: document.querySelector("#stat-total"),
    progress: document.querySelector("#stat-progress"),
    completed: document.querySelector("#stat-completed"),
    search: document.querySelector("#search-input"),
    notice: document.querySelector("#notice"),
    dialog: document.querySelector("#task-dialog"),
    form: document.querySelector("#task-form"),
    title: document.querySelector("#title-input"),
    description: document.querySelector("#description-input"),
    priority: document.querySelector("#priority-input"),
    status: document.querySelector("#status-input")
  };

  let tasks = [];
  let currentFilter = "ALL";

  const labels = {
    TODO: "To do",
    IN_PROGRESS: "In progress",
    DONE: "Completed",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High"
  };

  function seedDemoTasks() {
    const today = new Date().toISOString();
    return [
      { id: "demo-1", title: "Welcome to your task board", description: "This is a live demo. Add, search, complete, and delete tasks; your demo tasks stay in this browser.", status: "IN_PROGRESS", priority: "HIGH", createdAt: today },
      { id: "demo-2", title: "Build something you are proud of", description: "The Java REST API and delivery pipeline are part of the project source on GitHub.", status: "TODO", priority: "MEDIUM", createdAt: today },
      { id: "demo-3", title: "One small step at a time", description: "Check off a task when it is complete.", status: "DONE", priority: "LOW", createdAt: today }
    ];
  }

  function readDemoTasks() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const starterTasks = seedDemoTasks();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(starterTasks));
        return starterTasks;
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Stored tasks were not an array.");
      return parsed;
    } catch (error) {
      showNotice(`Browser storage could not be read. Demo tasks were loaded without saved changes. ${error.message}`);
      return seedDemoTasks();
    }
  }

  function saveDemoTasks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      showNotice("Your browser could not save this change. Check its storage settings.");
      return false;
    }
  }

  async function request(path, options = {}) {
    if (isHostedDemo) return demoRequest(path, options);

    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Request failed (${response.status}).`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function demoRequest(path, options) {
    const method = options.method || "GET";
    if (method === "GET") return tasks;

    const id = path.split("/").pop();
    if (method === "POST") {
      const input = JSON.parse(options.body);
      const task = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      tasks.unshift(task);
      if (!saveDemoTasks()) throw new Error("Could not save your task.");
      return task;
    }
    if (method === "PUT") {
      const index = tasks.findIndex((task) => task.id === id);
      if (index < 0) throw new Error("Task not found.");
      tasks[index] = { ...tasks[index], ...JSON.parse(options.body) };
      if (!saveDemoTasks()) throw new Error("Could not save your change.");
      return tasks[index];
    }
    if (method === "DELETE") {
      tasks = tasks.filter((task) => task.id !== id);
      if (!saveDemoTasks()) throw new Error("Could not delete your task.");
      return null;
    }
    throw new Error(`Unsupported demo request: ${method}`);
  }

  function showNotice(message = "") {
    elements.notice.textContent = message;
  }

  function makeBadge(value) {
    const badge = document.createElement("span");
    badge.className = `badge badge-${value}`;
    badge.textContent = labels[value] || value;
    return badge;
  }

  function render() {
    elements.total.textContent = String(tasks.length);
    elements.progress.textContent = String(tasks.filter((task) => task.status === "IN_PROGRESS").length);
    elements.completed.textContent = String(tasks.filter((task) => task.status === "DONE").length);

    const query = elements.search.value.trim().toLocaleLowerCase();
    const visibleTasks = tasks.filter((task) => {
      const matchesFilter = currentFilter === "ALL" || task.status === currentFilter;
      const matchesSearch = `${task.title} ${task.description}`.toLocaleLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
    elements.count.textContent = String(visibleTasks.length);
    elements.list.replaceChildren();

    if (visibleTasks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = query || currentFilter !== "ALL" ? "⌕" : "✳";
      const title = document.createElement("strong");
      title.textContent = query || currentFilter !== "ALL" ? "No tasks found" : "A fresh start.";
      const description = document.createElement("p");
      description.textContent = query || currentFilter !== "ALL"
        ? "Try another search or choose a different filter."
        : "Add a task to turn your good intentions into your next small win.";
      empty.append(icon, title, description);
      elements.list.append(empty);
      return;
    }

    for (const task of visibleTasks) {
      const card = document.createElement("article");
      card.className = `task-card${task.status === "DONE" ? " is-done" : ""}`;

      const complete = document.createElement("button");
      complete.className = "complete-button";
      complete.type = "button";
      complete.setAttribute("aria-label", task.status === "DONE" ? `Mark ${task.title} as to do` : `Complete ${task.title}`);
      complete.textContent = task.status === "DONE" ? "✓" : "";
      complete.addEventListener("click", () => toggleTask(task));

      const main = document.createElement("div");
      main.className = "task-main";
      const title = document.createElement("h3");
      title.className = "task-title";
      title.textContent = task.title;
      main.append(title);

      if (task.description) {
        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description;
        main.append(description);
      }

      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.append(makeBadge(task.status), makeBadge(task.priority));
      main.append(meta);

      const actions = document.createElement("div");
      actions.className = "task-actions";
      const edit = document.createElement("button");
      edit.className = "action-button";
      edit.type = "button";
      edit.setAttribute("aria-label", `Edit ${task.title}`);
      edit.title = "Edit task";
      edit.textContent = "✎";
      edit.addEventListener("click", () => openEditForm(task));
      const remove = document.createElement("button");
      remove.className = "action-button";
      remove.type = "button";
      remove.setAttribute("aria-label", `Delete ${task.title}`);
      remove.title = "Delete task";
      remove.textContent = "×";
      remove.addEventListener("click", () => deleteTask(task));
      actions.append(edit, remove);
      card.append(complete, main, actions);
      elements.list.append(card);
    }
  }

  async function reload() {
    showNotice(isHostedDemo ? "Interactive preview · tasks are saved only in this browser." : "");
    try {
      tasks = await request("/api/tasks");
      render();
    } catch (error) {
      showNotice(`Could not load tasks. Is the Java app running? ${error.message}`);
    }
  }

  function resetForm() {
    elements.form.reset();
    elements.form.dataset.taskId = "";
    elements.status.value = "TODO";
    elements.priority.value = "MEDIUM";
    document.querySelector("#dialog-title").textContent = "Create a task";
    elements.form.querySelector('[type="submit"]').innerHTML = 'Add task <span aria-hidden="true">→</span>';
  }

  function openEditForm(task) {
    elements.form.dataset.taskId = task.id;
    elements.title.value = task.title;
    elements.description.value = task.description || "";
    elements.priority.value = task.priority;
    elements.status.value = task.status;
    document.querySelector("#dialog-title").textContent = "Edit your task";
    elements.form.querySelector('[type="submit"]').innerHTML = 'Save changes <span aria-hidden="true">→</span>';
    elements.dialog.showModal();
    elements.title.focus();
  }

  async function toggleTask(task) {
    const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
    try {
      await request(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PUT",
        body: JSON.stringify({ ...task, status: nextStatus })
      });
      await reload();
    } catch (error) {
      showNotice(`Could not update task. ${error.message}`);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await request(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
      showNotice(`Deleted "${task.title}".`);
      await reload();
    } catch (error) {
      showNotice(`Could not delete task. ${error.message}`);
    }
  }

  document.querySelector("#open-task-form").addEventListener("click", () => {
    resetForm();
    elements.dialog.showModal();
    elements.title.focus();
  });
  document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
  document.querySelector("#cancel-dialog").addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("close", resetForm);
  elements.search.addEventListener("input", render);
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach((filterButton) => {
        const selected = filterButton === button;
        filterButton.classList.toggle("selected", selected);
        filterButton.setAttribute("aria-pressed", String(selected));
      });
      render();
    });
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const task = {
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      priority: elements.priority.value,
      status: elements.status.value
    };
    const id = elements.form.dataset.taskId;
    try {
      await request(id ? `/api/tasks/${encodeURIComponent(id)}` : "/api/tasks", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(task)
      });
      elements.dialog.close();
      showNotice(id ? "Your changes have been saved." : "Task added. You have got this.");
      await reload();
    } catch (error) {
      showNotice(`Could not save task. ${error.message}`);
    }
  });

  const today = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
  document.querySelector("#today-label").textContent = today.format(new Date());
  if (isHostedDemo) tasks = readDemoTasks();
  reload();
})();
