(function(){
  const MOODS = [
    { key:'focused',  label:'Focused',   color:'#d9a441' },
    { key:'calm',     label:'Calm',      color:'#7fa98a' },
    { key:'energetic',label:'Energetic', color:'#dd6d7f' },
    { key:'anxious',  label:'Anxious',   color:'#9a8fd6' },
    { key:'playful',  label:'Playful',   color:'#5fb8c9' },
    { key:'tired',    label:'Tired',     color:'#8b87a0' },
  ];

  const DAY = 24*3600*1000;
  const HOUR = 3600*1000;

  let tasks = [];
  let editingId = null;
  let currentSlide = 0;
  let calViewDate = new Date();
  let calSelectedKey = null;
  let selectedMood = null;
  let currentModalMood = null;
  let customFutureNote = '';

  const $ = (id) => document.getElementById(id);
  const taskList = $('taskList');
  const dashboard = $('dashboard');
  const emptyState = $('emptyState');
  const toastEl = $('toast');

  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(()=> toastEl.classList.remove('show'), 1800);
  }

  function uid(){ return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---------- Storage ----------
  // Uses window.storage when available (Claude's own preview), and falls
  // back to localStorage everywhere else (opened as a file, hosted on any
  // server) so tasks survive a refresh no matter where this page runs.
  const hasCloudStorage = (typeof window !== 'undefined' && !!window.storage);

  async function storageGet(key){
    if(hasCloudStorage){
      try{
        const res = await window.storage.get(key, false);
        return res ? res.value : null;
      }catch(e){ /* fall through to localStorage below */ }
    }
    try{ return window.localStorage.getItem(key); }
    catch(e){ return null; }
  }
  async function storageSet(key, value){
    let ok = false;
    if(hasCloudStorage){
      try{ await window.storage.set(key, value, false); ok = true; }
      catch(e){ /* fall through to localStorage below */ }
    }
    try{ window.localStorage.setItem(key, value); ok = true; }
    catch(e){ /* localStorage unavailable (e.g. private mode, quota) */ }
    return ok;
  }

  async function loadTasks(){
    try{
      const val = await storageGet('tasks');
      tasks = val ? JSON.parse(val) : [];
    }catch(e){ tasks = []; }
  }
  async function saveTasks(){
    const ok = await storageSet('tasks', JSON.stringify(tasks));
    if(!ok) showToast("Couldn't save — try again");
  }
  async function loadFutureNote(){
    const val = await storageGet('futureNote');
    return val || '';
  }
  async function saveFutureNote(val){
    const ok = await storageSet('futureNote', val);
    if(!ok) showToast("Couldn't save note");
  }
  async function loadTheme(){
    const val = await storageGet('theme');
    return val || 'dark';
  }
  async function saveTheme(val){
    await storageSet('theme', val);
  }

  // ---------- Dashboard ----------
  function renderDashboard(){
    const now = new Date();
    const total = tasks.length;
    const overdue = tasks.filter(t => t.actualDeadline && new Date(t.actualDeadline) < now && t.status < 100).length;
    const done = tasks.filter(t => t.status >= 100).length;
    dashboard.innerHTML =
      '<div class="stat"><div class="num">'+total+'</div><div class="label">Total tasks</div></div>' +
      '<div class="stat stat-overdue"><div class="num">'+overdue+'</div><div class="label">Overdue</div></div>' +
      '<div class="stat stat-done"><div class="num">'+done+'</div><div class="label">Done</div></div>';
  }

  // ---------- Task cards ----------
  function formatDeadline(iso){
    if(!iso) return 'Not set';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined,{month:'short', day:'numeric'}) + ' · ' +
           d.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'});
  }

  function urgencyColor(diffMs){
    if(diffMs <= 0) return 'var(--urgent-hot)';
    if(diffMs < 6*HOUR) return 'var(--urgent-hot)';
    if(diffMs < DAY) return 'var(--urgent-warm)';
    if(diffMs < 2*DAY) return 'var(--urgent-mild)';
    return 'var(--urgent-calm)';
  }

  function urgencyMessage(diffMs, actualPassed){
    if(actualPassed) return "You missed it 😭";
    if(diffMs <= 0) return "Goal deadline's gone — the real one is still ticking 😬";
    if(diffMs > 2*DAY) return "You're chilling 😌";
    if(diffMs > DAY) return "Start soon 😐";
    if(diffMs > 6*HOUR) return "Getting serious 😨";
    return "PANIC MODE 💀";
  }

  function formatCountdown(diffMs){
    if(diffMs <= 0) return "TIME'S UP 💀";
    const days = Math.floor(diffMs / DAY);
    const hours = Math.floor((diffMs / HOUR) % 24);
    const minutes = Math.floor((diffMs / 60000) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);
    return days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's left';
  }

  function renderTasks(){
    emptyState.hidden = tasks.length > 0;
    taskList.innerHTML = '';
    tasks.forEach(t => {
      const mood = MOODS.find(m => m.key === t.mood);
      const referenceDeadline = t.goalDeadline || t.actualDeadline;
      const now = new Date();
      const diff = referenceDeadline ? (new Date(referenceDeadline) - now) : null;
      const actualPassed = t.actualDeadline ? (new Date(t.actualDeadline) < now) : false;
      const color = diff !== null ? urgencyColor(diff) : 'var(--urgent-calm)';
      const isDone = t.status >= 100;

      const card = document.createElement('div');
      card.className = 'task-card' + (selectedMood && t.mood === selectedMood ? ' mood-match' : '');
      card.style.borderLeftColor = isDone ? 'var(--sage)' : color;
      card.dataset.id = t.id;

      card.innerHTML =
        '<h3>'+escapeHtml(t.name || 'Untitled task')+'</h3>' +
        '<p class="meta-line">Actual: '+formatDeadline(t.actualDeadline)+'</p>' +
        '<p class="meta-line">Goal: '+formatDeadline(t.goalDeadline)+'</p>' +
        (mood ? '<div class="card-mood"><span class="mood-dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;background:'+mood.color+'"></span>'+mood.label+'</div>' : '') +
        '<p class="timer" data-role="timer">--</p>' +
        '<p class="msg" data-role="msg">--</p>' +
        '<div class="card-progress"><div style="width:'+(t.status||0)+'%"></div></div>' +
        '<div class="card-actions">' +
          (isDone && t.link ? '<button type="button" class="btn-submit" data-action="submit">Submit</button>' : '<span></span>') +
          '<button type="button" class="btn-del" data-action="delete">Delete</button>' +
        '</div>';

      card.addEventListener('click', (e) => {
        const action = e.target.dataset && e.target.dataset.action;
        if(action === 'delete'){
          e.stopPropagation();
          deleteTaskById(t.id);
          return;
        }
        if(action === 'submit'){
          e.stopPropagation();
          window.open(t.link, '_blank', 'noopener');
          return;
        }
        openModal(t.id);
      });

      taskList.appendChild(card);
    });
    tickCards();
  }

  async function deleteTaskById(id){
    tasks = tasks.filter(x => x.id !== id);
    await saveTasks();
    renderAll();
  }

  function tickCards(){
    const now = new Date();
    taskList.querySelectorAll('.task-card').forEach(card => {
      const t = tasks.find(x => x.id === card.dataset.id);
      if(!t) return;
      const timerEl = card.querySelector('[data-role="timer"]');
      const msgEl = card.querySelector('[data-role="msg"]');
      const referenceDeadline = t.goalDeadline || t.actualDeadline;
      const countdownTarget = t.actualDeadline || t.goalDeadline;
      const actualPassed = t.actualDeadline ? (new Date(t.actualDeadline) < now) : false;

      if(t.status >= 100){
        timerEl.textContent = 'Done ✅';
        timerEl.classList.remove('urgent');
        msgEl.textContent = "That's one off the board.";
        return;
      }
      if(countdownTarget){
        const cdDiff = new Date(countdownTarget) - now;
        timerEl.textContent = formatCountdown(cdDiff);
        timerEl.classList.toggle('urgent', cdDiff < 6*HOUR);
      }else{
        timerEl.textContent = 'No deadline set';
        timerEl.classList.remove('urgent');
      }
      if(referenceDeadline){
        const diff = new Date(referenceDeadline) - now;
        msgEl.textContent = urgencyMessage(diff, actualPassed);
      }else{
        msgEl.textContent = "No deadline, no drama — for now.";
      }
    });
  }

  // ---------- Modal ----------
  const modalOverlay = $('taskModal');
  const moodSelectEl = $('moodSelect');
  MOODS.forEach(m => {
    const opt = document.createElement('div');
    opt.className = 'mood-opt';
    opt.dataset.mood = m.key;
    opt.innerHTML = '<span class="mood-dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;background:'+m.color+'"></span>'+m.label;
    opt.addEventListener('click', () => {
      currentModalMood = currentModalMood === m.key ? null : m.key;
      renderModalMoodSelection();
    });
    moodSelectEl.appendChild(opt);
  });
  function renderModalMoodSelection(){
    moodSelectEl.querySelectorAll('.mood-opt').forEach(el => {
      el.classList.toggle('selected', el.dataset.mood === currentModalMood);
    });
  }

  $('taskStatus').addEventListener('input', (e) => {
    $('statusValue').textContent = e.target.value + '%';
  });

  function openModal(id){
    editingId = id || null;
    const t = id ? tasks.find(x => x.id === id) : null;
    $('modalTitle').textContent = t ? 'Task details' : 'New task';
    $('taskName').value = t ? t.name : '';
    $('actualTime').value = t ? (t.actualDeadline||'') : '';
    $('expectedTime').value = t ? (t.goalDeadline||'') : '';
    $('taskNotes').value = t ? (t.notes||'') : '';
    $('submissionLink').value = t ? (t.link||'') : '';
    $('notifyBefore').value = t && t.notifyBefore ? String(t.notifyBefore) : '';
    $('taskStatus').value = t ? (t.status||0) : 0;
    $('statusValue').textContent = (t ? (t.status||0) : 0) + '%';
    currentModalMood = t ? (t.mood || null) : null;
    renderModalMoodSelection();
    $('deleteTaskBtn').hidden = !t;
    modalOverlay.hidden = false;
    $('taskName').focus();
  }
  function closeModal(){ modalOverlay.hidden = true; editingId = null; }

  $('openTaskModal').addEventListener('click', () => openModal(null));
  $('cancelTaskBtn').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });

  $('saveTaskBtn').addEventListener('click', async () => {
    const name = $('taskName').value.trim();
    if(!name){ showToast('Give the task a name first'); $('taskName').focus(); return; }
    const notifyVal = $('notifyBefore').value;
    const data = {
      id: editingId || uid(),
      name,
      actualDeadline: $('actualTime').value || null,
      goalDeadline: $('expectedTime').value || null,
      notes: $('taskNotes').value.trim(),
      link: $('submissionLink').value.trim(),
      mood: currentModalMood,
      status: Number($('taskStatus').value),
      notifyBefore: notifyVal ? Number(notifyVal) : null,
      notified: false,
    };
    if(editingId){
      tasks = tasks.map(t => t.id === editingId ? data : t);
    }else{
      tasks.push(data);
    }
    await saveTasks();
    closeModal();
    renderAll();
    showToast('Saved');
  });

  $('deleteTaskBtn').addEventListener('click', async () => {
    if(!editingId) return;
    tasks = tasks.filter(t => t.id !== editingId);
    await saveTasks();
    closeModal();
    renderAll();
    showToast('Deleted');
  });

  // ---------- Slider ----------
  const slides = document.querySelectorAll('.slide');
  const dotsWrap = $('sliderDots');
  slides.forEach((s, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });
  function goToSlide(i){
    currentSlide = (i + slides.length) % slides.length;
    slides.forEach((s, idx) => s.classList.toggle('active', idx === currentSlide));
    dotsWrap.querySelectorAll('.dot').forEach((d, idx) => d.classList.toggle('active', idx === currentSlide));
    if(currentSlide === 1) renderCalendar();
  }
  $('prevSlide').addEventListener('click', () => goToSlide(currentSlide - 1));
  $('nextSlide').addEventListener('click', () => goToSlide(currentSlide + 1));

  // ---------- Future self note (system-generated, savage-lite) ----------
  const futureDisplay = $('futureDisplay');
  const futureInput = $('futureInput');
  const futureEditBtn = $('futureEditBtn');
  let editingNote = false;

  const OVERDUE_LINES = [
    (n) => "You've got " + n + " task" + (n===1?'':'s') + " past deadline. Future you called — it's not proud, but it's not shocked either.",
    (n) => n + " deadline" + (n===1?" has":"s have") + " already come and gone. At this point they're basically vintage.",
    (n) => "Still " + n + " overdue. Future you would like to formally withdraw all faith in past you.",
  ];
  const DUE_TODAY_LINES = [
    (n) => n + " thing" + (n===1?'':'s') + " due today. Today. Not tomorrow-today, actual today.",
    (n) => "Today's the day for " + n + " of these. No pressure. Okay, some pressure.",
  ];
  const DUE_SOON_LINES = [
    (n) => n + " task" + (n===1?'':'s') + " closing in within 48 hours. Future you is watching the clock so you don't have to.",
    (n) => "The next 2 days have " + n + " deadline" + (n===1?'':'s') + " lined up. Might be a good time to start one.",
  ];
  const CALM_LINES = [
    () => "Nothing urgent right now. Suspicious, but future you will take it.",
    () => "You're actually ahead. Don't let it go to your head.",
  ];
  const DONE_LINES = [
    () => "Everything's done. Future you is, frankly, a little emotional.",
    () => "Board's clear. Weird flex, but ok.",
  ];
  const EMPTY_LINES = [
    () => "Nothing on the board at all. Suspicious levels of nothing.",
    () => "Blank slate. Future you is either relieved or worried — hard to tell.",
  ];

  function pick(arr, seed){
    return arr[seed % arr.length];
  }

  function generateFutureSelfMessage(){
    const now = new Date();
    const pending = tasks.filter(t => t.status < 100);
    if(tasks.length === 0) return pick(EMPTY_LINES, tasks.length)();
    const overdue = pending.filter(t => t.actualDeadline && new Date(t.actualDeadline) < now);
    if(overdue.length > 0) return pick(OVERDUE_LINES, overdue.length)(overdue.length);
    const dueToday = pending.filter(t => {
      const d = t.goalDeadline || t.actualDeadline;
      if(!d) return false;
      const dt = new Date(d);
      return dt.getFullYear()===now.getFullYear() && dt.getMonth()===now.getMonth() && dt.getDate()===now.getDate();
    });
    if(dueToday.length > 0) return pick(DUE_TODAY_LINES, dueToday.length)(dueToday.length);
    const dueSoon = pending.filter(t => {
      const d = t.goalDeadline || t.actualDeadline;
      if(!d) return false;
      const diff = new Date(d) - now;
      return diff > 0 && diff <= 2*DAY;
    });
    if(dueSoon.length > 0) return pick(DUE_SOON_LINES, dueSoon.length)(dueSoon.length);
    if(pending.length === 0) return pick(DONE_LINES, tasks.length)();
    return pick(CALM_LINES, tasks.length)();
  }

  async function renderFutureSlide(){
    customFutureNote = await loadFutureNote();
    if(customFutureNote){
      futureDisplay.textContent = customFutureNote;
    }else{
      futureDisplay.textContent = generateFutureSelfMessage();
    }
    futureInput.value = customFutureNote;
  }
  futureEditBtn.addEventListener('click', async () => {
    if(!editingNote){
      futureDisplay.hidden = true;
      futureInput.hidden = false;
      futureInput.focus();
      futureEditBtn.textContent = 'Save note';
      editingNote = true;
    }else{
      customFutureNote = futureInput.value.trim();
      await saveFutureNote(customFutureNote);
      futureDisplay.hidden = false;
      futureInput.hidden = true;
      futureEditBtn.textContent = 'Edit note';
      editingNote = false;
      renderFutureSlide();
    }
  });
  $('futureResetBtn').addEventListener('click', async () => {
    customFutureNote = '';
    await saveFutureNote('');
    renderFutureSlide();
  });

  // ---------- Calendar ----------
  function dayKey(y,m,d){ return y+'-'+m+'-'+d; }

  function renderCalendar(){
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    $('calMonthLabel').textContent = calViewDate.toLocaleDateString(undefined, {month:'long', year:'numeric'});
    const grid = $('calGrid');
    grid.innerHTML = '';
    ['S','M','T','W','T','F','S'].forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const today = new Date();

    const tasksByDay = {};
    tasks.forEach(t => {
      if(!t.actualDeadline) return;
      const d = new Date(t.actualDeadline);
      const key = dayKey(d.getFullYear(), d.getMonth(), d.getDate());
      (tasksByDay[key] = tasksByDay[key] || []).push(t);
    });

    for(let i=0;i<firstDay;i++){
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      grid.appendChild(el);
    }
    for(let day=1; day<=daysInMonth; day++){
      const el = document.createElement('div');
      const key = dayKey(year, month, day);
      const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;
      const hasTask = !!tasksByDay[key];
      el.className = 'cal-day' + (isToday ? ' today' : '') + (hasTask ? ' has-task' : '') + (key === calSelectedKey ? ' selected' : '');
      el.textContent = day;
      el.dataset.key = key;
      el.addEventListener('click', () => {
        calSelectedKey = key;
        renderCalendar();
        const info = $('calDayInfo');
        const list = tasksByDay[key];
        if(!list || list.length === 0){
          info.innerHTML = '<span class="none">No deadlines on this date.</span>';
        }else{
          info.innerHTML = list.length + ' deadline' + (list.length===1?'':'s') + ' on this date:<br>' +
            list.map(t => '• ' + escapeHtml(t.name)).join('<br>');
        }
      });
      grid.appendChild(el);
    }
  }
  $('calPrev').addEventListener('click', () => {
    calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()-1, 1);
    renderCalendar();
  });
  $('calNext').addEventListener('click', () => {
    calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 1);
    renderCalendar();
  });

  // ---------- Progress + mood slide ----------
  const progressCircle = $('progressCircle');
  const CIRC = 2 * Math.PI * 26;
  function renderProgress(){
    const total = tasks.length;
    const done = tasks.filter(t => t.status >= 100).length;
    const pct = total ? Math.round((done/total)*100) : 0;
    $('progressNum').textContent = pct + '%';
    const offset = CIRC - (pct/100)*CIRC;
    progressCircle.setAttribute('stroke-dasharray', CIRC.toFixed(2));
    progressCircle.setAttribute('stroke-dashoffset', offset.toFixed(2));
  }
  const moodChipsEl = $('moodChips');
  MOODS.forEach(m => {
    const chip = document.createElement('div');
    chip.className = 'mood-chip';
    chip.dataset.mood = m.key;
    chip.innerHTML = '<span class="mood-dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;background:'+m.color+'"></span>'+m.label;
    chip.addEventListener('click', () => {
      selectedMood = selectedMood === m.key ? null : m.key;
      renderMoodChips();
      renderMoodSuggestion();
      renderTasks();
    });
    moodChipsEl.appendChild(chip);
  });
  function renderMoodChips(){
    moodChipsEl.querySelectorAll('.mood-chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.mood === selectedMood);
    });
  }
  function renderMoodSuggestion(){
    const sug = $('moodSuggestion');
    if(!selectedMood){ sug.textContent = 'Pick a mood to see which tasks fit it best.'; return; }
    const matches = tasks.filter(t => t.mood === selectedMood && t.status < 100);
    if(matches.length === 0){
      sug.innerHTML = 'No open tasks tagged for this mood right now.';
    }else{
      sug.innerHTML = 'Good fit right now: <strong>'+escapeHtml(matches[0].name)+'</strong>' + (matches.length>1 ? ' (+'+(matches.length-1)+' more)' : '');
    }
  }

  // ---------- Theme toggle ----------
  const themeBtn = $('themeToggle');
  themeBtn.addEventListener('click', async () => {
    const isLight = document.body.classList.toggle('theme-light');
    themeBtn.textContent = isLight ? '☀️' : '🌙';
    await saveTheme(isLight ? 'light' : 'dark');
  });

  // ---------- Notifications ----------
  $('enableNotif').addEventListener('click', () => {
    if(!('Notification' in window)){ showToast('Notifications not supported in this browser'); return; }
    Notification.requestPermission().then(perm => {
      showToast(perm === 'granted' ? 'Notifications enabled' : 'Notifications blocked');
    });
  });

  async function checkNotifications(){
    if(!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    let changed = false;
    tasks.forEach(t => {
      if(!t.notifyBefore || t.notified) return;
      const target = t.goalDeadline || t.actualDeadline;
      if(!target) return;
      const diff = new Date(target) - now;
      const windowMs = t.notifyBefore * 60000;
      if(diff > 0 && diff <= windowMs){
        new Notification('⏰ ' + t.name, { body: 'Your goal deadline is coming up.' });
        t.notified = true;
        changed = true;
      }
    });
    if(changed) await saveTasks();
  }

  // ---------- Reset ----------
  $('resetData').addEventListener('click', async () => {
    if(!confirm('Clear all tasks and your future-self note? This cannot be undone.')) return;
    tasks = [];
    await saveTasks();
    customFutureNote = '';
    await saveFutureNote('');
    renderAll();
    renderFutureSlide();
    showToast('All data cleared');
  });

  // ---------- Init ----------
  function renderAll(){
    renderDashboard();
    renderTasks();
    renderProgress();
    renderMoodChips();
    renderMoodSuggestion();
  }

  async function init(){
    const theme = await loadTheme();
    if(theme === 'light'){ document.body.classList.add('theme-light'); themeBtn.textContent = '☀️'; }
    await loadTasks();
    renderAll();
    await renderFutureSlide();
    renderCalendar();
    setInterval(() => { tickCards(); checkNotifications(); }, 1000);
  }
  init();
})();