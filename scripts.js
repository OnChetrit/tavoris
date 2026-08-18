const STORAGE_KEY = "work-hours-entries";
const THEME_KEY = "work-hours-theme";
const SHORTCUTS_KEY = "work-hours-shortcuts";
const DEFAULT_SHORTCUTS = [
  { id: "default-0800-1700", start: "08:00", end: "17:00" },
  { id: "default-0900-1800", start: "09:00", end: "18:00" },
  { id: "default-0830-1630", start: "08:30", end: "16:30" },
];

const byId = (id) => document.getElementById(id);

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = byId("theme-toggle");
  if (toggle) {
    const nextTheme = theme === "dark" ? "בהיר" : "כהה";
    toggle.innerHTML = `<span aria-hidden="true">${theme === "dark" ? "☀️" : "🌙"}</span>`;
    toggle.setAttribute("aria-label", `מעבר למצב ${nextTheme}`);
    toggle.title = `מעבר למצב ${nextTheme}`;
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
  if (!isValidTime(start) || !isValidTime(end)) {
    return 0;
  }
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff / 60 : 0;
};

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const normalizeTimeString = (value) => {
  const digits = String(value).replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
};

const formatHours = (hours) => {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${wholeHours}:${String(minutes).padStart(2, "0")} שעות` : `${wholeHours} שעות`;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getLocalDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const loadEntries = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveEntries = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const loadShortcuts = () => {
  const stored = localStorage.getItem(SHORTCUTS_KEY);
  if (!stored) return [...DEFAULT_SHORTCUTS];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DEFAULT_SHORTCUTS];
    return parsed.filter(
      (shortcut) =>
        shortcut &&
        typeof shortcut.id === "string" &&
        isValidTime(shortcut.start) &&
        isValidTime(shortcut.end) &&
        toHours(shortcut.start, shortcut.end) > 0
    );
  } catch {
    return [...DEFAULT_SHORTCUTS];
  }
};

const saveShortcuts = (shortcuts) => {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
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
    empty.className = "list-item empty-state";
    empty.textContent = "אין עדיין רישומים. הדיווח הראשון שלך יופיע כאן.";
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
        <strong class="entry-date">${escapeHtml(formatDisplayDate(entry.date))}</strong>
        <span class="entry-time">${escapeHtml(entry.start)} → ${escapeHtml(entry.end)}</span>
        <span class="entry-location">${escapeHtml(entry.location || "ללא מיקום")}</span>
        <span class="entry-hours">${formatHours(entry.hours)}</span>
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
  summary.textContent = `✓ נשמרו ${formatHours(entry.hours)} בתאריך ${formatDisplayDate(entry.date)}.`;
};

const updateTodayDate = () => {
  const target = byId("today-date");
  if (!target) return;
  target.textContent = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
};

const initTodayPage = () => {
  const form = byId("today-form");
  if (!form) return;

  const dateInput = byId("work-date");
  const saveButton = byId("save-button");
  const startInput = byId("start-time");
  const endInput = byId("end-time");
  const startTimePicker = byId("start-time-picker");
  const endTimePicker = byId("end-time-picker");
  const durationPreview = byId("duration-preview");
  const shortcutsContainer = byId("quick-times-options");
  const manageShortcutsButton = byId("manage-shortcuts");
  const shortcutsModal = byId("shortcuts-modal");
  const shortcutsClose = byId("shortcuts-close");
  const shortcutsList = byId("shortcuts-list");
  const shortcutForm = byId("shortcut-form");
  const shortcutStart = byId("shortcut-start");
  const shortcutEnd = byId("shortcut-end");
  const shortcutFormMessage = byId("shortcut-form-message");
  const today = getLocalDateValue();
  dateInput.value = today;
  dateInput.max = today;

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

    form.scrollIntoView({ behavior: "smooth", block: "start" });
    startInput?.focus();
  });

  const updateSaveState = () => {
    if (!saveButton) return;
    const start = startInput?.value || "";
    const end = endInput?.value || "";
    const hours = start && end ? toHours(start, end) : 0;
    saveButton.disabled = hours <= 0;
    if (durationPreview) {
      durationPreview.hidden = hours <= 0;
      durationPreview.textContent = hours > 0 ? formatHours(hours) : "";
    }
  };

  const formatManualTime = (input) => {
    input.value = normalizeTimeString(input.value);
    const complete = isValidTime(input.value);
    input.setCustomValidity(
      input.value && !complete ? "יש להזין שעה בפורמט 08:00" : ""
    );
  };

  const handleTimeInput = (event) => {
    formatManualTime(event.currentTarget);
    updateSaveState();
  };

  [startInput, endInput].forEach((input) => {
    input?.addEventListener("input", handleTimeInput);
    input?.addEventListener("blur", () => formatManualTime(input));
  });

  [[startTimePicker, startInput], [endTimePicker, endInput]].forEach(
    ([picker, input]) => {
      picker?.addEventListener("input", () => {
        input.value = picker.value;
        formatManualTime(input);
        updateSaveState();
      });
    }
  );

  let shortcuts = loadShortcuts();
  const renderShortcuts = () => {
    if (!shortcutsContainer) return;
    shortcutsContainer.innerHTML = "";

    if (shortcuts.length === 0) {
      const empty = document.createElement("span");
      empty.className = "shortcuts-empty";
      empty.textContent = "אין קיצורים עדיין — אפשר להוסיף דרך ניהול.";
      shortcutsContainer.appendChild(empty);
      return;
    }

    shortcuts.forEach((shortcut) => {
      const button = document.createElement("button");
      button.className = "time-preset";
      button.type = "button";
      button.dataset.shortcutId = shortcut.id;
      button.dataset.start = shortcut.start;
      button.dataset.end = shortcut.end;
      button.innerHTML = `<span>${shortcut.start}–${shortcut.end}</span><small>${formatHours(toHours(shortcut.start, shortcut.end))}</small>`;
      shortcutsContainer.appendChild(button);
    });
  };

  const renderShortcutsManager = () => {
    if (!shortcutsList) return;
    shortcutsList.innerHTML = "";
    if (shortcuts.length === 0) {
      const empty = document.createElement("li");
      empty.className = "shortcuts-manager-empty";
      empty.textContent = "עדיין לא הוספתם קיצורי דרך.";
      shortcutsList.appendChild(empty);
      return;
    }

    shortcuts.forEach((shortcut) => {
      const item = document.createElement("li");
      item.className = "shortcut-manager-item";
      item.innerHTML = `<span><strong>${shortcut.start}–${shortcut.end}</strong><small>${formatHours(toHours(shortcut.start, shortcut.end))}</small></span>`;
      const removeButton = document.createElement("button");
      removeButton.className = "shortcut-remove";
      removeButton.type = "button";
      removeButton.dataset.shortcutId = shortcut.id;
      removeButton.setAttribute("aria-label", `הסרת קיצור ${shortcut.start} עד ${shortcut.end}`);
      removeButton.textContent = "הסרה";
      item.appendChild(removeButton);
      shortcutsList.appendChild(item);
    });
  };

  const closeShortcutsModal = () => {
    if (shortcutsModal) shortcutsModal.hidden = true;
  };

  shortcutsContainer?.addEventListener("click", (event) => {
    const button = event.target.closest(".time-preset");
    if (!button) return;
    startInput.value = button.dataset.start || "";
    endInput.value = button.dataset.end || "";
    shortcutsContainer.querySelectorAll(".time-preset").forEach((preset) =>
      preset.classList.toggle("is-selected", preset === button)
    );
    updateSaveState();
    endInput.focus();
  });

  manageShortcutsButton?.addEventListener("click", () => {
    renderShortcutsManager();
    if (shortcutFormMessage) shortcutFormMessage.textContent = "";
    if (shortcutsModal) shortcutsModal.hidden = false;
    shortcutStart?.focus();
  });

  shortcutsClose?.addEventListener("click", closeShortcutsModal);
  shortcutsModal?.addEventListener("click", (event) => {
    if (event.target?.dataset?.shortcutsClose) closeShortcutsModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !shortcutsModal?.hidden) {
      closeShortcutsModal();
      manageShortcutsButton?.focus();
    }
  });

  [shortcutStart, shortcutEnd].forEach((input) => {
    input?.addEventListener("input", () => {
      input.value = normalizeTimeString(input.value);
      input.setCustomValidity(
        input.value && !isValidTime(input.value) ? "יש להזין שעה בפורמט 08:00" : ""
      );
    });
  });

  shortcutsList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".shortcut-remove");
    if (!removeButton) return;
    shortcuts = shortcuts.filter(
      (shortcut) => shortcut.id !== removeButton.dataset.shortcutId
    );
    saveShortcuts(shortcuts);
    renderShortcuts();
    renderShortcutsManager();
  });

  shortcutForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const start = shortcutStart?.value || "";
    const end = shortcutEnd?.value || "";
    const duplicate = shortcuts.some(
      (shortcut) => shortcut.start === start && shortcut.end === end
    );
    if (!isValidTime(start) || !isValidTime(end) || toHours(start, end) <= 0) {
      if (shortcutFormMessage) shortcutFormMessage.textContent = "בחרו שעות תקינות, כששעת הסיום אחרי שעת ההתחלה.";
      return;
    }
    if (duplicate) {
      if (shortcutFormMessage) shortcutFormMessage.textContent = "הקיצור הזה כבר קיים.";
      return;
    }
    shortcuts.push({ id: crypto.randomUUID(), start, end });
    shortcuts.sort((a, b) => a.start.localeCompare(b.start));
    saveShortcuts(shortcuts);
    renderShortcuts();
    renderShortcutsManager();
    shortcutForm.reset();
    if (shortcutFormMessage) shortcutFormMessage.textContent = "הקיצור נוסף בהצלחה.";
    shortcutStart?.focus();
  });

  renderShortcuts();
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
    updateQuickRecordButton();
    form.reset();
    dateInput.value = today;
    shortcutsContainer?.querySelectorAll(".time-preset").forEach((preset) =>
      preset.classList.remove("is-selected")
    );

    if (saveButton) {
      saveButton.classList.remove("is-loading");
      saveButton.textContent = "שמירה";
    }
    updateSaveState();
  });
};

const formatMonth = (date) => getLocalDateValue(date).slice(0, 7);

const renderMonthPage = () => {
  const monthPicker = byId("month-picker");
  if (!monthPicker) return;

  const rows = byId("month-rows");
  const totalEl = byId("month-total");
  const countEl = byId("month-count");
  const avgEl = byId("month-average");
  const progressLabel = byId("month-progress-label");
  const progressBar = byId("month-progress-bar");
  const progressTrack = document.querySelector(".progress-track");
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
            <td data-label="תאריך">${escapeHtml(formatDisplayDate(entry.date))}</td>
            <td data-label="שעות">${escapeHtml(entry.start)} - ${escapeHtml(entry.end)}</td>
            <td data-label="סה״כ">${formatHours(entry.hours)}</td>
            <td data-label="מיקום">${escapeHtml(entry.location || "ללא מיקום")}</td>
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

    const monthlyTarget = 182;
    const percent = Math.min((total / monthlyTarget) * 100, 100);
    if (progressLabel) {
      progressLabel.textContent = `${total.toFixed(1)} מתוך ${monthlyTarget} שעות`;
    }
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(Math.round(total)));
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

const QUICK_RECORD_KEY = "work-hours-quick-record";

const getQuickRecord = () => {
  const stored = localStorage.getItem(QUICK_RECORD_KEY);
  return stored ? JSON.parse(stored) : null;
};

const saveQuickRecord = (record) => {
  if (record) {
    localStorage.setItem(QUICK_RECORD_KEY, JSON.stringify(record));
  } else {
    localStorage.removeItem(QUICK_RECORD_KEY);
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatElapsedTime = (startTimestamp) => {
  const now = Date.now();
  const elapsed = now - startTimestamp;
  const totalMinutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

let timerInterval = null;

const updateQuickRecordButton = () => {
  const quickBtn = byId("quick-record-btn");
  const timerDisplay = byId("quick-record-timer");
  const container = document.querySelector(".quick-record-container");

  if (!quickBtn) return;

  const today = getLocalDateValue();
  const record = getQuickRecord();
  // Clear any existing timer interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Keep the one-tap timer available even after a same-day report.
  if (container) container.style.display = "flex";

  // Check if record is for today
  if (record && record.date !== today) {
    // Clear old record from previous day
    saveQuickRecord(null);
    quickBtn.textContent = "התחל";
    quickBtn.className = "quick-record-btn state-start";
    if (timerDisplay) timerDisplay.hidden = true;
    return;
  }

  if (record && record.startTime && !record.endTime) {
    // Recording in progress
    quickBtn.textContent = "סיום";
    quickBtn.className = "quick-record-btn state-end";

    // Show and update timer
    if (timerDisplay) {
      timerDisplay.hidden = false;
      const updateTimer = () => {
        timerDisplay.textContent = formatElapsedTime(record.startTimestamp);
      };
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000); // Update every second
    }
  } else {
    // No active recording
    quickBtn.textContent = "התחל";
    quickBtn.className = "quick-record-btn state-start";
    if (timerDisplay) timerDisplay.hidden = true;
  }
};

const initQuickRecord = () => {
  const quickBtn = byId("quick-record-btn");
  const quickModal = byId("quick-record-modal");
  const quickInfo = byId("quick-record-info");
  const modalClose = byId("quick-modal-close");

  if (!quickBtn) return;

  const today = getLocalDateValue();

  const showModal = (message) => {
    if (quickInfo) {
      quickInfo.innerHTML = message;
    }
    if (quickModal) {
      quickModal.hidden = false;
    }
  };

  const closeModal = () => {
    if (quickModal) {
      quickModal.hidden = true;
    }
  };

  const handleQuickRecord = () => {
    const now = Date.now();
    const record = getQuickRecord();

    if (!record || record.date !== today || record.endTime) {
      // Start new recording
      const startTime = formatTime(now);
      saveQuickRecord({
        date: today,
        startTime,
        startTimestamp: now,
        endTime: null,
        endTimestamp: null
      });

      showModal(`
        <div class="time-display">${startTime}</div>
        <div class="status-text">⏱️ התחלת משמרת בהצלחה</div>
      `);

      setTimeout(closeModal, 2000);
      updateQuickRecordButton();
    } else if (record.startTime && !record.endTime) {
      // End recording
      const endTime = formatTime(now);
      record.endTime = endTime;
      record.endTimestamp = now;

      // Calculate hours
      const hours = toHours(record.startTime, endTime);

      // Save to entries
      const entries = loadEntries();
      const entry = {
        id: crypto.randomUUID(),
        date: today,
        start: record.startTime,
        end: endTime,
        location: "",
        hours,
      };

      const updated = entries.filter((existing) => existing.date !== today);
      updated.push(entry);
      saveEntries(updated);

      // Clear quick record
      saveQuickRecord(null);

      showModal(`
        <div class="time-display">${hours.toFixed(2)} שעות</div>
        <div class="status-text">✅ המשמרת נשמרה בהצלחה</div>
        <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--muted);">${record.startTime} - ${endTime}</div>
      `);

      // Auto-close modal after recording end
      setTimeout(() => {
        closeModal();
        // Refresh the page data
        const refreshedEntries = loadEntries();
        renderRecentEntries(refreshedEntries);
        updateTodayStatus(refreshedEntries, today);
      }, 2500);

      updateQuickRecordButton();
    }
  };

  quickBtn.addEventListener("click", handleQuickRecord);

  modalClose?.addEventListener("click", closeModal);

  quickModal?.addEventListener("click", (event) => {
    if (event.target === quickModal || event.target.classList.contains('modal-backdrop')) {
      closeModal();
    }
  });

  // Initialize button state
  updateQuickRecordButton();
};

initThemeToggle();
updateTodayDate();
initTodayPage();
renderMonthPage();
initQuickRecord();
