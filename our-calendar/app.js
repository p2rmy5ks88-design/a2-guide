import { firebaseConfig, people } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const NTFY = "https://ntfy.sh/";
const MAX_DELAY_MS = 3 * 24 * 3600 * 1000 - 5 * 60 * 1000; // ntfy.sh schedules up to 3 days ahead

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ymd(new Date());
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const fmtDay = (s, o = { weekday: "short", day: "numeric", month: "short" }) => parse(s).toLocaleDateString("en-GB", o);
const REMIND = [
  [-1, "No alert"], [0, "At start"], [10, "10 min before"], [30, "30 min before"],
  [60, "1 hour before"], [120, "2 hours before"], [1440, "1 day before"],
];
const remindLabel = (m) => (REMIND.find((r) => r[0] === m) || [0, ""])[1];
const ICON = {
  bell: '<svg class="bell" viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
};

/* ---------------- state ---------------- */
let F = {}, auth, db;
let user = null, me = "a";
let settings = { nameA: "Him", nameB: "Her", emailA: "", emailB: "", topic: "" };

let events = [], todos = [];
let view = ls.get("view") || "cal";
let cursor = new Date(); cursor.setDate(1);
let selected = todayStr();
let bootAt = Date.now();
let unsubs = [];

const nameOf = (w) => (w === "a" ? settings.nameA : w === "b" ? settings.nameB : "Both");
const initial = (w) => (nameOf(w) || "?").trim().charAt(0).toUpperCase();
const other = () => (me === "a" ? "b" : "a");

function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2000); }
function popup(who, title, text) {
  const el = $("#popup");
  el.innerHTML = `<span class="av ${who}">${esc(initial(who))}</span><div><b>${esc(title)}</b><span>${esc(text)}</span></div>`;
  el.hidden = false; clearTimeout(popup.t); popup.t = setTimeout(() => (el.hidden = true), 5000);
  el.onclick = () => (el.hidden = true);
  try { navigator.vibrate && navigator.vibrate(30); } catch {}
}

