# START MAYBE?

A task manager that doesn't just track deadlines — it tracks how you actually feel about doing the work, and nudges you accordingly.

🌐 **Live Demo:** https://patelvrihi24-collab.github.io/Start-Maybe-/

Start Maybe? Again is like expressing the feeling in which we have done the task and than we get perfect structure that makes you urge to do it all over again that is what happened with me Start Maybe? which is older version has my first project my insights as fresher (which i still am) when craeting Start Maybe? Again i lost motivation than i would come back to same files after few days it is the urge that thrives the ideas. i ain't a expert but looking forward to learn more and more so that when i review Start Maybe? again and feel proud of my younger self i look forward to my older self modifying Start Maybe? for better, Thank You.

---

## What's New in This Version

The original START MAYBE tracked tasks, priority, and progress history. This version keeps that foundation but rebuilds the experience around one idea: **procrastination isn't a scheduling problem, it's a behavioral one.** So instead of just showing deadlines, the app now tries to work *with* how people actually operate — moods, self-imposed pressure, and a bit of tough love.

### Look & Feel
- Redesigned around a "late-night desk under a lamp" aesthetic — dark background, warm amber glow, handwritten-style headings — instead of a generic dashboard look.
- Task cards went back to a punchier dark-card style with a colored left border that shifts from calm green → amber → red as a deadline closes in, at a glance.
- Added a **night/day theme toggle**, remembered across sessions.

### New Behavioral Features
- **Dual deadlines** — every task has an *actual* (hard) deadline and *your own goal* deadline, so you can build in a buffer against yourself.
- **Mood tagging** — tag a task with the mood you'd want to be in to do it (Focused, Calm, Energetic, Anxious, Playful, Tired).
- **Mood-matched suggestions** — a widget asks what mood you're in right now and highlights which open tasks are the best fit.
- **Live countdown + urgency messages** on every card ("You're chilling 😌" → "Getting serious 😨" → "PANIC MODE 💀" → "You missed it 😭"), recalculated every second.
- **A note from future you** — a system-generated message that reacts to your actual task load: it'll roast you gently for overdue tasks, hype you up when the board's clear, or just tell you what's coming. You can also override it and write your own note to yourself.
- **Calendar view** — tap any date to see exactly how many deadlines land there, or a plain "no deadlines" message if it's clear.
- **Progress ring** — a completion percentage across all tasks, at a glance.
- **Deadline notifications** — pick how far ahead of your *goal* deadline you want a browser notification (10 min / 30 min / 1 hr / 3 hr / 1 day before).
- **One-tap submission** — once a task hits 100% progress, a "Submit" button appears that opens your saved submission link directly.

### Carried Over From the Original
- Priority-based sorting logic
- Progress tracking (now a slider instead of Started/Midway/Completed buttons, feeding the same "how work evolves over time" idea)
- Notes per task
- Local persistence — no backend, no login, works entirely in your browser

---

## Why I Built This

Most task managers only track *what* needs to get done and *when*. START MAYBE tracks the gap between planning and reality — not just by logging progress, but by acknowledging that deadlines alone don't get people to start. Mood, self-imposed pressure, and a little honest nudging do more of that work than a due date ever will.

---

## Tech Stack

- HTML
- CSS
- JavaScript (vanilla, no framework)
- localStorage for persistence
- GitHub Pages for hosting

---

## Running It Locally


1. Clone the repo
2. Open `index.html` in any browser

Data is stored per-browser via `localStorage`, so it won't sync across devices — that's the next thing on the roadmap.

## What's Next

- A real backend (auth + database) so tasks sync across devices and notifications can fire even when the tab isn't open
- File attachments for tasks (needs a backend — browsers can't persist real files on their own)
- Packaging as a mobile app via Capacitor
