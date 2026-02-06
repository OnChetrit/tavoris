const STORAGE_KEY = "work-hours-entries";
const THEME_KEY = "work-hours-theme";

const byId = (id) => document.getElementById(id);

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = byId("theme-toggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
};

const initThemeToggle = () => {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")
    .matches;
  const initial = saved || (prefersDark ? "dark" : "light");
  applyTheme(initial);

  const toggle = byId("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
};

const toHours = (start, end) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff / 60 : 0;
};

const loadEntries = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveEntries = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const sortEntries = (entries) =>
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

const formatDisplayDate = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;

  const parts = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const weekday = parts.find((part) => part.type === "weekday")?.value;

  if (!day || !month || !weekday) return isoDate;
  return `${day} ${month} ${weekday}`;
};

const renderRecentEntries = (entries) => {
  const list = byId("recent-list");
  if (!list) return;
  list.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-item";
    empty.textContent = "אין עדיין רישומים. הוסף משמרת ראשונה.";
    list.appendChild(empty);
    return;
  }

  sortEntries(entries)
    .slice(0, 5)
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = "list-item";
      item.dataset.entryId = entry.id;
      item.innerHTML = `
        <strong class="entry-date">${formatDisplayDate(entry.date)}</strong>
        <span class="entry-time">${entry.start} → ${entry.end}</span>
        <span class="entry-location">${entry.location}</span>
        <span class="entry-hours">${entry.hours.toFixed(2)} שעות</span>
      `;
      list.appendChild(item);
    });
};

const renderLocationOptions = (entries) => {
  const datalist = byId("location-options");
  if (!datalist) return;

  const locations = Array.from(
    new Set(
      entries
        .map((entry) => entry.location)
        .filter((location) => location && location.trim())
    )
  ).sort((a, b) => a.localeCompare(b, "he"));

  datalist.innerHTML = "";
  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    datalist.appendChild(option);
  });
};

const updateTodayStatus = (entries, today) => {
  const status = byId("today-status");
  if (!status) return;

  const todayEntries = entries.filter((entry) => entry.date === today);
  if (todayEntries.length === 0) {
    status.hidden = true;
    status.textContent = "";
    return;
  }

  const totalHours = todayEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0
  );
  status.textContent = `כבר נרשמו היום ${totalHours.toFixed(2)} שעות.`;
  status.hidden = false;
};

const updateTodaySummary = (entry) => {
  const summary = byId("today-summary");
  if (!summary) return;
  if (!entry) {
    summary.textContent = "";
    return;
  }
  summary.textContent = `נשמרו ${entry.hours.toFixed(2)} שעות בתאריך ${entry.date}.`;
};

const initTodayPage = () => {
  const form = byId("today-form");
  if (!form) return;

  const dateInput = byId("work-date");
  const saveButton = byId("save-button");
  const startInput = byId("start-time");
  const endInput = byId("end-time");
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;

  const entries = loadEntries();
  renderRecentEntries(entries);
  renderLocationOptions(entries);
  updateTodayStatus(entries, today);

  const recentList = byId("recent-list");
  recentList?.addEventListener("click", (event) => {
    const target = event.target.closest(".list-item");
    if (!target) return;
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    dateInput.value = entry.date;
    startInput.value = entry.start;
    endInput.value = entry.end;
    const locationInput = byId("location");
    if (locationInput) {
      locationInput.value = entry.location;
    }
    updateSaveState();
  });

  const updateSaveState = () => {
    if (!saveButton) return;
    const start = startInput?.value || "";
    const end = endInput?.value || "";
    const hours = start && end ? toHours(start, end) : 0;
    saveButton.disabled = hours <= 0;
  };

  startInput?.addEventListener("input", updateSaveState);
  endInput?.addEventListener("input", updateSaveState);
  updateSaveState();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const start = byId("start-time").value;
    const end = byId("end-time").value;
    const location = byId("location").value.trim();
    const date = dateInput.value;

    const hours = toHours(start, end);
    if (hours <= 0) {
      updateTodaySummary({
        hours: 0,
        date,
      });
      alert("שעת הסיום חייבת להיות אחרי שעת ההתחלה.");
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.classList.add("is-loading");
      saveButton.textContent = "שומר...";
    }

    const entry = {
      id: crypto.randomUUID(),
      date,
      start,
      end,
      location,
      hours,
    };

    const updated = entries.filter((existing) => existing.date !== date);
    updated.push(entry);
    entries.length = 0;
    entries.push(...updated);

    saveEntries(entries);
    updateTodaySummary(entry);
    renderRecentEntries(entries);
    renderLocationOptions(entries);
    updateTodayStatus(entries, today);
    form.reset();
    dateInput.value = today;

    if (saveButton) {
      saveButton.classList.remove("is-loading");
      saveButton.textContent = "שמירה";
    }
    updateSaveState();
  });
};