/* ---------------- push (ntfy) ---------------- */
const topicFor = (w) => (settings.topic ? `${settings.topic}-${w}` : "");
async function ntfy(topic, { title, message, tags = "calendar", at, seq, priority }) {
  if (!topic) return;
  const p = new URLSearchParams({ title, tags, click: location.origin + location.pathname });
  if (at) p.set("delay", String(Math.floor(at / 1000)));
  if (priority) p.set("priority", String(priority));
  const url = NTFY + topic + (seq ? "/" + encodeURIComponent(seq) : "") + "?" + p;
  try { await fetch(url, { method: "POST", body: message }); } catch {}
}
async function ntfyCancel(topic, seq) {
  if (!topic) return;
  try { await fetch(NTFY + topic + "/" + encodeURIComponent(seq), { method: "DELETE" }); } catch {}
}
function evWhen(e) { return `${fmtDay(e.date, { weekday: "short", day: "numeric", month: "short" })}${e.time ? ", " + e.time : ""}`; }
function notifyPartner(kind, text) {
  const t = topicFor(other());
  ntfy(t, { title: `${nameOf(me)} ${kind}`, message: text });
}
function startMs(e) {
  const d = parse(e.date);
  const [h, m] = (e.time || "08:00").split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
function reminderAt(e) {
  if (e.remind == null || e.remind < 0) return null;
  return startMs(e) - e.remind * 60000; // all-day plans count from 08:00
}
const audience = (w) => (w === "both" ? ["a", "b"] : [w]);
async function cancelReminder(e) { for (const w of ["a", "b"]) await ntfyCancel(topicFor(w), "r-" + e.id); }
async function scheduleReminder(e) {
  const at = reminderAt(e), now = Date.now();
  if (!at || at < now + 15000 || at > now + MAX_DELAY_MS || !settings.topic) return false;
  const msg = `${e.title}\n${evWhen(e)}${e.place ? " · " + e.place : ""}`;
  const title = e.remind === 0 || !e.time ? "Starting now" : `In ${remindLabel(e.remind).replace(" before", "")}`;
  for (const w of audience(e.who)) await ntfy(topicFor(w), { title, message: msg, tags: "alarm_clock", at, seq: "r-" + e.id, priority: 4 });
  return at;
}
// Reminders can only be queued 3 days ahead, so whichever phone opens the app queues the ones that come into range.
let sweeping = false;
async function sweepReminders() {
  if (sweeping || !settings.topic) return; sweeping = true;
  try {
    const now = Date.now();
    for (const e of events) {
      const at = reminderAt(e);
      if (!at || at < now + 15000 || at > now + MAX_DELAY_MS) continue;
      const key = `${at}|${e.who}`;
      if (e.remindKey === key) continue;
      const ok = await scheduleReminder(e);
      if (ok) await F.updateDoc(F.doc(db, "events", e.id), { remindKey: key }).catch(() => {});
    }
  } finally { sweeping = false; }
}

/* ---------------- iPhone Calendar (.ics with alarm) ---------------- */
function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
function icsFor(e) {
  const d = e.date.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  let start, end;
  if (e.time) {
    const s = new Date(startMs(e)), en = new Date(startMs(e) + (e.duration || 60) * 60000);
    const f = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    start = `DTSTART:${f(s)}`; end = `DTEND:${f(en)}`;
  } else {
    const n = parse(e.date); n.setDate(n.getDate() + 1);
    start = `DTSTART;VALUE=DATE:${d}`; end = `DTEND;VALUE=DATE:${ymd(n).replace(/-/g, "")}`;
  }
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Our Calendar//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${e.id}@our-calendar`, `DTSTAMP:${stamp}`, start, end, `SUMMARY:${icsEscape(e.title)}`];
  if (e.place) lines.push(`LOCATION:${icsEscape(e.place)}`);
  if (e.note) lines.push(`DESCRIPTION:${icsEscape(e.note)}`);
  const mins = e.remind >= 0 ? e.remind : 30;
  const trigger = e.time ? `-PT${mins}M` : "PT8H"; // all-day: 08:00 that morning
  lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(e.title)}`, `TRIGGER:${trigger}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
function addToIphoneCalendar(e) {
  const blob = new Blob([icsFor(e)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (e.title || "event").replace(/[^\w\- ]+/g, "").slice(0, 40) + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/* ---------------- render ---------------- */
function renderChrome() {
  $("#avatars").innerHTML = `<span class="av a" title="${esc(settings.nameA)}">${esc(initial("a"))}</span><span class="av b" title="${esc(settings.nameB)}">${esc(initial("b"))}</span>`;
  $$(".nameA").forEach((n) => (n.textContent = settings.nameA));
  $$(".nameB").forEach((n) => (n.textContent = settings.nameB));
}
const evSort = (a, b) => (a.date + (a.time || "00:00")).localeCompare(b.date + (b.time || "00:00"));
function evCard(e) {
  const bits = [esc(nameOf(e.who))];
  if (e.place) bits.push(esc(e.place));
  const bell = e.remind >= 0 ? ICON.bell : "";
  return `<button class="ev" data-ev="${esc(e.id)}"><span class="bar ${esc(e.who)}"></span>
    <span class="body"><div class="title">${esc(e.title)}</div><div class="sub">${bits.join(" · ")} ${bell}</div></span>
    <span class="time">${e.time ? esc(e.time) : "All day"}</span></button>`;
}
function renderCal() {
  $("#monthTitle").textContent = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  $("#dow").innerHTML = DOW.map((d) => `<div>${d}</div>`).join("");
  const offset = (cursor.getDay() + 6) % 7;
  const start = new Date(cursor); start.setDate(1 - offset);
  const byDay = {};
  events.forEach((e) => (byDay[e.date] = byDay[e.date] || []).push(e));
  const t = todayStr();
  let html = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (i === 35 && d.getMonth() !== cursor.getMonth()) break;
    const s = ymd(d);
    const cls = ["day"];
    if (d.getMonth() !== cursor.getMonth()) cls.push("out");
    if (s === t) cls.push("today");
    if (s === selected) cls.push("sel");
    const list = (byDay[s] || []).sort(evSort);
    const whos = [...new Set(list.map((e) => e.who))];
    const label = list[0] ? `<span class="elabel ${esc(list[0].who)}">${esc(list[0].title)}</span>` : "";
    html += `<button class="${cls.join(" ")}" data-day="${s}" aria-label="${d.getDate()} ${MONTHS[d.getMonth()]}${list.length ? `, ${list.length} plan${list.length > 1 ? "s" : ""}` : ""}">
      <span class="n">${d.getDate()}</span><span class="dots">${whos.map((w) => `<i class="dot ${w}"></i>`).join("")}</span>${label}</button>`;
  }
  $("#grid").innerHTML = html;
  $("#selLabel").textContent = (selected === t ? "Today, " : "") + fmtDay(selected, { weekday: selected === t ? undefined : "long", day: "numeric", month: "long" });
  const list = events.filter((e) => e.date === selected).sort(evSort);
  $("#dayList").innerHTML = list.length ? list.map(evCard).join("") : `<div class="empty">Nothing planned. Tap + to add an appointment for this day.</div>`;
}
function renderAgenda() {
  const t = todayStr();
  const up = events.filter((e) => e.date >= t).sort(evSort).slice(0, 80);
  if (!up.length) { $("#agenda").innerHTML = `<div class="empty">No upcoming plans yet. Tap + to add your first one.</div>`; return; }
  const groups = {};
  up.forEach((e) => (groups[e.date] = groups[e.date] || []).push(e));
  $("#agenda").innerHTML = Object.keys(groups).map((day) => {
    const diff = Math.round((parse(day) - parse(t)) / 864e5);
    const rel = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : fmtDay(day, { weekday: "long" });
    return `<div class="daygroup"><h3>${rel}<small>${fmtDay(day, { day: "numeric", month: "long" })}</small></h3><div class="list">${groups[day].map(evCard).join("")}</div></div>`;
  }).join("");
}
function todoRow(x) {
  const due = x.due ? `<small>Due ${esc(fmtDay(x.due))}</small>` : "";
  return `<div class="todo ${x.done ? "done" : ""}"><button class="check" data-toggle="${esc(x.id)}" aria-label="${x.done ? "Mark not done" : "Mark done"}">${x.done ? ICON.check : ""}</button>
    <button class="txt" data-todo="${esc(x.id)}">${esc(x.text)}${due}</button><span class="chip ${esc(x.who)}">${esc(nameOf(x.who))}</span></div>`;
}
function renderTodos() {
  const open = todos.filter((x) => !x.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || (a.createdAt || 0) - (b.createdAt || 0));
  const done = todos.filter((x) => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 30);
  $("#todos").innerHTML = open.length ? open.map(todoRow).join("") : `<div class="empty">All clear. Add groceries, errands or chores above.</div>`;
  $("#doneLabel").hidden = !done.length;
  $("#todosDone").innerHTML = done.map(todoRow).join("");
}
function render() {
  renderChrome();
  ["cal", "agenda", "todo"].forEach((v) => ($("#v-" + v).hidden = v !== view));
  $$(".tabbar button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === view)));
  if (view === "cal") renderCal(); else if (view === "agenda") renderAgenda(); else renderTodos();
}

/* ---------------- sheets ---------------- */
function openSheet(html, bind) { $("#sheetIn").innerHTML = html; $("#scrim").hidden = false; $("#sheet").hidden = false; $("#sheet").scrollTop = 0; bind && bind(); }
function closeSheet() { $("#scrim").hidden = true; $("#sheet").hidden = true; $("#sheetIn").innerHTML = ""; }
$("#scrim").onclick = closeSheet;
function whoSeg(cur) {
  return `<div class="seg" id="whoSeg">${["a", "b", "both"].map((w) => `<button type="button" data-who="${w}" aria-pressed="${w === cur}"><i class="dot ${w}"></i>${esc(nameOf(w))}</button>`).join("")}</div>`;
}
function bindSeg() { $$("#whoSeg button").forEach((b) => (b.onclick = () => $$("#whoSeg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))))); }
const segVal = () => document.querySelector('#whoSeg [aria-pressed="true"]').dataset.who;
async function safe(fn, ok) {
  try { await fn(); ok && toast(ok); }
  catch (e) { console.error(e); toast(e?.code === "permission-denied" ? "This account isn't allowed to edit" : "Couldn't save. Check your connection."); }
}

function eventSheet(ev) {
  const e = ev || { title: "", date: selected, time: "", who: me, place: "", note: "", remind: 30 };
  let confirmDel = false;
  openSheet(`<h2>${ev ? "Edit plan" : "New plan"}</h2>
    <label for="f-title">What<input class="field" id="f-title" value="${esc(e.title)}" placeholder="Dinner, dentist, school pickup…" autocomplete="off"></label>
    <div class="row"><label for="f-date">Date<input class="field" type="date" id="f-date" value="${esc(e.date)}"></label>
      <label for="f-time">Time<input class="field" type="time" id="f-time" value="${esc(e.time)}"></label></div>
    <label>Who's it for${whoSeg(e.who)}</label>
    <label for="f-remind">Alert on iPhone<select class="field" id="f-remind">${REMIND.map(([m, l]) => `<option value="${m}" ${m === (e.remind ?? -1) ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label for="f-place">Where<input class="field" id="f-place" value="${esc(e.place)}" placeholder="Optional" autocomplete="off"></label>
    <label for="f-note">Notes<textarea class="field" id="f-note" rows="2" placeholder="Optional">${esc(e.note)}</textarea></label>
    ${ev ? `<button class="tool" id="f-ics" type="button">${ICON.cal}Add to iPhone Calendar with alarm</button>` : ""}
    <div class="actions">${ev ? `<button class="ghost danger" id="f-del">Delete</button>` : `<button class="ghost" id="f-cancel">Cancel</button>`}<button class="primary" id="f-save">${ev ? "Save" : "Add plan"}</button></div>`, () => {
    bindSeg();
    if (!ev) setTimeout(() => $("#f-title").focus(), 60);
    $("#f-cancel") && ($("#f-cancel").onclick = closeSheet);
    $("#f-ics") && ($("#f-ics").onclick = () => addToIphoneCalendar(ev));
    $("#f-save").onclick = async () => {
      const title = $("#f-title").value.trim(), date = $("#f-date").value;
      if (!title) { $("#f-title").focus(); toast("Give it a name first"); return; }
      if (!date) { toast("Pick a date"); return; }
      const data = { title, date, time: $("#f-time").value || "", who: segVal(), remind: Number($("#f-remind").value),
        place: $("#f-place").value.trim(), note: $("#f-note").value.trim(), by: me, updatedAt: Date.now() };
      closeSheet();
      selected = date; const d = parse(date); cursor = new Date(d.getFullYear(), d.getMonth(), 1); render();
      await safe(async () => {
        let id;
        if (ev) { id = ev.id; await F.setDoc(F.doc(db, "events", id), { ...data, createdAt: ev.createdAt || Date.now(), remindKey: "" }); }
        else { id = (await F.addDoc(F.collection(db, "events"), { ...data, createdAt: Date.now(), remindKey: "" })).id; }
        const full = { ...data, id };
        notifyPartner(ev ? "changed a plan" : "added a plan", `${title}\n${evWhen(full)}${full.place ? " · " + full.place : ""}`);
        if (ev) await cancelReminder(ev);
        const at = await scheduleReminder(full);
        if (at) await F.updateDoc(F.doc(db, "events", id), { remindKey: `${at}|${full.who}` });
      }, ev ? "Saved" : "Added — " + nameOf(other()) + " gets a notification");
    };
    if (ev) $("#f-del").onclick = async () => {
      if (!confirmDel) { confirmDel = true; $("#f-del").textContent = "Tap again to delete"; return; }
      closeSheet();
      await safe(async () => { await F.deleteDoc(F.doc(db, "events", ev.id)); await cancelReminder(ev); notifyPartner("removed a plan", `${ev.title}\n${evWhen(ev)}`); }, "Deleted");
    };
  });
}
function todoSheet(x) {
  let confirmDel = false;
  openSheet(`<h2>Edit to-do</h2>
    <label for="t-text">Task<input class="field" id="t-text" value="${esc(x.text)}" autocomplete="off"></label>
    <label>For${whoSeg(x.who)}</label>
    <label for="t-due">Due (optional)<input class="field" type="date" id="t-due" value="${esc(x.due || "")}"></label>
    <div class="actions"><button class="ghost danger" id="t-del">Delete</button><button class="primary" id="t-save">Save</button></div>`, () => {
    bindSeg();
    $("#t-save").onclick = async () => {
      const text = $("#t-text").value.trim(); if (!text) return;
      const who = segVal(); closeSheet();
      await safe(async () => {
        await F.updateDoc(F.doc(db, "todos", x.id), { text, who, due: $("#t-due").value || "" });
        if (who !== x.who && who !== me) notifyPartner("gave you a to-do", text);
      }, "Saved");
    };
    $("#t-del").onclick = async () => {
      if (!confirmDel) { confirmDel = true; $("#t-del").textContent = "Tap again"; return; }
      closeSheet(); await safe(() => F.deleteDoc(F.doc(db, "todos", x.id)), "Deleted");
    };
  });
}
function settingsSheet() {
  const topicMine = topicFor(me);
  openSheet(`<h2>Settings</h2>
    <div class="settingsgroup">
      <label>You are signed in as<input class="field" value="${esc(user?.email || "")}" readonly></label>
      <div class="row"><label for="n-a">Coral name<input class="field" id="n-a" value="${esc(settings.nameA)}" maxlength="20"></label>
        <label for="n-b">Green name<input class="field" id="n-b" value="${esc(settings.nameB)}" maxlength="20"></label></div>
      <p class="note">On this phone you are <b>${esc(nameOf(me))}</b>.</p>
    </div>
    <div class="settingsgroup">
      <label>Push notifications</label>
      <p class="note">Install the free <b>ntfy</b> app from the App Store, tap +, and subscribe to this topic (server ntfy.sh). Keep it private: anyone with the name can read it.</p>
      <div class="copyrow"><input class="field" id="topicBox" value="${esc(topicMine)}" readonly aria-label="Your notification topic"><button class="ghost" id="copyTopic" type="button">Copy</button></div>
      <button class="tool" id="testPush" type="button">${ICON.bell}Send me a test notification</button>
    </div>
    <div class="actions"><button class="ghost" id="signOut">Sign out</button><button class="primary" id="n-save">Save</button></div>`, () => {
    $("#copyTopic").onclick = async () => {
      try { await navigator.clipboard.writeText(topicMine); toast("Copied"); }
      catch { const b = $("#topicBox"); b.focus(); b.select(); toast("Select and copy the topic"); }
    };
    $("#testPush").onclick = () => { ntfy(topicMine, { title: "Our Calendar", message: "Notifications are working 🎉", tags: "tada" }); toast("Sent — check your phone"); };
    $("#signOut").onclick = async () => { closeSheet(); await F.signOut(auth); };
    $("#n-save").onclick = async () => {
      const nameA = $("#n-a").value.trim() || "Him", nameB = $("#n-b").value.trim() || "Her";
      closeSheet();
      if (nameA !== settings.nameA || nameB !== settings.nameB) await safe(() => F.updateDoc(F.doc(db, "meta", "settings"), { nameA, nameB }), "Saved for both of you");
    };
  });
}

/* ---------------- wiring ---------------- */
$(".tabbar").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; view = b.dataset.v; ls.set("view", view); render(); window.scrollTo(0, 0); };
$("#prevM").onclick = () => { cursor.setMonth(cursor.getMonth() - 1); renderCal(); };
$("#nextM").onclick = () => { cursor.setMonth(cursor.getMonth() + 1); renderCal(); };
$("#todayBtn").onclick = () => { cursor = new Date(); cursor.setDate(1); selected = todayStr(); renderCal(); };
$("#menuBtn").onclick = settingsSheet;
$("#fab").onclick = () => (view === "todo" ? $("#quickTodoInput").focus() : eventSheet(null));
document.addEventListener("click", (e) => {
  const day = e.target.closest("[data-day]");
  if (day) { selected = day.dataset.day; const d = parse(selected); if (d.getMonth() !== cursor.getMonth()) cursor = new Date(d.getFullYear(), d.getMonth(), 1); renderCal(); return; }
  const ev = e.target.closest("[data-ev]");
  if (ev) { const x = events.find((y) => y.id === ev.dataset.ev); x && eventSheet(x); return; }
  const tg = e.target.closest("[data-toggle]");
  if (tg) { const x = todos.find((y) => y.id === tg.dataset.toggle); x && safe(() => F.updateDoc(F.doc(db, "todos", x.id), { done: !x.done, doneAt: x.done ? 0 : Date.now() })); return; }
  const td = e.target.closest("[data-todo]");
  if (td) { const x = todos.find((y) => y.id === td.dataset.todo); x && todoSheet(x); }
});
$("#quickTodo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const inp = $("#quickTodoInput"), text = inp.value.trim(); if (!text) return;
  inp.value = "";
  await safe(async () => { await F.addDoc(F.collection(db, "todos"), { text, who: me, done: false, due: "", by: me, createdAt: Date.now() }); notifyPartner("added to the list", text); });
});

/* ---------------- data ---------------- */
function randomTopic() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return "ourcal-" + Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 18);
}
const PEOPLE = people || {};
const preset = (slot) => Object.values(PEOPLE).find((p) => p.slot === slot);
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
let mySlot = null; // from config.js fingerprint, if listed
async function claimSeat() {
  const ref = F.doc(db, "meta", "settings");
  const email = (user.email || "").toLowerCase();
  try { mySlot = PEOPLE[await sha256(email)]?.slot || null; } catch { mySlot = null; }
  await F.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const s = snap.exists() ? snap.data() : {};
    const next = {
      nameA: s.nameA || preset("a")?.name || "Him", nameB: s.nameB || preset("b")?.name || "Her",
      emailA: s.emailA || "", emailB: s.emailB || "", topic: s.topic || randomTopic(),
    };
    if (mySlot) { next["email" + mySlot.toUpperCase()] = email; }
    else if (next.emailA !== email && next.emailB !== email) {
      if (!next.emailA) next.emailA = email; else if (!next.emailB) next.emailB = email;
    }
    tx.set(ref, next, { merge: true });
  });
}
function startData() {
  unsubs.forEach((u) => u()); unsubs = [];
  bootAt = Date.now();
  let firstEv = true, firstTodo = true;
  unsubs.push(F.onSnapshot(F.doc(db, "meta", "settings"), (s) => {
    if (s.exists()) settings = { ...settings, ...s.data() };
    const email = (user.email || "").toLowerCase();
    me = mySlot || (settings.emailB === email ? "b" : "a");
    render(); sweepReminders();
  }));
  unsubs.push(F.onSnapshot(F.collection(db, "events"), { includeMetadataChanges: false }, (snap) => {
    if (!firstEv) snap.docChanges().forEach((c) => {
      const d = c.doc.data();
      if (c.type === "added" && d.by && d.by !== me && !c.doc.metadata.hasPendingWrites && (d.createdAt || 0) > bootAt - 60000)
        popup(d.by, `${nameOf(d.by)} added a plan`, `${d.title} · ${evWhen(d)}`);
    });
    firstEv = false;
    events = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((e) => e.date);
    $("#liveTxt").textContent = snap.metadata.fromCache ? "Offline — showing saved" : "Live";
    $("#liveTxt").classList.toggle("on", !snap.metadata.fromCache);
    render(); sweepReminders();
  }, (err) => { console.error(err); $("#liveTxt").textContent = err.code === "permission-denied" ? "No access" : "Reconnecting…"; }));
  unsubs.push(F.onSnapshot(F.collection(db, "todos"), (snap) => {
    if (!firstTodo) snap.docChanges().forEach((c) => {
      const d = c.doc.data();
      if (c.type === "added" && d.by && d.by !== me && !c.doc.metadata.hasPendingWrites && (d.createdAt || 0) > bootAt - 60000)
        popup(d.by, `${nameOf(d.by)} added to the list`, d.text);
    });
    firstTodo = false;
    todos = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.text);
    render();
  }));
}

function show(id) { ["setup", "login", "app"].forEach((x) => ($("#" + x).hidden = x !== id)); }

function demo() {
  // Open index.html#demo to preview the design with example plans (nothing is saved).
  settings = { ...settings, nameA: preset("a")?.name || "Alex", nameB: preset("b")?.name || "Sam" };
  const t = new Date(), at = (n) => { const d = new Date(t); d.setDate(d.getDate() + n); return ymd(d); };
  events = [
    { id: "1", title: "Dinner at Mario's", date: at(0), time: "19:30", who: "both", place: "Södermalm", remind: 30 },
    { id: "2", title: "Dentist", date: at(0), time: "09:00", who: "a", remind: 60 },
    { id: "3", title: "Yoga class", date: at(1), time: "17:30", who: "b", remind: 30 },
    { id: "4", title: "Date night", date: at(3), time: "20:00", who: "both", remind: 120 },
    { id: "5", title: "Client meeting", date: at(5), time: "11:00", who: "a", remind: 10 },
    { id: "6", title: "Anniversary", date: at(9), time: "", who: "both", remind: 0 },
    { id: "7", title: "Hike", date: at(12), time: "08:00", who: "b", remind: -1 },
  ];
  todos = [
    { id: "t1", text: "Book weekend tickets", who: "a" }, { id: "t2", text: "Pick up groceries", who: "b", due: at(1) },
    { id: "t3", text: "Plan Sunday brunch", who: "both" }, { id: "t4", text: "Pay electricity bill", who: "a", done: true, doneAt: 1 },
  ];
  $("#liveTxt").textContent = "Demo"; show("app"); render();
}

async function boot() {
  if (location.hash === "#demo") { demo(); return; }
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE")) { show("setup"); return; }
  const [app, a, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  F = { ...a, ...fs };
  const fbApp = app.initializeApp(firebaseConfig);
  auth = a.getAuth(fbApp);
  try { db = fs.initializeFirestore(fbApp, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
  catch { db = fs.getFirestore(fbApp); }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#lErr").hidden = true; $("#lBtn").disabled = true; $("#lBtn").textContent = "Signing in…";
    try { await a.signInWithEmailAndPassword(auth, $("#lEmail").value.trim(), $("#lPass").value); }
    catch (err) { $("#lErr").textContent = "That email and password don't match. Try again or reset your password."; $("#lErr").hidden = false; }
    finally { $("#lBtn").disabled = false; $("#lBtn").textContent = "Sign in"; }
  });
  $("#lForgot").onclick = async () => {
    const email = $("#lEmail").value.trim();
    if (!email) { $("#lErr").textContent = "Type your email above first."; $("#lErr").hidden = false; return; }
    try { await a.sendPasswordResetEmail(auth, email); } catch {}
    $("#lErr").textContent = "If that address has an account, a reset link is on its way."; $("#lErr").hidden = false;
  };

  a.onAuthStateChanged(auth, async (u) => {
    user = u;
    if (!u) { unsubs.forEach((x) => x()); unsubs = []; show("login"); return; }
    show("app"); render();
    try { await claimSeat(); }
    catch (err) {
      console.error(err);
      if (err.code === "permission-denied") { toast("This email isn't allowed in this calendar"); await a.signOut(auth); return; }
    }
    startData();
  });
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => { if (!document.hidden && db) { render(); sweepReminders(); } });
boot();
