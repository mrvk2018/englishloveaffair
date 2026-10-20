const API_URL = "http://127.0.0.1:8000";
const QR_LINK = ["https://", "mrvk2018", ".", "github", ".", "io", "/", "englishloveaffair", "/"].join("");
const CALENDAR_FLOOR = "2026-10-20";
const HOURS = Array.from({ length: 13 }, (_, index) => String(index + 9).padStart(2, "0"));

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const MONTHS_NOM = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

const TARIFFS = [
  { title: "1 урок", note: "разовое занятие", price: 1500, old: null },
  { title: "4 занятия", note: "абонемент", price: 5800, old: 6000 },
  { title: "8 занятий", note: "на месяц", price: 11600, old: 12000 },
  { title: "8 занятий", note: "на два месяца", price: 11600, old: 12000 },
  { title: "16 занятий", note: "на два месяца", price: 23200, old: 24000 },
];

const QUALIFICATIONS = {
  hse: {
    label: "образование",
    title: "НИУ ВШЭ",
    period: "2020–2025",
    summary: "Факультет гуманитарных наук, бакалавриат «История». Курс педагогики и практика в гимназии, 2025.",
    lines: [
      "Факультет гуманитарных наук",
      "Бакалавриат «История»",
      "Курс педагогики и практика в гимназии, 2025",
    ],
  },
  tefl: {
    label: "сертификат",
    title: "TEFL",
    period: "120+ часов",
    summary: "Сертификат TEFL, 120+ часов.",
    lines: ["Сертификат TEFL", "120+ часов"],
  },
};

const MESSENGERS = [
  { value: "TG", label: "Telegram" },
  { value: "WA", label: "WhatsApp" },
  { value: "Viber", label: "Viber" },
  { value: "Custom", label: "Свой вариант" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Пока не знаю"];

const DEFAULT_TG_ADMIN_ID = "357594022";

const fieldClass =
  "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100";
const btnPrimary =
  "w-full rounded-2xl bg-rose-500 px-5 py-3.5 text-center text-[15px] font-medium text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.99] disabled:opacity-60";
const btnSoft =
  "w-full rounded-2xl bg-rose-50 px-5 py-3.5 text-center text-[15px] font-medium text-rose-700 transition hover:bg-rose-100 active:scale-[0.99]";
const card = "rounded-2xl bg-white shadow-sm";

const state = {
  screen: "home",
  adminTab: sessionStorage.getItem("ela_admin_tab") || "schedule",
  student: readJson(sessionStorage, "ela_student"),
  adminToken: localStorage.getItem("ela_admin_token") || "",
  slotsPayload: null,
  calendarStart: CALENDAR_FLOOR,
  visibleMonth: "",
  selectedDate: "",
  requests: [],
  students: { active: [], archived: [] },
  archiveOpen: false,
  settings: null,
  adminDays: 14,
  approved: readJson(sessionStorage, "ela_approved") || {},
  feedbackDraft: "",
  modal: null,
  toast: "",
  toastTone: "neutral",
  loading: false,
};

const savedScreen = sessionStorage.getItem("ela_screen");
if (savedScreen === "admin" && state.adminToken) {
  state.screen = "admin";
  state.loading = true;
} else if (savedScreen === "calendar" && state.student) {
  state.screen = "calendar";
  state.loading = true;
}

const secretTaps = [];
let toastTimer = 0;
let lock = false;

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

boot();

function boot() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
  render();
  if (state.screen === "calendar") {
    guard(() => loadStudentSlots());
  } else if (state.screen === "admin") {
    guard(() => loadAdminTab());
  }
}

function readJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rub(amount) {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
}

function lessonWord(count) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "уроков";
  if (last === 1) return "урок";
  if (last >= 2 && last <= 4) return "урока";
  return "уроков";
}

