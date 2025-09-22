(function () {
  const STEP2_RESULTS_KEY = "generate_contacts_guess_step2_results";
  const CONTACTS_STORAGE_KEY = "generate_contacts_guess_step4_contacts";
  const COLUMN_SELECTION_KEY = "generate_contacts_guess_step4_selected_columns";
  const TABLE_SELECTOR = "#guess-step4-results-table";
  const COLUMN_CONTROLS_WRAPPER = "#guess-step4-column-controls";
  const COLUMN_TOGGLE_CONTAINER = "#guess-step4-column-toggle";

  let parsedContacts = [];
  let availableColumns = [];
  let selectedColumns = [];
  let columnLabels = {};

  function ensureStep2Results() {
    if (window.guessStep2Results && typeof window.guessStep2Results === "object") {
      return window.guessStep2Results;
    }

    const saved = localStorage.getItem(STEP2_RESULTS_KEY);
    if (saved) {
      try {
        window.guessStep2Results = JSON.parse(saved);
        return window.guessStep2Results;
      } catch (err) {
        console.error("Unable to parse stored Step 2 results", err);
      }
    }

    window.guessStep2Results = {};
    return window.guessStep2Results;
  }

  function extractBracketedJson(text) {
    if (typeof text !== "string") {
      return null;
    }
    const match = text.match(/\[\s*\[[\s\S]*?\]\s*\]/);
    return match ? match[0] : null;
  }

  function parseRawContacts(raw) {
    if (!raw && raw !== 0) {
      return [];
    }

    if (Array.isArray(raw)) {
      return raw;
    }

    if (typeof raw === "object") {
      if (Array.isArray(raw.contacts)) {
        return raw.contacts;
      }
      return [];
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) {
        return [];
      }

      const bracketed = extractBracketedJson(trimmed) || trimmed;
      try {
        const parsed = JSON.parse(bracketed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        console.warn("Unable to parse raw contacts", err);
      }
    }

    return [];
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function cloneRow(row) {
    return row && typeof row === "object" ? { ...row } : {};
  }

  function matchesExact(expected) {
    const normalized = String(expected || "").toLowerCase();
    return function (column) {
      return String(column || "").toLowerCase() === normalized;
    };
  }

  function inferBusinessNameKey(obj) {
    if (!obj || typeof obj !== "object") {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, "business_name")) {
      return "business_name";
    }
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (key === "index") {
        continue;
      }
      const lower = key.toLowerCase();
      if (
        lower === "business name" ||
        lower === "business_name" ||
        (lower.includes("business") && lower.includes("name")) ||
        lower === "company name"
      ) {
        return key;
      }
    }
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (key === "index") {
        continue;
      }
      if (key.toLowerCase() === "name") {
        return key;
      }
    }
    return null;
  }

  function resolveBusinessNameColumn(rows, columns) {
    if (!Array.isArray(columns) || !columns.length) {
      return null;
    }
    if (columns.indexOf("business_name") !== -1) {
      return "business_name";
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const candidate = inferBusinessNameKey(row);
      if (candidate && columns.indexOf(candidate) !== -1) {
        return candidate;
      }
    }
    const fallback = columns.find(function (column) {
      const lower = String(column || "").toLowerCase();
      return lower.includes("business") && lower.includes("name");
    });
    return fallback || null;
  }

  function resolveDomainColumn(rows, columns) {
    if (!Array.isArray(columns) || !columns.length) {
      return null;
    }
    if (columns.indexOf("email_domain") !== -1) {
      return "email_domain";
    }
    const exactDomain = columns.find(function (column) {
      return String(column || "").toLowerCase() === "domain";
    });
    if (exactDomain) {
      return exactDomain;
    }
    const partial = columns.find(function (column) {
      return String(column || "").toLowerCase().includes("domain");
    });
    return partial || null;
  }

  function resolveWebsiteColumn(rows, columns) {
    if (!Array.isArray(columns) || !columns.length) {
      return null;
    }
    if (columns.indexOf("website") !== -1) {
      return "website";
    }
    const directMatch = columns.find(function (column) {
      const lower = String(column || "").toLowerCase();
      return (
        lower === "company_website" ||
        lower === "company website" ||
        lower === "site" ||
        lower === "url" ||
        lower.endsWith("website")
      );
    });
    if (directMatch) {
      return directMatch;
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || typeof row !== "object") {
        continue;
      }
      const keys = Object.keys(row);
      for (let j = 0; j < keys.length; j += 1) {
        const key = keys[j];
        if (String(key || "").toLowerCase() === "website") {
          return key;
        }
      }
    }
    return null;
  }

  function formatColumnLabel(column) {
    if (!column && column !== 0) {
      return "";
    }
    const words = String(column)
      .replace(/[_\s]+/g, " ")
      .trim();
    if (!words) {
      return String(column);
    }
    if (words.length <= 4 && words === words.toUpperCase()) {
      return words;
    }
    return words.replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  function orderColumns(columns, referenceOrder) {
    const ordered = [];
    referenceOrder.forEach(function (column) {
      if (columns.indexOf(column) !== -1) {
        ordered.push(column);
      }
    });
    columns.forEach(function (column) {
      if (referenceOrder.indexOf(column) === -1 && ordered.indexOf(column) === -1) {
        ordered.push(column);
      }
    });
    return ordered;
  }

  function findDefaultColumnMatches(rows, columns) {
    const matches = [];
    const used = new Set();
    DEFAULT_COLUMN_SPECS.forEach(function (spec) {
      let key = null;
      if (typeof spec.resolve === "function") {
        key = spec.resolve(rows, columns);
      }
      if (!key && typeof spec.match === "function") {
        key = columns.find(function (column) {
          if (used.has(column)) {
            return false;
          }
          return spec.match(column);
        });
      }
      if (key && columns.indexOf(key) !== -1 && !used.has(key)) {
        matches.push({ key: key, spec: spec });
        used.add(key);
      }
    });
    return matches;
  }

  function buildColumnLabels(columns, defaultMatches) {
    const labels = {};
    const overrides = {};
    (defaultMatches || []).forEach(function (match) {
      overrides[match.key] = match.spec.label;
    });
    columns.forEach(function (column) {
      if (Object.prototype.hasOwnProperty.call(overrides, column)) {
        labels[column] = overrides[column];
      } else {
        labels[column] = formatColumnLabel(column);
      }
    });
    return labels;
  }

  function loadStoredSelectedColumns() {
    const stored = localStorage.getItem(COLUMN_SELECTION_KEY);
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Unable to load Step 4 column selection", err);
      return [];
    }
  }

  function saveSelectedColumns() {
    if (!availableColumns.length) {
      return;
    }
    try {
      localStorage.setItem(COLUMN_SELECTION_KEY, JSON.stringify(selectedColumns));
    } catch (err) {
      console.error("Unable to store Step 4 column selection", err);
    }
  }

  function collectColumns(rows) {
    const columnSet = new Set();
    rows.forEach(function (row) {
      if (row && typeof row === "object") {
        Object.keys(row).forEach(function (key) {
          columnSet.add(key);
        });
      }
    });

    const preferred = [
      "business_name",
      "first_name",
      "last_name",
      "role",
      "email_domain",
      "domain",
      "website",
      "contact_position",
      "parse_status",
      "additional_contact_data",
      "index",
      "raw_public_emails",
      "raw_contacts",
    ];

    const ordered = [];
    preferred.forEach(function (key) {
      if (columnSet.has(key)) {
        ordered.push(key);
        columnSet.delete(key);
      }
    });

    Array.from(columnSet)
      .sort(function (a, b) {
        return String(a).localeCompare(String(b));
      })
      .forEach(function (key) {
        ordered.push(key);
      });

    return ordered;
  }

  function ensureCanonicalFields(row) {
    if (!row || typeof row !== "object") {
      return {};
    }
    const normalized = row;
    if (typeof normalized.business_name === "undefined") {
      const businessKey = inferBusinessNameKey(normalized);
      if (businessKey && typeof normalized[businessKey] !== "undefined") {
        normalized.business_name = normalized[businessKey];
      }
    }
    if (typeof normalized.website === "undefined") {
      const websiteKey = resolveWebsiteColumn([normalized], Object.keys(normalized));
      if (websiteKey && typeof normalized[websiteKey] !== "undefined") {
        normalized.website = normalized[websiteKey];
      }
    }
    return normalized;
  }

  function normalizeContacts(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map(function (row) {
      return ensureCanonicalFields(cloneRow(row));
    });
  }

  const DEFAULT_COLUMN_SPECS = [
    { id: "business_name", label: "Business Name", resolve: resolveBusinessNameColumn },
    { id: "first_name", label: "First Name", match: matchesExact("first_name") },
    { id: "last_name", label: "Last Name", match: matchesExact("last_name") },
    { id: "role", label: "Role", match: matchesExact("role") },
    { id: "domain", label: "Domain", resolve: resolveDomainColumn },
    { id: "website", label: "Website", resolve: resolveWebsiteColumn },
  ];

  function buildContactRows() {
    const results = ensureStep2Results();
    const indexes = Object.keys(results).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });

    const contacts = [];

    indexes.forEach(function (idx) {
      const row = results[idx] || {};
      const baseData = ensureCanonicalFields(cloneRow(row));
      const rawContacts = baseData.raw_contacts;
      const contactEntries = ensureArray(parseRawContacts(rawContacts));

      if (!contactEntries.length) {
        const fallback = ensureCanonicalFields(cloneRow(baseData));
        fallback.first_name = fallback.first_name || "";
        fallback.last_name = fallback.last_name || "";
        fallback.role = fallback.role || "";
        fallback.contact_position = 1;
        fallback.parse_status =
          typeof rawContacts === "string" && rawContacts.trim() !== ""
            ? rawContacts.trim()
            : "No contacts parsed";
        contacts.push(fallback);
        return;
      }

      contactEntries.forEach(function (entry, position) {
        const current = ensureCanonicalFields(cloneRow(baseData));
        if (Array.isArray(entry)) {
          current.first_name = entry[0] || "";
          current.last_name = entry[1] || "";
          current.role = entry[2] || "";
          if (entry.length > 3) {
            current.additional_contact_data = JSON.stringify(entry.slice(3));
          }
        } else if (entry && typeof entry === "object") {
          current.first_name = entry.first_name || entry.firstname || "";
          current.last_name = entry.last_name || entry.lastname || "";
          current.role = entry.role || entry.title || "";
          current.additional_contact_data = JSON.stringify(entry);
        } else {
          current.first_name = "";
          current.last_name = "";
          current.role = "";
          current.additional_contact_data = JSON.stringify(entry);
        }
        current.contact_position = position + 1;
        contacts.push(current);
      });
    });

    return normalizeContacts(contacts);
  }

  function updateAvailableColumns(rows) {
    const columns = collectColumns(rows);
    availableColumns = columns;
    if (!columns.length) {
      selectedColumns = [];
      columnLabels = {};
      return;
    }

    const defaultMatches = findDefaultColumnMatches(rows, columns);
    columnLabels = buildColumnLabels(columns, defaultMatches);

    const storedSelection = loadStoredSelectedColumns().filter(function (column) {
      return columns.indexOf(column) !== -1;
    });

    if (storedSelection.length) {
      selectedColumns = orderColumns(storedSelection, columns);
    } else {
      const defaults = defaultMatches.map(function (match) {
        return match.key;
      });
      selectedColumns =
        defaults.length > 0
          ? orderColumns(defaults, columns)
          : columns.slice(0, Math.min(columns.length, 6));
    }

    saveSelectedColumns();
  }

  function renderContactsTable(rows) {
    const container = $("#guess-step4-container");
    if (!selectedColumns.length) {
      container.html('<div class="guess-step4-empty">Select at least one column to view results.</div>');
      return;
    }

    let html = '<table id="guess-step4-results-table"><thead><tr>';
    selectedColumns.forEach(function (column) {
      const heading = columnLabels[column] || formatColumnLabel(column);
      html += "<th>" + heading + "</th>";
    });
    html += "</tr></thead><tbody>";

    rows.forEach(function (row) {
      html += "<tr>";
      selectedColumns.forEach(function (column) {
        const value = row[column];
        html += "<td>" + (value !== undefined && value !== null ? value : "") + "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.html(html);
  }

  function renderColumnControls() {
    const wrapper = $(COLUMN_CONTROLS_WRAPPER);
    const container = $(COLUMN_TOGGLE_CONTAINER);
    container.empty();

    if (!availableColumns.length) {
      wrapper.hide();
      return;
    }

    wrapper.css("display", "flex");

    availableColumns.forEach(function (column) {
      const isChecked = selectedColumns.indexOf(column) !== -1;
      const labelText = columnLabels[column] || formatColumnLabel(column);
      const safeId = "guess-step4-col-" + String(column).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();

      const $label = $("<label>").addClass("guess-step4-toggle");
      const $input = $("<input>")
        .attr("type", "checkbox")
        .attr("id", safeId)
        .attr("data-column", column)
        .prop("checked", isChecked);
      const $slider = $("<span>").addClass("guess-step4-toggle-slider").attr("aria-hidden", "true");
      const $text = $("<span>").addClass("guess-step4-toggle-label").text(labelText);

      $input.on("change", function () {
        handleColumnToggleChange(this);
      });

      $label.append($input, $slider, $text);
      container.append($label);
    });
  }

  function handleColumnToggleChange(input) {
    const column = $(input).attr("data-column");
    const isChecked = $(input).is(":checked");

    if (!column) {
      return;
    }

    if (isChecked) {
      if (selectedColumns.indexOf(column) === -1) {
        selectedColumns.push(column);
      }
    } else {
      selectedColumns = selectedColumns.filter(function (item) {
        return item !== column;
      });
    }

    selectedColumns = orderColumns(selectedColumns, availableColumns);
    saveSelectedColumns();
    renderContactsTable(parsedContacts);
  }

  function refreshContactsDisplay() {
    if (!Array.isArray(parsedContacts) || !parsedContacts.length) {
      availableColumns = [];
      selectedColumns = [];
      columnLabels = {};
      $(COLUMN_TOGGLE_CONTAINER).empty();
      $(COLUMN_CONTROLS_WRAPPER).hide();
      $("#guess-step4-container").html("No contacts available");
      return;
    }

    parsedContacts = normalizeContacts(parsedContacts);
    updateAvailableColumns(parsedContacts);
    renderColumnControls();
    renderContactsTable(parsedContacts);
  }

  function copyTableToClipboard(selector) {
    const table = $(selector);
    if (!table.length) {
      alert("No data to copy.");
      return;
    }

    const rows = [];
    table.find("tr").each(function () {
      const cols = [];
      $(this)
        .find("th,td")
        .each(function () {
          cols.push($(this).text());
        });
      rows.push(cols.join("\t"));
    });

    const tsv = rows.join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).catch(function () {
        fallbackCopy(tsv);
      });
    } else {
      fallbackCopy(tsv);
    }
  }

  function fallbackCopy(text) {
    const temp = $("<textarea>");
    $("body").append(temp);
    temp.val(text).select();
    document.execCommand("copy");
    temp.remove();
  }

  function storeContacts(rows) {
    window.guessStep4Contacts = rows;
    try {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(rows));
    } catch (err) {
      console.error("Unable to store Step 4 contacts", err);
    }
  }

  function loadStoredContacts() {
    const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsedContacts = normalizeContacts(parsed);
        window.guessStep4Contacts = parsedContacts;
      } catch (err) {
        console.error("Unable to load stored Step 4 contacts", err);
        parsedContacts = [];
      }
    }
    refreshContactsDisplay();
  }

  $("#guess-create-contacts-btn").on("click", function () {
    const contacts = buildContactRows();
    parsedContacts = contacts;
    storeContacts(parsedContacts);
    refreshContactsDisplay();
  });

  $("#guess-copy-step4-results").on("click", function () {
    copyTableToClipboard(TABLE_SELECTOR);
  });

  $(document).on("guessStep2ResultsUpdated", function (event, results) {
    if (results && typeof results === "object") {
      window.guessStep2Results = results;
    }
  });

  $(document).ready(function () {
    loadStoredContacts();
  });
})();
