# START MAYBE? (v1)

A task manager that tracks not just deadlines, but how work actually progresses.

🌐 **Live Demo:** _add your v1 deploy link here if it's hosted separately_

---

## Features

- **Add tasks** with a name, deadline, expected time, and priority (High / Medium / Low)
- **Live countdown timers** on every task, updating every second, with escalating messages as the deadline closes in — from "You're chilling 😌" down to "PANIC MODE 💀"
- **Priority-based sorting** — tasks are ordered by priority first, then by urgency within each priority
- **Smart task suggestions** — a separate panel scores every open task by priority, urgency, and current status, and suggests what to tackle next
- **Progress timeline** — update a task's status (Started → Midway → Completed) and each update is logged with a timestamp and optional note, building a visible history per task
- **Notes & file attachments** — attach notes and a file (image preview supported) to any task
- **Submission links** — save a destination link per task; once set, a "Submit" button opens it directly
- **Dashboard stats** — live counts of completed, pending, and missed tasks
- **Browser notifications** — opt in, and get notified before a task's deadline hits
- **Local storage persistence** — everything is saved in the browser, no backend required

---

## Why I Built This

Most task managers only track tasks. START MAYBE tracks the gap between planning and reality by recording how tasks evolve over time — not just whether something got done, but the path it took to get there.

---

## Tech Stack

- HTML
- CSS
- JavaScript (vanilla)
- Browser `localStorage` for persistence
- Browser Notification API
- GitHub Pages

---

## Running It Locally

1. Clone the repo
2. Open the HTML file in any browser — no build step or dependencies required

Data is stored per-browser via `localStorage`, so it doesn't sync across devices.

## Status

This is the first working version of START MAYBE. A later version rebuilds the concept around mood-based task matching, dual (personal vs. actual) deadlines, and a more deliberate visual identity — see the current README for that iteration.
