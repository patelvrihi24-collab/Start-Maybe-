let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

let currentTaskIndex = null;

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function addTask() {
    let name = document.getElementById("taskName").value;
    let time = document.getElementById("time").value;
    let priority = document.getElementById("priority").value;
    let notifyTime = document.getElementById("notifyTime").value;
    if (!name || !time) {
        alert("Enter all fields!");
        return;
    }

    let task = {
    text: name,
    time: time,
    priority: priority,
    deadline: new Date(time).getTime(),  // 🔥 required for timer
    notes: "",
    file: null,
    notified:false,
    history: []// started|midway|completed
    };

    tasks.push(task);

    saveTasks();     // ⭐ NEW
    displayTasks();
     if (!timerInterval) {
        timerInterval = setInterval(updateTimers, 1000);
    }

    document.getElementById("taskName").value = "";
    document.getElementById("time").value = "";
    document.getElementById("priority").value = "Medium";
}

function displayTasks() {
    let list = document.getElementById("taskList");
    list.innerHTML = "";

    let now = new Date().getTime();

    // 🔥 Sort by urgency
   tasks.sort((a, b) => {
    let now = new Date().getTime();

    let urgencyA = a.deadline - now;
    let urgencyB = b.deadline - now;

    let priorityWeight = {
        "High": 0,
        "Medium": 1,
        "Low": 2
    };

    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
    }

    return urgencyA - urgencyB;
});

    tasks.forEach((task, index) => {
        let div = document.createElement("div");
        div.className = "task";

        div.innerHTML = `
            <h3>${task.text}</h3>
            <p>${task.priority} | ${task.time}</p>
            <p id="time-${index}">Loading...</p>
            <p id="msg-${index}"></p>
            <button onclick="openNotes(${index})">Notes</button>
            <button onclick="editTask(${index})">Edit</button>
            <button onclick="statusUpdate(${index})">Status</button>
            <button onclick="deleteTask(${index})">Delete</button>
         `;
 
        if (task.history && task.history.length > 0){
           let progress = getProgress(task);

        div.innerHTML += `
  <button class="progress-btn" onclick="toggleTimeline(${index})">
    <div class="progress-fill" style="width: ${progress}%"></div>
    <span>View Progress</span>
  </button>

  <div id="timeline-${index}" class="timeline" style="display:none;">
    ${renderTimeline(task)}
  </div>
`;
        }
        div.classList.add(task.priority.toLowerCase());

        let stats = getStats();

document.getElementById("dashboard").innerHTML = `
  <div class="stats">
    <div>✅ Completed: ${stats.completed}</div>
    <div>⏳ Pending: ${stats.pending}</div>
    <div>❌ Missed: ${stats.missed}</div>
  </div>
`;
        list.appendChild(div);
    });
}

function getProgress(task) {
  let status = getCurrentStatus(task);

  if (status === "started") return 25;
  if (status === "midway") return 60;
  if (status === "completed") return 100;

  return 0;
}

function updateTimers() {
    
    let now = new Date().getTime();

    tasks.forEach((task, index) => {
        let diff = task.deadline - now;

        let timeEl = document.getElementById(`time-${index}`);
        let msgEl = document.getElementById(`msg-${index}`);

        if (!timeEl) return;
      

        if (diff <= 0) {
            timeEl.innerText = "TIME'S UP 💀";
            msgEl.innerText = "You missed it 😭";
            return;
        }

        let days = Math.floor(diff / (1000 * 60 * 60 * 24));
        let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        let minutes = Math.floor((diff / (1000 * 60)) % 60);
        let seconds = Math.floor((diff / 1000) % 60);

        timeEl.innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Message logic
        if (diff > 48 * 60 * 60 * 1000) {
            msgEl.innerText = "You're chilling 😌";
        } 
        else if (diff > 24 * 60 * 60 * 1000) {
            msgEl.innerText = "Start soon 😐";
        } 
        else if (diff > 6 * 60 * 60 * 1000) {
            msgEl.innerText = "Getting serious 😨";
        } 
        else {
            msgEl.innerText = "PANIC MODE 💀";
        }

        if (diff < 6 * 60 * 60 * 1000) {
        timeEl.classList.add("urgent");
        } else {
        timeEl.classList.remove("urgent");
        }

        if (diff < task.notifyBefore && diff > 0 && !task.notified) {
        sendNotification(`⏰ ${task.text} is due soon!`);
        task.notified = true;
        saveTasks();
        }
    });
}

function suggestTask() {
    if (tasks.length === 0) {
        alert("No tasks!");
        return;
    }

    let now = new Date().getTime();

    let priorityWeight = {
        "High": 3,
        "Medium": 2,
        "Low": 1
    };

    let activeTasks = tasks.filter(task => {
    let status = getCurrentStatus(task);
    return status !== "completed";
});

    let statusWeight = {
    "not-started": 3,
    "started": 2,
    "midway": 1,
    "completed": 999
};

    // 🔥 Sort tasks based on smart score
    let sorted = [...activeTasks].sort((a, b) => {
        let scoreA = (a.deadline - now) / priorityWeight[a.priority]*statusWeight[getCurrentStatus(a)];
        let scoreB = (b.deadline - now) / priorityWeight[b.priority]*statusWeight[getCurrentStatus(b)];;
        return scoreA - scoreB;
    });

   if (activeTasks.length === 0) {
    container.innerHTML = "<p>All tasks completed 🎉</p>";
    return;
}

   

    let container = document.getElementById("suggestedList");
    container.innerHTML = "";

    sorted.forEach((task, index) => {
        let div = document.createElement("div");
        div.className = "task";

        div.innerHTML = `
            <strong>${index + 1}. ${task.text}</strong>
            <p>${task.priority}</p>
        `;

        container.appendChild(div);
    });
}

