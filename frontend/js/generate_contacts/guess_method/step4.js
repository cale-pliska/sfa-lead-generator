(function () {
  const STEP2_RESULTS_KEY = "generate_contacts_guess_step2_results";
  const CONTACTS_STORAGE_KEY = "generate_contacts_guess_step4_contacts";
  const TABLE_SELECTOR = "#guess-step4-results-table";

  let parsedContacts = [];

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

  function buildContactRows() {
    const results = ensureStep2Results();
    const indexes = Object.keys(results).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });

    const contacts = [];

    indexes.forEach(function (idx) {
      const row = results[idx] || {};
      const baseData = cloneRow(row);
      const rawContacts = baseData.raw_contacts;
      const contactEntries = ensureArray(parseRawContacts(rawContacts));

      if (!contactEntries.length) {
        const fallback = cloneRow(baseData);
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
        const current = cloneRow(baseData);
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

    return contacts;
  }

  function collectColumns(rows) {
    const preferredOrder = [
      "index",
      "business_name",
      "website",
      "raw_public_emails",
      "email_domain",
      "raw_contacts",
      "contact_position",
      "first_name",
      "last_name",
      "role",
      "parse_status",
      "additional_contact_data",
    ];

    const columns = new Set();
    rows.forEach(function (row) {
      Object.keys(row).forEach(function (key) {
        columns.add(key);
      });
    });

    const ordered = [];
    preferredOrder.forEach(function (key) {
      if (columns.has(key)) {
        ordered.push(key);
        columns.delete(key);
      }
    });

    Array.from(columns)
      .sort()
      .forEach(function (key) {
        ordered.push(key);
      });

    return ordered;
  }

  function renderContactsTable(rows) {
    if (!rows.length) {
      $("#guess-step4-container").html("No contacts available");
      return;
    }

    const columns = collectColumns(rows);

    let html = '<table id="guess-step4-results-table"><thead><tr>';
    columns.forEach(function (col) {
      html += "<th>" + col + "</th>";
    });
    html += "</tr></thead><tbody>";

    rows.forEach(function (row) {
      html += "<tr>";
      columns.forEach(function (col) {
        const value = row[col];
        html += "<td>" + (value !== undefined ? value : "") + "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    $("#guess-step4-container").html(html);
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
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(rows));
  }

  function loadStoredContacts() {
    const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (saved) {
      try {
        parsedContacts = JSON.parse(saved);
        window.guessStep4Contacts = parsedContacts;
        renderContactsTable(parsedContacts);
      } catch (err) {
        console.error("Unable to load stored Step 4 contacts", err);
      }
    }
  }

  $("#guess-create-contacts-btn").on("click", function () {
    const contacts = buildContactRows();
    parsedContacts = contacts;
    renderContactsTable(parsedContacts);
    storeContacts(parsedContacts);
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
