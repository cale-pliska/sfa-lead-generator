const STORAGE_KEYS =
  (typeof window !== "undefined" && window.VALIDATE_EMAILS_STORAGE_KEYS) || {
    tsv: "validate_emails_step1_tsv",
    dataset: "validate_emails_step1_dataset",
    summary: "validate_emails_step2_summary",
    status: "validate_emails_step2_status",
    selectedColumn: "validate_emails_step2_selected_column",
  };

function getStoredSelectedColumn() {
  const value = localStorage.getItem(STORAGE_KEYS.selectedColumn);
  return typeof value === "string" && value.length ? value : null;
}

function storeSelectedColumn(column) {
  if (column) {
    localStorage.setItem(STORAGE_KEYS.selectedColumn, column);
  } else {
    localStorage.removeItem(STORAGE_KEYS.selectedColumn);
  }
}

function saveValidationSummary(summary) {
  if (!summary) {
    localStorage.removeItem(STORAGE_KEYS.summary);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.summary, JSON.stringify(summary));
  } catch (err) {
    console.error("Failed to persist validation summary", err);
  }
}

function loadValidationSummary() {
  const raw = localStorage.getItem(STORAGE_KEYS.summary);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse saved validation summary", err);
    localStorage.removeItem(STORAGE_KEYS.summary);
    return null;
  }
}

function setValidationStatus(message) {
  const $status = $("#validation-status");
  if (message) {
    $status.text(message);
    localStorage.setItem(STORAGE_KEYS.status, message);
  } else {
    $status.empty();
    localStorage.removeItem(STORAGE_KEYS.status);
  }
}

function loadValidationStatus() {
  return localStorage.getItem(STORAGE_KEYS.status) || "";
}

let selectedEmailColumn = getStoredSelectedColumn();

function updateEmailColumnControls(state) {
  const columns = state && Array.isArray(state.columns) ? state.columns : [];
  const hasData = state && Array.isArray(state.data) && state.data.length > 0;

  const $selectorContainer = $("#email-column-selector");
  const $selector = $("#email-column");
  const $usingColumn = $("#using-email-column");
  const $validateButton = $("#validate-emails-btn");

  if (!hasData) {
    selectedEmailColumn = null;
    storeSelectedColumn(null);
    $selectorContainer.addClass("hidden");
    $usingColumn.addClass("hidden").text("");
    $validateButton.prop("disabled", true);
    setValidationStatus("");
    renderValidationSummary(null);
    return;
  }

  $selector.empty();
  columns.forEach((column) => {
    $selector.append(
      $("<option></option>").attr("value", column).text(column)
    );
  });

  const emailMatch = columns.find((column) => column.toLowerCase() === "email");
  const storedSelection = getStoredSelectedColumn();

  let resolvedColumn = null;

  if (storedSelection && columns.includes(storedSelection)) {
    resolvedColumn = storedSelection;
  } else if (selectedEmailColumn && columns.includes(selectedEmailColumn)) {
    resolvedColumn = selectedEmailColumn;
  } else if (emailMatch) {
    resolvedColumn = emailMatch;
  } else {
    resolvedColumn = columns[0] || null;
  }

  selectedEmailColumn = resolvedColumn;

  if (selectedEmailColumn) {
    storeSelectedColumn(selectedEmailColumn);
  } else {
    storeSelectedColumn(null);
  }

  if (emailMatch && selectedEmailColumn === emailMatch) {
    $selector.val(emailMatch);
    $selectorContainer.addClass("hidden");
    $usingColumn
      .removeClass("hidden")
      .text(`Using column: ${selectedEmailColumn}`);
  } else {
    if (selectedEmailColumn) {
      $selector.val(selectedEmailColumn);
    }
    $selectorContainer.removeClass("hidden");
    $usingColumn.addClass("hidden").text("");
  }

  $validateButton.prop("disabled", !selectedEmailColumn);

  const savedSummary = loadValidationSummary();
  if (savedSummary) {
    renderValidationSummary(savedSummary);
  } else {
    renderValidationSummary(null);
  }

  const savedStatus = loadValidationStatus();
  if (savedStatus) {
    setValidationStatus(savedStatus);
  } else {
    setValidationStatus("");
  }
}