const formatMonth = (date) => date.toISOString().slice(0, 7);

const renderMonthPage = () => {
  const monthPicker = byId("month-picker");
  if (!monthPicker) return;

  const rows = byId("month-rows");
  const totalEl = byId("month-total");
  const countEl = byId("month-count");
  const avgEl = byId("month-average");
  const clearButton = byId("clear-month");
  const exportCsvButton = byId("export-csv");
  const exportPdfButton = byId("export-pdf");
  const confirmModal = byId("confirm-modal");
  const confirmAccept = byId("confirm-accept");
  const confirmCancel = byId("confirm-cancel");

  const entries = loadEntries();
  const currentMonth = formatMonth(new Date());
  monthPicker.value = currentMonth;

  let currentFiltered = [];

  const render = () => {
    const selected = monthPicker.value;
    const filtered = entries.filter((entry) => entry.date.startsWith(selected));
    currentFiltered = filtered;

    rows.innerHTML = "";
    if (filtered.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="5">אין רישומים לחודש זה.</td>';
      rows.appendChild(row);
    } else {
      filtered
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach((entry) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td data-label="תאריך">${formatDisplayDate(entry.date)}</td>
            <td data-label="שעות">${entry.start} - ${entry.end}</td>
            <td data-label="שעות">${entry.hours.toFixed(2)}</td>
            <td data-label="מיקום">${entry.location}</td>
          `;
          rows.appendChild(row);
        });
    }

    const total = filtered.reduce((sum, entry) => sum + entry.hours, 0);
    totalEl.textContent = total.toFixed(2);
    countEl.textContent = String(filtered.length);
    avgEl.textContent = filtered.length
      ? (total / filtered.length).toFixed(2)
      : "0.0";
  };

  monthPicker.addEventListener("change", render);

  exportCsvButton?.addEventListener("click", () => {
    if (currentFiltered.length === 0) {
      alert("אין רישומים לייצוא עבור חודש זה.");
      return;
    }

    const headers = ["תאריך", "התחלה", "סיום", "שעות", "מיקום"];
    const escapeCell = (value) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = currentFiltered.map((entry) => [
      entry.date,
      entry.start,
      entry.end,
      entry.hours.toFixed(2),
      entry.location,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `work-hours-${monthPicker.value}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  exportPdfButton?.addEventListener("click", () => {
    if (currentFiltered.length === 0) {
      alert("אין רישומים לייצוא עבור חודש זה.");
      return;
    }
    window.print();
  });

  const closeModal = () => {
    if (confirmModal) confirmModal.hidden = true;
  };

  const openModal = () => {
    if (confirmModal) confirmModal.hidden = false;
  };

  clearButton.addEventListener("click", () => {
    openModal();
  });

  confirmCancel?.addEventListener("click", closeModal);
  confirmModal?.addEventListener("click", (event) => {
    if (event.target?.dataset?.close) {
      closeModal();
    }
  });

  confirmAccept?.addEventListener("click", () => {
    const selected = monthPicker.value;
    const remaining = entries.filter(
      (entry) => !entry.date.startsWith(selected)
    );
    saveEntries(remaining);
    entries.length = 0;
    entries.push(...remaining);
    render();
    closeModal();
  });

  render();
};

initThemeToggle();
initTodayPage();
renderMonthPage();
