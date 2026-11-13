const KEY = "school_flow_events_v2";
const PEOPLE_KEY = "school_flow_people_v2";

const defaultPeople = [
  { id: "p1", name: "Brian Mwangi", className: "PP2" },
  { id: "p2", name: "Mary Wanjiku", className: "PP2" },
  { id: "p3", name: "John Kamau", className: "PP2" },
  { id: "p4", name: "Aisha Hassan", className: "Grade 1" },
  { id: "p5", name: "Daniel Otieno", className: "Grade 1" }
];

let people = JSON.parse(localStorage.getItem(PEOPLE_KEY) || "null") || defaultPeople;
let events = JSON.parse(localStorage.getItem(KEY) || "[]");
let pending = null;

function save() {
  localStorage.setItem(KEY, JSON.stringify(events));
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function now() {
  return new Date().toISOString();
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dateLabel() {
  return new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

const todayDateEl = document.getElementById("todayDate");
if (todayDateEl) {
  todayDateEl.textContent = dateLabel();
}

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

function parse(text) {
  const t = text.trim();
  if (!t) return null;

  const lower = t.toLowerCase();

  // Attendance
  const absent = lower.match(/(\d+)\s+(?:learners|students|pupils)?\s*(?:were\s+)?absent/);

  if (absent) {
    const count = Number(absent[1]);
    const cls = (t.match(/\b(PP\d+|Grade\s+\d+|G\d+)\b/i) || [])[1] || "a class";

    return {
      type: "attendance",
      label: "Attendance",
      title: `${count} learner${count === 1 ? "" : "s"} absent in ${cls}`,
      detail: "Attendance record updated",
      consequences: [
        ["Class record", `${count} absent in ${cls}`],
        ["Present count", "Updated automatically"],
        ["History", "Saved for today"]
      ]
    };
  }

  // Classwork completion
  if (lower.includes("completed") &&
     (lower.includes("assignment") ||
      lower.includes("work") ||
      lower.includes("task"))) {

    const cls = (t.match(/\b(PP\d+|Grade\s+\d+|G\d+)\b/i) || [])[1] || "class";

    return {
      type: "work",
      label: "Classwork",
      title: `${cls} completed today's work`,
      detail: "Classwork completion recorded",
      consequences: [
        ["Classwork", "Marked completed"],
        ["Outstanding", "No outstanding work for this event"],
        ["History", "Saved for today"]
      ]
    };
  }

  // Individual non-completion
  const didnt = t.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:didn't|did not|hasn't|has not)\s+(?:complete|finish)\b/i);

  if (didnt) {
    const name = didnt[1];

    return {
      type: "work",
      label: "Classwork",
      title: `${name} did not complete today's work`,
      detail: "Work outstanding recorded",
      consequences: [
        ["Learner", name],
        ["Outstanding", "1 piece of work"],
        ["History", "Saved for today"]
      ]
    };
  }

  // Incident
  if (lower.includes("sent to the office") ||
     lower.includes("sent to office") ||
     lower.includes("incident")) {

    const name = (t.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/) || [])[1] || "Learner";

    return {
      type: "incident",
      label: "Incident",
      title: `${name} — office referral`,
      detail: "Incident record created",
      consequences: [
        ["Learner record", `${name} linked`],
        ["Incident log", "1 new incident"],
        ["History", "Saved for today"]
      ]
    };
  }

  // General event fallback
  return {
    type: "note",
    label: "School event",
    title: t,
    detail: "A general school event",
    consequences: [
      ["Event log", "Saved"],
      ["History", "Available to review"],
      ["Next step", "No extra form required"]
    ]
  };
}

function renderPreview(p) {
  pending = p;

  const understoodEl = document.getElementById("understoodText");
  if (understoodEl) understoodEl.textContent = p.title;

  const consequenceEl = document.getElementById("consequence");
  if (consequenceEl) {
    consequenceEl.innerHTML = p.consequences.map(c => `
      <div class="mini">
        <div class="k">${esc(c[0])}</div>
        <div class="v">${esc(c[1])}</div>
      </div>
    `).join("");
  }

  const previewEl = document.getElementById("preview");
  if (previewEl) previewEl.classList.add("show");
}

