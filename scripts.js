const STORAGE_KEY = "work-hours-entries";

const byId = (id) => document.getElementById(id);

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
      item.innerHTML = `
        <strong>${entry.date}</strong>
        <span>${entry.start} → ${entry.end}</span>
        <span>${entry.location}</span>
        <span>${entry.hours.toFixed(2)} שעות</span>
      `;
      list.appendChild(item);
    });
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
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;

  const entries = loadEntries();
  renderRecentEntries(entries);

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

    const entry = {
      id: crypto.randomUUID(),
      date,
      start,
      end,
      location,
      hours,
    };

    const updated = [...entries, entry];
    saveEntries(updated);
    updateTodaySummary(entry);
    renderRecentEntries(updated);
    form.reset();
    dateInput.value = today;
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
            <td data-label="תאריך">${entry.date}</td>
            <td data-label="התחלה">${entry.start}</td>
            <td data-label="סיום">${entry.end}</td>
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

  clearButton.addEventListener("click", () => {
    const selected = monthPicker.value;
    const remaining = entries.filter(
      (entry) => !entry.date.startsWith(selected)
    );
    saveEntries(remaining);
    entries.length = 0;
    entries.push(...remaining);
    render();
  });

  render();
};

initTodayPage();
renderMonthPage();