function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIso(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDay(iso) {
  const date = parseIso(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${WEEKDAYS[date.getDay()]}`;
}

function formatMonth(isoMonth) {
  const [year, month] = isoMonth.split("-").map(Number);
  return `${MONTHS_NOM[month - 1]} ${year}`;
}

function shiftMonth(isoMonth, delta) {
  const [year, month] = isoMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(iso, count) {
  const date = parseIso(iso);
  date.setDate(date.getDate() + count);
  return toIso(date);
}

function splitSlot(iso) {
  const value = String(iso);
  return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

function isPast(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= new Date();
}

function slotsByDate() {
  const map = new Map();
  for (const slot of state.slotsPayload?.slots || []) {
    const { date, time } = splitSlot(slot.datetime);
    if (!map.has(date)) map.set(date, []);
    map.get(date).push({ ...slot, time });
  }
  for (const list of map.values()) list.sort((left, right) => left.time.localeCompare(right.time));
  return map;
}

function applyCalendarMeta() {
  const start = String(state.slotsPayload?.calendar_start || CALENDAR_FLOOR).slice(0, 10);
  state.calendarStart = start < CALENDAR_FLOOR ? CALENDAR_FLOOR : start;
  if (!state.visibleMonth) state.visibleMonth = state.calendarStart.slice(0, 7);
}

function errorText(data) {
  if (!data) return "Не удалось выполнить запрос";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => item.msg || "Проверьте поля формы").join(". ");
  }
  return "Не удалось выполнить запрос";
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    if (!state.adminToken) throw new Error("Нужен вход преподавателя");
    headers.Authorization = `Bearer ${state.adminToken}`;
  }
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Сервер недоступен. Запустите бэкенд на 127.0.0.1:8000");
  }
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (response.status === 401 && auth) {
    state.adminToken = "";
    localStorage.removeItem("ela_admin_token");
    if (state.screen === "admin") setScreen("home");
    throw new Error("Сессия преподавателя закончилась. Войдите снова.");
  }
  if (!response.ok) {
    const error = new Error(errorText(data));
    error.status = response.status;
    throw error;
  }
  return data;
}

function toast(message, tone = "neutral") {
  state.toast = message;
  state.toastTone = tone;
  renderToast();
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    state.toast = "";
    state.toastTone = "neutral";
    renderToast();
  }, 3400);
}

async function guard(action) {
  if (lock) return;
  lock = true;
  try {
    await action();
  } catch (error) {
    toast(error.message || "Что-то пошло не так");
  } finally {
    lock = false;
  }
}

function setScreen(screen) {
  state.screen = screen;
  sessionStorage.setItem("ela_screen", screen);
  closeModal();
  render();
  window.scrollTo(0, 0);
}

function render() {
  app.innerHTML = view();
}

function view() {
  if (state.screen === "calendar") return renderCalendar();
  if (state.screen === "admin") return renderAdmin();
  return renderHome();
}

function renderHome() {
  const tariffs = TARIFFS.map((item) => {
    const badge = item.old
      ? `<span class="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">−${esc(rub(item.old - item.price))}</span>`
      : "";
    const old = item.old ? `<span class="text-sm text-slate-400 line-through">${esc(rub(item.old))}</span>` : "";
    return `
      <article class="${card} flex flex-col p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-serif text-3xl leading-none text-slate-800">${esc(item.title)}</h3>
            <p class="mt-1 text-sm text-slate-500">${esc(item.note)}</p>
          </div>
          ${badge}
        </div>
        <p class="mt-5 flex items-baseline gap-2">
          <span class="font-serif text-4xl text-rose-700">${esc(rub(item.price))}</span>
          ${old}
        </p>
      </article>`;
  }).join("");

  const qualifications = Object.entries(QUALIFICATIONS)
    .map(
      ([id, item]) => `
      <button type="button" data-action="open-qualification" data-id="${id}" class="${card} p-5 text-left transition hover:bg-rose-50/40">
        <p class="text-xs uppercase tracking-[0.18em] text-rose-500">${esc(item.label)}</p>
        <h3 class="mt-2 font-serif text-3xl text-slate-800">${esc(item.title)}</h3>
        <p class="mt-1 text-sm text-slate-500">${esc(item.period)}</p>
        <p class="mt-3 text-sm leading-6 text-slate-600">${esc(item.summary)}</p>
      </button>`
    )
    .join("");

  return `
    <div class="mx-auto min-h-screen max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <header class="mb-10 text-center">
        <h1 class="font-serif text-5xl font-medium leading-none text-rose-700 sm:text-7xl">English Love Affair</h1>
        <p class="mx-auto mt-4 h-px w-16 bg-rose-200"></p>
      </header>
      <main class="space-y-10">
        <section>
          <h2 class="mb-4 font-serif text-4xl text-slate-800">Обо мне</h2>
          <article class="${card} p-5 sm:p-8">
            <img
              src="teacher.jpg"
              alt="Преподаватель English Love Affair"
              class="w-full cursor-default select-none rounded-2xl"
              draggable="false"
              data-action="secret-tap"
            />
            <p class="mt-6 font-serif text-3xl text-slate-800">преподаватель английского</p>
            <p class="mt-4 text-[15px] leading-7 text-slate-600">я — человек с огромным количеством интересов. я постоянно в движении, много путешествую и обожаю открывать для себя что-то новое. на моих уроках — френдли-атмосфера. я создаю безопасное пространство, где вы можете расслабиться и наконец заговорить на английском.</p>
            <p class="mt-5 text-sm leading-6 text-slate-500">Опыт: более 3 лет преподавания (из них год онлайн), публичная и частная практика.</p>
            <p class="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Уровень C2</p>
          </article>
        </section>

        <section>
          <h2 class="mb-4 font-serif text-4xl text-slate-800">Квалификация</h2>
          <div class="grid gap-3 sm:grid-cols-2">${qualifications}</div>
        </section>

        <section>
          <h2 class="mb-4 font-serif text-4xl text-slate-800">Тарифы</h2>
          <div class="grid gap-3 sm:grid-cols-2">${tariffs}</div>
          <article class="${card} mt-3 p-5">
            <h3 class="font-serif text-2xl text-slate-800">Отмена занятий</h3>
            <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>Отменить занятие можно строго за 24 часа. Позже урок сгорает.</li>
              <li>Опоздание больше 15 минут считается отменой.</li>
            </ul>
          </article>
        </section>

        <section class="grid gap-3 sm:grid-cols-2">
          <button type="button" data-action="open-trial" class="${btnPrimary}">Записаться на пробный урок</button>
          <button type="button" data-action="open-login" class="${btnSoft}">Я уже являюсь учеником!</button>
        </section>
      </main>
      <footer class="mt-12 text-center font-serif text-xl text-slate-400">English Love Affair</footer>
    </div>`;
}

function renderCalendar() {
  const student = state.student;
  const balance = student?.lessons_balance ?? 0;
  const archived = student?.status === "archived";
  const month = state.visibleMonth || state.calendarStart.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, monthNumber, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const available = new Set((state.slotsPayload?.available_dates || []).map((item) => String(item).slice(0, 10)));
  const canGoBack = shiftMonth(month, -1) >= state.calendarStart.slice(0, 7);
  const byDate = slotsByDate();

  const dayCells = cells
    .map((day) => {
      if (!day) return `<span></span>`;
      const iso = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (iso < state.calendarStart) {
        return `<span class="grid h-11 place-items-center text-sm text-slate-300">${day}</span>`;
      }
      const open = available.has(iso);
      const selected = state.selectedDate === iso;
      const tone = open
        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : "bg-red-50 text-red-600";
      const ring = selected ? "ring-2 ring-slate-400" : "";
      return `<button type="button" ${open ? `data-action="pick-day" data-date="${iso}"` : "disabled"} class="grid h-11 place-items-center rounded-2xl text-sm font-medium ${tone} ${ring} disabled:cursor-default">${day}</button>`;
    })
    .join("");

  const weekdays = WEEKDAYS_SHORT.map(
    (name) => `<span class="grid h-8 place-items-center text-xs uppercase tracking-wide text-slate-400">${name}</span>`
  ).join("");

  let hours = "";
  if (state.selectedDate) {
    const list = byDate.get(state.selectedDate) || [];
    const buttons = list.length
      ? list
          .map((slot) => {
            const past = isPast(state.selectedDate, slot.time);
            if (slot.status === "blocked_by_admin") {
              return `<button type="button" disabled class="rounded-2xl bg-gray-200 px-3 py-3 text-sm font-medium text-gray-500">${esc(slot.time)}</button>`;
            }
            if (slot.status === "booked") {
              const mine = slot.student_id === student?.id ? " · ваш урок" : "";
              return `<button type="button" disabled class="rounded-2xl bg-red-50 px-3 py-3 text-sm font-medium text-red-600">${esc(slot.time)}${mine}</button>`;
            }
            const disabled = past || balance <= 0 || archived;
            return `<button type="button" data-action="book-slot" data-id="${slot.id}" data-label="${esc(formatDay(state.selectedDate))} ${esc(slot.time)}" class="rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50" ${disabled ? "disabled" : ""}>${esc(slot.time)}</button>`;
          })
          .join("")
      : `<p class="text-sm text-slate-500">В этот день нет часов.</p>`;
    const note = archived
      ? `<p class="mb-3 text-sm text-gray-500">Аккаунт в архиве — запись недоступна.</p>`
      : balance <= 0
        ? `<p class="mb-3 text-sm text-rose-700">На балансе нет уроков — записаться пока нельзя.</p>`
        : "";
    hours = `
      <section class="${card} mt-4 p-4">
        <h3 class="font-serif text-2xl text-slate-800">${esc(formatDay(state.selectedDate))}</h3>
        ${note}
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">${buttons}</div>
      </section>`;
  }

  const body = state.loading
    ? `<p class="py-16 text-center text-sm text-slate-400">Загрузка расписания…</p>`
    : `
      <div class="mt-6 flex items-center justify-between">
        <button type="button" data-action="shift-month" data-delta="-1" class="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl text-slate-500 shadow-sm disabled:opacity-40" ${canGoBack ? "" : "disabled"} aria-label="Предыдущий месяц">‹</button>
        <h2 class="font-serif text-3xl capitalize text-slate-800">${esc(formatMonth(month))}</h2>
        <button type="button" data-action="shift-month" data-delta="1" class="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl text-slate-500 shadow-sm" aria-label="Следующий месяц">›</button>
      </div>
      <div class="mt-4 flex gap-4 text-xs">
        <span class="text-emerald-700">зелёный — есть свободный час</span>
        <span class="text-red-600">красный — нет окон</span>
      </div>
      <div class="mt-3 grid grid-cols-7 gap-1.5">${weekdays}${dayCells}</div>
      ${hours}`;

  return `
    <div class="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      <header class="flex items-start justify-between gap-3">
        <div>
          <p class="font-serif text-2xl text-rose-700">English Love Affair</p>
          <p class="mt-2 text-lg text-slate-700">Ваш баланс: <span class="font-semibold text-rose-700">${balance}</span> ${lessonWord(balance)}</p>
        </div>
        <button type="button" data-action="logout-student" class="rounded-2xl bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">Выйти</button>
      </header>
      ${body}
      ${feedbackForm()}
    </div>`;
}

function feedbackForm() {
  return `
    <section class="${card} mt-6 p-5">
      <h2 class="font-serif text-3xl text-slate-800">Обратная связь с преподавателем</h2>
      <form data-action="send-feedback" class="mt-4 space-y-3">
        <label class="block">
          <span class="sr-only">Сообщение преподавателю</span>
          <textarea name="message" rows="4" maxlength="2000" placeholder="Введите ваше сообщение для преподавателя..." class="${fieldClass} mt-0 resize-y">${esc(state.feedbackDraft)}</textarea>
        </label>
        <button type="submit" class="${btnSoft}">Отправить сообщение</button>
      </form>
    </section>`;
}

function renderAdmin() {
  const tabs = [
    ["schedule", "Расписание"],
    ["requests", "Заявки"],
    ["students", "Ученики"],
    ["settings", "Настройки"],
  ]
    .map(([id, label]) => {
      const active = state.adminTab === id;
      const tone = active ? "bg-rose-500 text-white" : "bg-white text-slate-600 shadow-sm";
      return `<button type="button" data-action="open-tab" data-tab="${id}" class="shrink-0 rounded-2xl px-4 py-2.5 text-sm font-medium ${tone}">${label}</button>`;
    })
    .join("");

  let content = `<p class="py-16 text-center text-sm text-slate-400">Загрузка…</p>`;
  if (!state.loading) {
    if (state.adminTab === "schedule") content = renderSchedule();
    if (state.adminTab === "requests") content = renderRequests();
    if (state.adminTab === "students") content = renderStudents();
    if (state.adminTab === "settings") content = renderSettings();
  }

  return `
    <div class="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-5 sm:px-6">
      <header class="mb-4 flex items-center justify-between gap-3">
        <div>
          <p class="font-serif text-3xl text-rose-700">Кабинет</p>
          <p class="text-sm text-slate-500">English Love Affair</p>
        </div>
        <button type="button" data-action="logout-admin" class="rounded-2xl bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">Выйти</button>
      </header>
      <nav class="tabs sticky top-0 z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-slate-50/95 px-4 py-3 backdrop-blur">${tabs}</nav>
      ${content}
    </div>`;
}

function renderSchedule() {
  const byDate = slotsByDate();
  const days = [];
  for (let offset = 0; offset < state.adminDays; offset += 1) days.push(addDays(state.calendarStart, offset));
  const blocks = days
    .map((date) => {
      const rows = HOURS.map((hour) => {
        const when = `${date}T${hour}:00:00`;
        const slot = (byDate.get(date) || []).find((item) => item.time === `${hour}:00`);
        if (slot?.status === "booked") {
          return `
            <div class="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-3 py-3">
              <div>
                <p class="text-sm font-medium text-red-600">${hour}:00</p>
                <p class="text-sm text-red-600">${esc(slot.student_name || "Ученик")}</p>
              </div>
              <span class="text-xs text-red-600">занято</span>
            </div>`;
        }
        if (slot?.status === "free") {
          return hourRow(`${hour}:00`, "свободно", "bg-emerald-50 text-emerald-700", "Заблокировать слот", "block", when, "bg-gray-200 text-gray-500");
        }
        if (slot?.status === "blocked_by_admin") {
          return hourRow(`${hour}:00`, "закрыто", "bg-gray-200 text-gray-500", "Открыть слот", "open", when, "bg-rose-500 text-white");
        }
        return hourRow(`${hour}:00`, "нет слота", "bg-white text-slate-500 shadow-sm", "Открыть слот", "open", when, "bg-rose-500 text-white");
      }).join("");
      return `
        <section class="mb-6">
          <h3 class="sticky top-16 z-10 bg-slate-50/95 py-2 font-serif text-2xl text-slate-800 backdrop-blur">${esc(formatDay(date))}</h3>
          <div class="space-y-2">${rows}</div>
        </section>`;
    })
    .join("");

  return `
    ${blocks}
    <button type="button" data-action="more-days" class="${card} w-full py-3 text-sm text-slate-500">Показать ещё неделю</button>`;
}

function hourRow(time, label, rowClass, buttonText, mode, when, buttonClass) {
  return `
    <div class="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${rowClass}">
      <div>
        <p class="text-sm font-medium tabular-nums">${time}</p>
        <p class="text-xs">${label}</p>
      </div>
      <button type="button" data-action="toggle-slot" data-mode="${mode}" data-datetime="${when}" class="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium ${buttonClass}">${buttonText}</button>
    </div>`;
}

function renderRequests() {
  if (!state.requests.length) {
    return `<p class="${card} px-5 py-8 text-center text-sm text-slate-500">Новых заявок нет.</p>`;
  }
  return state.requests
    .map((item) => {
      const approved = state.approved[item.id];
      const action = approved
        ? `<p class="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">Код ${esc(approved)}</p>`
        : `<button type="button" data-action="approve-request" data-id="${item.id}" class="${btnPrimary}">Одобрить</button>`;
      return `
        <article class="${card} mb-3 p-5">
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-serif text-3xl text-slate-800">${esc(item.name)}</h3>
            <p class="text-xs text-slate-400">${esc(String(item.created_at || "").slice(0, 16).replace("T", " "))}</p>
          </div>
          <dl class="mt-3 space-y-1 text-sm text-slate-600">
            <div>${esc(item.phone)}</div>
            <div>${esc(messengerLabel(item))}</div>
            <div>Уровень: ${esc(item.language_level)}</div>
            <div>Часовой пояс: ${esc(item.timezone)}</div>
            <div>Время: ${esc(item.schedule_wishes)}</div>
          </dl>
          <div class="mt-4">${action}</div>
        </article>`;
    })
    .join("");
}

function messengerLabel(item) {
  const names = { TG: "Telegram", WA: "WhatsApp", Viber: "Viber", Custom: "Свой вариант" };
  const base = names[item.messenger_type] || item.messenger_type;
  if (item.messenger_type === "Custom") return item.custom_messenger_text || base;
  if (item.custom_messenger_text) return `${base} · ${item.custom_messenger_text}`;
  return base;
}

function renderStudents() {
  const active = state.students.active.length
    ? state.students.active.map((student) => studentCard(student, false)).join("")
    : `<p class="${card} px-5 py-8 text-center text-sm text-slate-500">Активных учеников пока нет.</p>`;
  const archived = state.archiveOpen
    ? `<div class="mt-3 space-y-3">${
        state.students.archived.length
          ? state.students.archived.map((student) => studentCard(student, true)).join("")
          : `<p class="rounded-2xl bg-gray-200 px-5 py-6 text-center text-sm text-gray-500">Архив пуст.</p>`
      }</div>`
    : "";
  return `
    <h2 class="mb-3 font-serif text-3xl text-slate-800">Активные ученики</h2>
    <div class="space-y-3">${active}</div>
    <button type="button" data-action="toggle-archive" class="mt-4 w-full rounded-2xl bg-gray-200 py-3 text-sm font-medium text-gray-500">
      ${state.archiveOpen ? "Скрыть архив" : "Показать архив"}
    </button>
    ${archived}`;
}

function studentCard(student, archived) {
  const shell = archived ? "rounded-2xl bg-gray-200 p-5 text-gray-500" : `${card} p-5`;
  const balance = archived
    ? `<p class="mt-3 text-sm">Баланс: ${student.lessons_balance} ${lessonWord(student.lessons_balance)}</p>`
    : `
      <p class="mt-3 text-sm text-slate-500">Сейчас: ${student.lessons_balance} ${lessonWord(student.lessons_balance)}</p>
      <form data-action="save-balance" data-id="${student.id}" class="mt-3 flex gap-2">
        <input name="value" inputmode="text" placeholder="10, +3 или -1" class="${fieldClass} mt-0" aria-label="Баланс уроков" />
        <button type="submit" class="shrink-0 rounded-2xl bg-rose-500 px-4 text-sm font-medium text-white">Ок</button>
      </form>
      <button type="button" data-action="ask-archive" data-id="${student.id}" data-name="${esc(student.name)}" class="mt-3 text-sm text-slate-500">В архив</button>`;
  return `
    <article class="${shell}">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-serif text-3xl ${archived ? "" : "text-slate-800"}">${esc(student.name)}</h3>
          <p class="mt-1 text-sm">${esc(student.phone)} · ${esc(student.messenger)}</p>
        </div>
        <button type="button" data-action="copy-code" data-code="${esc(student.access_code)}" class="rounded-full px-3 py-1 text-sm font-medium tracking-wide ${archived ? "bg-white/60" : "bg-rose-50 text-rose-700"}">${esc(student.access_code)}</button>
      </div>
      ${balance}
    </article>`;
}

function settingsWithDefault(settings) {
  const row = settings || { tg_bot_token: "", tg_admin_id: "", notifications_enabled: false };
  const adminId = String(row.tg_admin_id || "").trim() || DEFAULT_TG_ADMIN_ID;
  return { ...row, tg_admin_id: adminId };
}

function renderSettings() {
  const settings = settingsWithDefault(state.settings);
  return `
    <form data-action="save-settings" class="${card} space-y-4 p-5">
      <label class="block text-sm text-slate-500">Токен TG-бота
        <input id="tg-token" name="tg_bot_token" value="${esc(settings.tg_bot_token)}" autocomplete="off" class="${fieldClass}" />
      </label>
      <label class="block text-sm text-slate-500">TG Admin ID
        <input id="tg-admin" name="tg_admin_id" value="${esc(settings.tg_admin_id)}" autocomplete="off" class="${fieldClass}" />
      </label>
      <label class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span>Напоминания за 30 минут</span>
        <span>
          <input id="notifications" name="notifications_enabled" type="checkbox" class="sr-only" ${settings.notifications_enabled ? "checked" : ""} />
          <span class="switch"></span>
        </span>
      </label>
      <button type="submit" class="${btnPrimary}">Сохранить</button>
    </form>
    <button type="button" data-action="make-qr" class="${btnSoft} mt-3">Сгенерировать рекламный QR-код сайта</button>
    <div id="qr-box" class="qr-box ${card} mt-3 hidden p-5 text-center"></div>`;
}

function renderModal() {
  if (!state.modal) {
    modalRoot.innerHTML = "";
    document.body.classList.remove("overflow-hidden");
    return;
  }
  document.body.classList.add("overflow-hidden");
  const { type } = state.modal;
  if (type === "qualification") {
    modalRoot.innerHTML = qualificationModal(QUALIFICATIONS[state.modal.id]);
    return;
  }
  const panel = {
    trial: trialModal,
    login: loginModal,
    "admin-login": adminLoginModal,
    "show-code": codeModal,
    archive: archiveModal,
    "archived-student": archivedStudentModal,
  }[type];
  modalRoot.innerHTML = sheet(panel ? panel() : "");
  const focus = modalRoot.querySelector("[autofocus]");
  if (focus) focus.focus();
}

function sheet(content) {
  return `
    <div class="fade-in fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" data-action="close-modal" aria-label="Закрыть"></button>
      <div class="sheet-in relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-sm sm:max-w-md sm:rounded-2xl">
        ${content}
      </div>
    </div>`;
}

function qualificationModal(item) {
  if (!item) return "";
  const lines = item.lines.map((line) => `<p class="text-lg leading-8 text-slate-600">${esc(line)}</p>`).join("");
  return `
    <div class="fade-in fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <div class="mx-auto flex min-h-full max-w-2xl flex-col px-5 py-6">
        <button type="button" data-action="close-modal" class="self-end rounded-2xl bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">Закрыть</button>
        <p class="mt-10 text-xs uppercase tracking-[0.22em] text-rose-500">${esc(item.label)}</p>
        <h2 class="mt-3 font-serif text-6xl text-slate-800">${esc(item.title)}</h2>
        <p class="mt-2 text-lg text-slate-500">${esc(item.period)}</p>
        <article class="${card} mt-8 p-6">${lines}</article>
      </div>
    </div>`;
}

function trialModal() {
  const options = MESSENGERS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  const levels = LEVELS.map((level) => `<option value="${esc(level)}">${esc(level)}</option>`).join("");
  return `
    <form data-action="submit-trial" class="space-y-3">
      <h2 class="font-serif text-4xl text-slate-800">Пробный урок</h2>
      <label class="block text-sm text-slate-500">Имя<input name="name" required maxlength="200" autocomplete="name" class="${fieldClass}" autofocus /></label>
      <label class="block text-sm text-slate-500">Телефон<input name="phone" type="tel" required minlength="3" maxlength="50" autocomplete="tel" class="${fieldClass}" /></label>
      <label class="block text-sm text-slate-500">Мессенджер
        <select id="messenger" name="messenger_type" class="${fieldClass}">${options}</select>
      </label>
      <div id="custom-messenger-wrap" hidden>
        <label class="block text-sm text-slate-500">Свой вариант<input id="custom-messenger" name="custom_messenger_text" maxlength="200" class="${fieldClass}" placeholder="Название мессенджера" /></label>
      </div>
      <label class="block text-sm text-slate-500">Уровень языка
        <select name="language_level" required class="${fieldClass}"><option value="">Выберите уровень</option>${levels}</select>
      </label>
      <label class="block text-sm text-slate-500">Часовой пояс<input name="timezone" required maxlength="100" placeholder="например, GMT+10, Владивосток" class="${fieldClass}" /></label>
      <label class="block text-sm text-slate-500">Пожелания по времени<textarea name="schedule_wishes" required maxlength="2000" rows="3" class="${fieldClass}"></textarea></label>
      <p id="modal-error" class="hidden text-sm text-red-600"></p>
      <button type="submit" class="${btnPrimary}">Отправить заявку</button>
    </form>`;
}

function loginModal() {
  return `
    <form data-action="submit-login" class="space-y-3">
      <h2 class="font-serif text-4xl text-slate-800">Вход ученика</h2>
      <label class="block text-sm text-slate-500">Код доступа
        <input name="access_code" required minlength="4" maxlength="20" autocapitalize="characters" spellcheck="false" placeholder="ELA-482" class="${fieldClass}" autofocus />
      </label>
      <p id="modal-error" class="hidden text-sm text-red-600"></p>
      <button type="submit" class="${btnPrimary}">Войти</button>
    </form>`;
}

function adminLoginModal() {
  return `
    <form data-action="submit-admin" class="space-y-3">
      <h2 class="font-serif text-4xl text-slate-800">Вход преподавателя</h2>
      <label class="block text-sm text-slate-500">Пароль
        <input name="password" type="password" inputmode="numeric" required autocomplete="current-password" class="${fieldClass}" autofocus />
      </label>
      <p id="modal-error" class="hidden text-sm text-red-600"></p>
      <button type="submit" class="${btnPrimary}">Войти</button>
    </form>`;
}

function codeModal() {
  const code = state.modal.code || "";
  return `
    <div class="space-y-4 text-center">
      <h2 class="font-serif text-4xl text-slate-800">Ученик создан</h2>
      <p class="text-sm text-slate-500">Передайте код ученику</p>
      <p class="font-serif text-5xl tracking-wide text-rose-700">${esc(code)}</p>
      <button type="button" data-action="copy-code" data-code="${esc(code)}" class="${btnPrimary}">Скопировать код</button>
      <button type="button" data-action="close-modal" class="${btnSoft}">Закрыть</button>
    </div>`;
}

function archivedStudentModal() {
  return `
    <div class="space-y-4">
      <h2 class="font-serif text-4xl text-slate-800">Доступ ограничен</h2>
      <p class="text-sm leading-6 text-slate-600">Ваша учетная запись находится в архиве. Для возобновления занятий, пожалуйста, заполните общую форму «Записаться на пробный урок» на главной странице.</p>
      <button type="button" data-action="open-trial" class="${btnPrimary}">Записаться на пробный урок</button>
      <button type="button" data-action="close-modal" class="${btnSoft}">Закрыть</button>
    </div>`;
}

function archiveModal() {
  return `
    <div class="space-y-4">
      <h2 class="font-serif text-4xl text-slate-800">В архив</h2>
      <p class="text-sm leading-6 text-slate-600">${esc(state.modal.name)} перестанет записываться на уроки. Уже стоящие занятия сохранятся.</p>
      <button type="button" data-action="confirm-archive" data-id="${state.modal.id}" class="${btnPrimary}">Перевести в архив</button>
      <button type="button" data-action="close-modal" class="${btnSoft}">Оставить активным</button>
    </div>`;
}

function renderToast() {
  const tones = {
    success: "bg-rose-50 text-rose-700",
    warn: "bg-red-50 text-red-600",
    neutral: "bg-slate-800 text-white",
  };
  const tone = tones[state.toastTone] || tones.neutral;
  toastRoot.innerHTML = state.toast
    ? `<p class="toast-in w-full rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-md ${tone}">${esc(state.toast)}</p>`
    : "";
}

function openModal(type, extra = {}) {
  state.modal = { type, ...extra };
  renderModal();
}

function closeModal() {
  state.modal = null;
  renderModal();
}

function setModalError(message) {
  const node = document.getElementById("modal-error");
  if (!node) return;
  node.textContent = message || "";
  node.classList.toggle("hidden", !message);
}

function rememberStudent(student) {
  state.student = student;
  sessionStorage.setItem("ela_student", JSON.stringify(student));
}

function forgetStudent() {
  state.student = null;
  state.selectedDate = "";
  state.slotsPayload = null;
  state.feedbackDraft = "";
  sessionStorage.removeItem("ela_student");
}

function registerSecretTap() {
  const now = Date.now();
  secretTaps.push(now);
  while (secretTaps.length && now - secretTaps[0] > 2000) secretTaps.shift();
  if (secretTaps.length === 5) {
    secretTaps.length = 0;
    openModal("admin-login");
  }
}

async function loadStudentSlots({ quiet = false } = {}) {
  if (!quiet) {
    state.loading = true;
    render();
  }
  try {
    state.slotsPayload = await api("/api/slots");
    applyCalendarMeta();
  } finally {
    state.loading = false;
    render();
  }
}

async function loadAdminTab() {
  state.loading = true;
  render();
  try {
    if (state.adminTab === "schedule") {
      state.slotsPayload = await api("/api/slots", { auth: true });
      applyCalendarMeta();
    } else if (state.adminTab === "requests") {
      state.requests = await api("/api/admin/requests", { auth: true });
    } else if (state.adminTab === "students") {
      state.students = await api("/api/admin/students", { auth: true });
    } else if (state.adminTab === "settings") {
      state.settings = settingsWithDefault(await api("/api/admin/settings", { auth: true }));
    }
  } finally {
    state.loading = false;
    render();
  }
}

function onClick(event) {
  const node = event.target.closest("[data-action]");
  if (!node) return;
  const action = node.dataset.action;
  if (action === "secret-tap") {
    registerSecretTap();
    return;
  }
  const handlers = {
    "close-modal": () => closeModal(),
    "open-trial": () => openModal("trial"),
    "open-login": () => openModal("login"),
    "open-qualification": () => openModal("qualification", { id: node.dataset.id }),
    "logout-student": () => {
      forgetStudent();
      setScreen("home");
    },
    "logout-admin": () => {
      state.adminToken = "";
      localStorage.removeItem("ela_admin_token");
      setScreen("home");
    },
    "pick-day": () => {
      state.selectedDate = node.dataset.date;
      render();
    },
    "shift-month": () => {
      const next = shiftMonth(state.visibleMonth, Number(node.dataset.delta));
      if (next < state.calendarStart.slice(0, 7)) return;
      state.visibleMonth = next;
      state.selectedDate = "";
      render();
    },
    "book-slot": () => guard(() => bookSlot(node)),
    "open-tab": () =>
      guard(async () => {
        state.adminTab = node.dataset.tab;
        sessionStorage.setItem("ela_admin_tab", state.adminTab);
        await loadAdminTab();
      }),
    "more-days": () => {
      state.adminDays += 7;
      render();
    },
    "toggle-slot": () => guard(() => toggleSlot(node)),
    "approve-request": () => guard(() => approveRequest(node.dataset.id)),
    "toggle-archive": () => {
      state.archiveOpen = !state.archiveOpen;
      render();
    },
    "ask-archive": () => openModal("archive", { id: Number(node.dataset.id), name: node.dataset.name }),
    "confirm-archive": () => guard(() => archiveStudent(node.dataset.id)),
    "copy-code": () => guard(() => copyCode(node.dataset.code)),
    "make-qr": () => makeQr(),
  };
  const handler = handlers[action];
  if (!handler) return;
  handler();
}

function onInput(event) {
  const form = event.target.closest("form[data-action='send-feedback']");
  if (!form || event.target.name !== "message") return;
  state.feedbackDraft = event.target.value;
}

function onChange(event) {
  if (event.target.id !== "messenger") return;
  const wrap = document.getElementById("custom-messenger-wrap");
  const input = document.getElementById("custom-messenger");
  if (!wrap || !input) return;
  const custom = event.target.value === "Custom";
  wrap.hidden = !custom;
  input.required = custom;
  if (!custom) input.value = "";
}

function onKeydown(event) {
  if (event.key === "Escape" && state.modal) closeModal();
}

async function onSubmit(event) {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.action;
  await guard(async () => {
    if (action === "submit-trial") await submitTrial(form);
    if (action === "submit-login") await submitLogin(form);
    if (action === "submit-admin") await submitAdmin(form);
    if (action === "save-balance") await saveBalance(form);
    if (action === "save-settings") await saveSettings(form);
    if (action === "send-feedback") await sendStudentMessage(form);
  });
}

async function submitTrial(form) {
  const data = new FormData(form);
  const messenger = String(data.get("messenger_type") || "TG");
  const custom = String(data.get("custom_messenger_text") || "").trim();
  if (messenger === "Custom" && !custom) {
    setModalError("Укажите название мессенджера");
    return;
  }
  await api("/api/requests", {
    method: "POST",
    body: {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      messenger_type: messenger,
      custom_messenger_text: messenger === "Custom" ? custom : null,
      language_level: String(data.get("language_level") || "").trim(),
      timezone: String(data.get("timezone") || "").trim(),
      schedule_wishes: String(data.get("schedule_wishes") || "").trim(),
    },
  });
  closeModal();
  toast("Заявка отправлена. Скоро свяжусь с вами.");
}

async function submitLogin(form) {
  const accessCode = String(new FormData(form).get("access_code") || "").trim();
  const student = await api("/api/auth/student", {
    method: "POST",
    body: { access_code: accessCode },
  });
  rememberStudent(student);
  state.selectedDate = "";
  state.visibleMonth = "";
  closeModal();
  state.screen = "calendar";
  sessionStorage.setItem("ela_screen", "calendar");
  await loadStudentSlots();
}

async function submitAdmin(form) {
  const password = String(new FormData(form).get("password") || "");
  const result = await api("/api/auth/admin", {
    method: "POST",
    body: { password },
  });
  state.adminToken = result.token;
  localStorage.setItem("ela_admin_token", result.token);
  state.adminTab = "schedule";
  sessionStorage.setItem("ela_admin_tab", "schedule");
  closeModal();
  state.screen = "admin";
  sessionStorage.setItem("ela_screen", "admin");
  await loadAdminTab();
}

async function sendStudentMessage(form) {
  const message = String(new FormData(form).get("message") || "").trim();
  if (!message) throw new Error("Напишите сообщение для преподавателя");
  const accessCode = state.student?.access_code;
  if (!accessCode) throw new Error("Нужен вход ученика");
  try {
    await api("/api/students/message", {
      method: "POST",
      body: { access_code: accessCode, message },
    });
  } catch (error) {
    if (error.status === 403) {
      forgetStudent();
      setScreen("home");
      openModal("archived-student");
      return;
    }
    if (error.status === 502 || error.status === 503) {
      toast("Ошибка отправки. Преподаватель еще не настроил Telegram-уведомления", "warn");
      return;
    }
    throw error;
  }
  state.feedbackDraft = "";
  form.reset();
  toast("Сообщение успешно отправлено преподавателю в Telegram!", "success");
}

async function bookSlot(node) {
  const result = await api("/api/slots/book", {
    method: "POST",
    body: { access_code: state.student.access_code, slot_id: Number(node.dataset.id) },
  });
  state.student.lessons_balance = result.lessons_balance;
  rememberStudent(state.student);
  await loadStudentSlots({ quiet: true });
  toast(`Урок забронирован: ${node.dataset.label}`);
}

async function toggleSlot(node) {
  node.disabled = true;
  const mode = node.dataset.mode;
  const result = await api("/api/admin/slots/manage", {
    method: "POST",
    auth: true,
    body: { action: mode, datetimes: [node.dataset.datetime] },
  });
  if (!result.created.length && !result.updated.length) {
    throw new Error(result.skipped[0]?.reason || "Не удалось изменить слот");
  }
  state.slotsPayload = await api("/api/slots", { auth: true });
  applyCalendarMeta();
  render();
  toast(mode === "open" ? "Слот открыт" : "Слот заблокирован");
}

async function approveRequest(id) {
  const student = await api("/api/admin/students", {
    method: "POST",
    auth: true,
    body: { request_id: Number(id), lessons_balance: 0 },
  });
  state.approved[id] = student.access_code;
  sessionStorage.setItem("ela_approved", JSON.stringify(state.approved));
  render();
  openModal("show-code", { code: student.access_code });
}

async function saveBalance(form) {
  const value = String(new FormData(form).get("value") || "").trim().replaceAll(" ", "");
  if (!/^[+-]?\d+$/.test(value)) throw new Error("Введите число, +3 или -1");
  const student = await api(`/api/admin/students/${form.dataset.id}/balance`, {
    method: "PUT",
    auth: true,
    body: { value },
  });
  patchStudent(student);
  render();
  toast("Баланс обновлён");
}

async function archiveStudent(id) {
  const student = await api(`/api/admin/students/${id}/archive`, { method: "PUT", auth: true });
  patchStudent(student);
  closeModal();
  render();
  toast("Ученик в архиве");
}

function patchStudent(student) {
  state.students.active = state.students.active.filter((item) => item.id !== student.id);
  state.students.archived = state.students.archived.filter((item) => item.id !== student.id);
  const key = student.status === "archived" ? "archived" : "active";
  state.students[key].unshift(student);
}

async function saveSettings(form) {
  const data = new FormData(form);
  state.settings = await api("/api/admin/settings", {
    method: "POST",
    auth: true,
    body: {
      tg_bot_token: String(data.get("tg_bot_token") || "").trim(),
      tg_admin_id: String(data.get("tg_admin_id") || "").trim(),
      notifications_enabled: form.querySelector("#notifications").checked,
    },
  });
  render();
  toast("Настройки сохранены");
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    toast("Код скопирован");
  } catch {
    toast(code);
  }
}

function makeQr() {
  const box = document.getElementById("qr-box");
  if (!box) return;
  box.classList.remove("hidden");
  box.innerHTML = `<p class="mb-4 text-sm text-slate-500">${esc(QR_LINK)}</p><div id="qr-canvas"></div>`;
  const QR = window.QRCode;
  if (!QR) {
    toast("Не удалось загрузить библиотеку QR-кода");
    return;
  }
  new QR(document.getElementById("qr-canvas"), {
    text: QR_LINK,
    width: 220,
    height: 220,
    colorDark: "#334155",
    colorLight: "#ffffff",
    correctLevel: QR.CorrectLevel.M,
  });
}