function renderValidationSummary(summary) {
  if (!summary) {
    $("#validation-summary").addClass("hidden").empty();
    saveValidationSummary(null);
    return;
  }

  const statusEntries = Object.entries(summary.status_counts || {});
  const validityEntries = Object.entries(summary.validity_counts || {});

  let html = "<h3>Validation Summary</h3>";
  const hasOverallTotal =
    typeof summary.overall_total === "number" &&
    summary.overall_total >= summary.total;
  const totalLabel = hasOverallTotal
    ? `${summary.total} of ${summary.overall_total}`
    : summary.total;
  html += `<p><strong>Total processed:</strong> ${totalLabel}</p>`;
  if (statusEntries.length) {
    html += "<p><strong>Status breakdown:</strong></p><ul>";
    statusEntries.forEach(([status, count]) => {
      html += `<li>${status}: ${count}</li>`;
    });
    html += "</ul>";
  }
  if (validityEntries.length) {
    html += "<p><strong>Validity breakdown:</strong></p><ul>";
    validityEntries.forEach(([key, count]) => {
      html += `<li>${key}: ${count}</li>`;
    });
    html += "</ul>";
  }
  if (summary.selected_column) {
    html += `<p><strong>Email column:</strong> ${summary.selected_column}</p>`;
  }

  $("#validation-summary").removeClass("hidden").html(html);
  saveValidationSummary(summary);
}

$(document).on("validateEmails:dataLoaded", function (_event, state) {
  updateEmailColumnControls(state || {});
});

$("#email-column").on("change", function () {
  selectedEmailColumn = $(this).val();
  $("#validate-emails-btn").prop("disabled", !selectedEmailColumn);
  if (selectedEmailColumn) {
    storeSelectedColumn(selectedEmailColumn);
  } else {
    storeSelectedColumn(null);
  }
});

$("#validate-emails-btn").on("click", async function () {
  if (!selectedEmailColumn) {
    setValidationStatus("Please select the column that contains email addresses.");
    return;
  }

  const state = window.validateEmailsState || {};
  const rows = Array.isArray(state.data) ? state.data : [];
  if (!rows.length) {
    setValidationStatus("No data available for validation.");
    return;
  }

  const $button = $(this);
  const batchSize = 10;
  const totalRows = rows.length;
  let resetFlag = true;
  let hasError = false;
  let lastSummary = null;
  const setProcessingState =
    typeof window.setValidationProcessingState === "function"
      ? window.setValidationProcessingState
      : null;

  $button.prop("disabled", true).text("Validating…");
  setValidationStatus("Starting validation…");

  for (let start = 0; start < totalRows; start += batchSize) {
    const stop = Math.min(start + batchSize, totalRows);

    if (setProcessingState) {
      setProcessingState(start, stop, true);
    }

    setValidationStatus(`Validating rows ${start + 1}-${stop} of ${totalRows}…`);

    try {
      const response = await $.ajax({
        url: "/validate_emails/validate",
        method: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          column: selectedEmailColumn,
          start,
          stop,
          reset: resetFlag,
        }),
      });

      resetFlag = false;

      if (response && response.batch && Array.isArray(response.batch.records)) {
        window.handleValidateEmailsDataLoaded(response.batch.records, {
          merge: true,
        });
      } else if (response && response.records) {
        window.handleValidateEmailsDataLoaded(response.records);
      }

      if (setProcessingState) {
        setProcessingState(start, stop, false);
      }

      if (response && response.summary) {
        lastSummary = response.summary;
        renderValidationSummary(response.summary);
      }

      if (response && response.progress) {
        const processed = response.progress.processed || stop;
        const total = response.progress.total || totalRows;
        const completed = Boolean(response.progress.completed);
        const statusMessage = completed
          ? "Validation completed."
          : `Validated ${processed} of ${total} email addresses…`;
        setValidationStatus(statusMessage);
      } else {
        setValidationStatus(
          `Validated rows ${start + 1}-${stop} of ${totalRows}…`
        );
      }
    } catch (xhr) {
      hasError = true;
      let message = "Failed to validate email addresses.";
      let responseJson = xhr && xhr.responseJSON ? xhr.responseJSON : null;

      if (setProcessingState) {
        setProcessingState(start, stop, false);
      }

      if (!responseJson && xhr && xhr.responseText) {
        try {
          responseJson = JSON.parse(xhr.responseText);
        } catch (err) {
          responseJson = null;
        }
      }

      if (responseJson && responseJson.error) {
        message = responseJson.error;
      }
      setValidationStatus(message);

      if (responseJson && Array.isArray(responseJson.columns)) {
        updateEmailColumnControls({
          columns: responseJson.columns,
          data:
            window.validateEmailsState && window.validateEmailsState.data
              ? window.validateEmailsState.data
              : [],
        });
      }

      break;
    }
  }

  if (!hasError && lastSummary) {
    renderValidationSummary(lastSummary);
    setValidationStatus("Validation completed.");
  }

  $button.prop("disabled", !selectedEmailColumn).text("Validate Emails");
});

$(document).ready(function () {
  const savedSummary = loadValidationSummary();
  if (savedSummary) {
    renderValidationSummary(savedSummary);
  } else {
    renderValidationSummary(null);
  }

  const savedStatus = loadValidationStatus();
  if (savedStatus) {
    setValidationStatus(savedStatus);
  } else {
    setValidationStatus("");
  }
});