function recordEvent() {
  if (!pending) return;

  const inputEl = document.getElementById("input");
  events.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: now(),
    type: pending.type,
    label: pending.label,
    title: pending.title,
    detail: pending.detail,
    source: (inputEl ? inputEl.value : "").trim()
  });

  save();

  if (inputEl) inputEl.value = "";
  const previewEl = document.getElementById("preview");
  if (previewEl) previewEl.classList.remove("show");

  pending = null;

  render();
  showToast("Recorded. The school record is now updated.");
}

function eventHTML(e) {
  return `
    <div class="event">
      <div class="event-main">
        <div class="event-title">
          <span class="tag">${esc(e.label)}</span>${esc(e.title)}
        </div>
        <div class="event-detail">${esc(e.detail)}</div>
      </div>
      <div class="event-time">${timeLabel(e.createdAt)}</div>
    </div>
  `;
}

function renderHistory() {
  const searchEl = document.getElementById("search");
  const q = (searchEl ? searchEl.value : "").toLowerCase();

  const list = events.filter(e =>
    (e.title + " " + e.detail + " " + e.source).toLowerCase().includes(q)
  );

  const historyListEl = document.getElementById("historyList");
  if (historyListEl) {
    historyListEl.innerHTML = list.length
      ? list.map(eventHTML).join("")
      : `<div class="empty">No matching records.</div>`;
  }
}

function render() {
  const todayKey = new Date().toDateString();

  const todayEvents = events.filter(e =>
    new Date(e.createdAt).toDateString() === todayKey
  );

  const attendance = todayEvents.filter(e => e.type === "attendance");
  const work = todayEvents.filter(e => e.type === "work");
  const incidents = todayEvents.filter(e => e.type === "incident");

  const learnersStat = document.getElementById("learnersStat");
  if (learnersStat) learnersStat.textContent = people.length;

  const absentCount = attendance.reduce((sum, e) => {
    const m = e.title.match(/^(\d+)/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);

  const presentStat = document.getElementById("presentStat");
  if (presentStat) {
    presentStat.textContent = Math.max(people.length - absentCount, 0);
  }

  const outstandingStat = document.getElementById("outstandingStat");
  if (outstandingStat) {
    outstandingStat.textContent = work.filter(e => /did not complete/i.test(e.title)).length;
  }

  const incidentStat = document.getElementById("incidentStat");
  if (incidentStat) {
    incidentStat.textContent = incidents.length;
  }

  const recent = todayEvents.slice(0, 5);
  const recentEl = document.getElementById("recent");
  if (recentEl) {
    recentEl.innerHTML = recent.length
      ? recent.map(eventHTML).join("")
      : `<div class="empty">Nothing recorded yet today.</div>`;
  }

  const peopleListEl = document.getElementById("peopleList");
  if (peopleListEl) {
    peopleListEl.innerHTML = people.map(p => `
      <div class="person">
        <span>${esc(p.name)}</span>
        <small>${esc(p.className)}</small>
      </div>
    `).join("");
  }

  renderHistory();
}

// Attach event listeners
const understandBtn = document.getElementById("understandBtn");
if (understandBtn) {
  understandBtn.onclick = () => {
    const inputEl = document.getElementById("input");
    const p = parse(inputEl ? inputEl.value : "");

    if (!p) {
      showToast("Tell me what happened first.");
      return;
    }

    renderPreview(p);
  };
}

const clearBtn = document.getElementById("clearBtn");
if (clearBtn) {
  clearBtn.onclick = () => {
    const inputEl = document.getElementById("input");
    if (inputEl) inputEl.value = "";
    const previewEl = document.getElementById("preview");
    if (previewEl) previewEl.classList.remove("show");
    pending = null;
  };
}

const confirmBtn = document.getElementById("confirmBtn");
if (confirmBtn) {
  confirmBtn.onclick = recordEvent;
}

document.querySelectorAll(".example").forEach(btn => {
  btn.onclick = () => {
    const inputEl = document.getElementById("input");
    if (inputEl) inputEl.value = btn.textContent;
    if (understandBtn) understandBtn.click();
  };
});

const searchEl = document.getElementById("search");
if (searchEl) {
  searchEl.addEventListener("input", renderHistory);
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.view);
    if (target) target.classList.add("active");

    if (btn.dataset.view === "history") renderHistory();
  };
});

// Run initial render
render();