function openNotes(index) {
     currentTaskIndex = index;

    let modal = document.getElementById("notesModal");
    let input = document.getElementById("notesInput");
    let preview = document.getElementById("preview");

    input.value = tasks[index].notes || "";

    if (tasks[index].file) {
        showPreview(tasks[index].file, "image");
    } else {
        preview.innerHTML = "";
    }

    modal.style.display = "block";
}

function saveNotes() {
    let input = document.getElementById("notesInput").value;

    if (currentTaskIndex !== null) {
        tasks[currentTaskIndex].notes = input;
        saveTasks();
        displayTasks();
    }

    closeNotesModal();
}

function closeNotesModal() {
    document.getElementById("notesModal").style.display = "none";
}

window.onclick = function(event) {
    let notesModal = document.getElementById("notesModal");
    let statusModal = document.getElementById("statusModal");
    if (event.target === notesModal) {
        notesModal.style.display = "none";
    }

    if (event.target === statusModal) {
        statusModal.style.display = "none";
    }
}

document.getElementById("fileInput").addEventListener("change", function() {
    let file = this.files[0];

    if (!file) return;

    let reader = new FileReader();

    reader.onload = function(e) {
        let base64 = e.target.result;

        tasks[currentTaskIndex].file = base64;

        showPreview(base64, file.type);
    };

    reader.readAsDataURL(file);
});

function showPreview(data, type) {
    let preview = document.getElementById("preview");

    if (type.startsWith("image")) {
        preview.innerHTML = `<img src="${data}" width="100%">`;
    } else {
        preview.innerHTML = `<p>📎 File attached</p>`;
    }
}

function editTask(index) {
    let task = tasks[index];

    let newName = prompt("Edit task name:", task.text);
    if (newName === null) return;

    let newTime = prompt("Edit time (YYYY-MM-DDTHH:MM):", task.time);
    if (newTime === null) return;

    let newPriority = prompt("Edit priority (High/Medium/Low):", task.priority);
    if (newPriority === null) return;

    // Update values
    task.text = newName;
    task.time = newTime;
    task.priority = newPriority;
    task.deadline = new Date(newTime).getTime();

    saveTasks();
    displayTasks();
}


//let currentTaskIndex = null;

function statusUpdate(index) {
  currentTaskIndex = index;
  document.getElementById("statusModal").style.display = "block";
}

function closeStatusModal() {
  document.getElementById("statusModal").style.display = "none";
}

function saveStatus() {
  const newStatus = document.getElementById("statusSelect").value;
  const note = document.getElementById("statusNote").value;

  let task = tasks[currentTaskIndex];
  
  if (!task.history) {
    task.history = [];
  }

  task.history.push({
    status: newStatus,
    time: new Date().toISOString(),
    note: note
  });
  
  localStorage.setItem("tasks", JSON.stringify(tasks));
  saveTasks();
  closeStatusModal();
  displayTasks();
 
}

function getCurrentStatus(task) {
  if (!task.history || task.history.length === 0) {
    return "not-started";
  }
   if (status === "completed") card.style.borderLeft = "5px solid green";
if (status === "midway") card.style.borderLeft = "5px solid blue";
  return task.history[task.history.length - 1].status;

}

function toggleTimeline(index) {
  const el = document.getElementById(`timeline-${index}`);
  if (!el) return;

  el.style.display = el.style.display === "none" ? "block" : "none";
}

function renderTimeline(task) {
  if (!task.history) return "";

  return task.history.map((step, i) => `
    <div class="timeline-item ${i === task.history.length - 1 ? 'latest' : ''}">
      <strong>${step.status}</strong>
      <small>${new Date(step.time).toLocaleString()}</small>
      <p>${step.note || ""}</p>
    </div>
  `).join("");
}

function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks();
    displayTasks();

    if (tasks.length === 0) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function enableNotifications() {
    if (!("Notification" in window)) {
        alert("Browser does not support notifications");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notifications enabled ✅");
        } else {
            alert("Notifications blocked ❌");
        }
    });
}

function sendNotification(message) {
    if (Notification.permission === "granted") {
        new Notification(message);
    }
}

function getStats() {
  let completed = 0;
  let pending = 0;
  let missed = 0;

  let now = new Date().getTime();

  tasks.forEach(task => {
    let status = getCurrentStatus(task);

    if (status === "completed") {
      completed++;
    } else if (task.deadline < now) {
      missed++;
    } else {
      pending++;
    }
  });

  return { completed, pending, missed };
}

window.onload = function() {
    displayTasks();
};

setInterval(updateTimers, 1000);