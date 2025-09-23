let selectedEmailColumn = null;

const VALIDATION_RESULTS_COLUMN = "validation_results";
const FINAL_RESULTS_DEFAULT_COLUMNS = [
  "company",
  "fname",
  "lname",
  "role",
  "email",
  "location",
  "website",
];

let finalResultsSelectedColumns = new Set(FINAL_RESULTS_DEFAULT_COLUMNS);
let latestValidateEmailsState = null;

function updateEmailColumnControls(state) {
  const columns = state && Array.isArray(state.columns) ? state.columns : [];
  const hasData = state && Array.isArray(state.data) && state.data.length > 0;

  const $selectorContainer = $("#email-column-selector");
  const $selector = $("#email-column");
  const $usingColumn = $("#using-email-column");
  const $validateButton = $("#validate-emails-btn");
  const $status = $("#validation-status");
  const $summary = $("#validation-summary");

  if (!hasData) {
    selectedEmailColumn = null;
    $selectorContainer.addClass("hidden");
    $usingColumn.addClass("hidden").text("");
    $validateButton.prop("disabled", true);
    $status.empty();
    $summary.addClass("hidden").empty();
    return;
  }

  $selector.empty();
  columns.forEach((column) => {
    $selector.append(
      $("<option></option>").attr("value", column).text(column)
    );
  });

  const emailMatch = columns.find((column) => column.toLowerCase() === "email");
  if (emailMatch) {
    selectedEmailColumn = emailMatch;
    $selector.val(emailMatch);
    $selectorContainer.addClass("hidden");
    $usingColumn
      .removeClass("hidden")
      .text(`Using column: ${selectedEmailColumn}`);
  } else {
    selectedEmailColumn = columns[0] || null;
    $selectorContainer.removeClass("hidden");
    $usingColumn.addClass("hidden").text("");
    if (selectedEmailColumn) {
      $selector.val(selectedEmailColumn);
    }
  }

  $validateButton.prop("disabled", !selectedEmailColumn);
  $status.empty();
}

function renderValidationSummary(summary) {
  if (!summary) {
    $("#validation-summary").addClass("hidden").empty();
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
}

function resetFinalResultsSelection(state) {
  const columns = state && Array.isArray(state.columns) ? state.columns : [];
  const defaults = FINAL_RESULTS_DEFAULT_COLUMNS.filter((column) =>
    columns.includes(column)
  );

  if (defaults.length) {
    finalResultsSelectedColumns = new Set(defaults);
  } else if (columns.length) {
    finalResultsSelectedColumns = new Set(columns);
  } else {
    finalResultsSelectedColumns = new Set(FINAL_RESULTS_DEFAULT_COLUMNS);
  }
}

function synchronizeFinalResultsSelection(columns) {
  const availableSet = new Set(columns);
  const preserved = [];

  finalResultsSelectedColumns.forEach((column) => {
    if (availableSet.has(column)) {
      preserved.push(column);
    }
  });

  if (!preserved.length) {
    const defaults = FINAL_RESULTS_DEFAULT_COLUMNS.filter((column) =>
      availableSet.has(column)
    );
    if (defaults.length) {
      preserved.push(...defaults);
    } else {
      preserved.push(...columns);
    }
  }

  finalResultsSelectedColumns = new Set(preserved);
}

function buildFinalResultsColumnControls(columns) {
  const $container = $("#final-results-columns");
  $container.empty();

  columns.forEach((column) => {
    const safeId = `final-results-column-${column
      .toString()
      .replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const isChecked = finalResultsSelectedColumns.has(column);
    const $checkbox = $("<input type=\"checkbox\" />")
      .attr("id", safeId)
      .attr("value", column)
      .prop("checked", isChecked)
      .on("change", function () {
        if ($(this).is(":checked")) {
          if (!finalResultsSelectedColumns.has(column)) {
            finalResultsSelectedColumns.add(column);
          }
        } else {
          finalResultsSelectedColumns.delete(column);
        }
        renderFinalResultsTable(latestValidateEmailsState);
      });

    const $label = $("<label class=\"final-results-column-toggle\"></label>")
      .attr("for", safeId)
      .append($checkbox)
      .append(document.createTextNode(` ${column}`));

    $container.append($label);
  });
}

function formatFinalResultsValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }
  return String(value);
}

function isRowVerified(row) {
  if (!row || typeof row !== "object") {
    return false;
  }

  if (row._validation_valid === true) {
    return true;
  }
  if (row._validation_valid === false) {
    return false;
  }

  const summary = row[VALIDATION_RESULTS_COLUMN];
  if (typeof summary === "string" && summary.includes("Validity: Valid")) {
    return true;
  }

  return false;
}

function renderFinalResultsTable(state) {
  const $tableContainer = $("#final-results-table");
  if (!$tableContainer.length) {
    return;
  }

  const selectedColumns = Array.from(finalResultsSelectedColumns);
  if (!selectedColumns.length) {
    $tableContainer.html("<p>Select at least one column to display.</p>");
    return;
  }

  const rows = state && Array.isArray(state.data) ? state.data : [];
  const verifiedRows = rows.filter((row) => isRowVerified(row));

  if (!verifiedRows.length) {
    $tableContainer.html("<p>No verified emails available yet.</p>");
    return;
  }

  let html = "<table><thead><tr>";
  selectedColumns.forEach((column) => {
    html += `<th>${column}</th>`;
  });
  html += "</tr></thead><tbody>";

  verifiedRows.forEach((row) => {
    html += "<tr>";
    selectedColumns.forEach((column) => {
      const cellValue = formatFinalResultsValue(row[column]);
      html += `<td>${cellValue}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  $tableContainer.html(html);
}

function updateFinalResultsSection(state) {
  const $section = $("#final-results");
  const $columnsContainer = $("#final-results-columns");
  const $tableContainer = $("#final-results-table");

  if (!$section.length || !$columnsContainer.length || !$tableContainer.length) {
    return;
  }

  latestValidateEmailsState = state || {};
  const columns =
    state && Array.isArray(state.columns) ? state.columns.slice() : [];
  const rows = state && Array.isArray(state.data) ? state.data : [];

  if (!columns.length || !rows.length) {
    $section.addClass("hidden");
    $columnsContainer.empty();
    $tableContainer.empty();
    return;
  }

  $section.removeClass("hidden");
  synchronizeFinalResultsSelection(columns);
  buildFinalResultsColumnControls(columns);
  renderFinalResultsTable(state);
}

$(document).on("validateEmails:dataLoaded", function (_event, state) {
  const safeState = state || {};
  updateEmailColumnControls(safeState);
  resetFinalResultsSelection(safeState);
  updateFinalResultsSection(safeState);
});

$(document).on("validateEmails:dataUpdated", function (_event, state) {
  updateFinalResultsSection(state || {});
});

$("#email-column").on("change", function () {
  selectedEmailColumn = $(this).val();
  $("#validate-emails-btn").prop("disabled", !selectedEmailColumn);
});

$("#validate-emails-btn").on("click", async function () {
  if (!selectedEmailColumn) {
    $("#validation-status").text(
      "Please select the column that contains email addresses."
    );
    return;
  }

  const state = window.validateEmailsState || {};
  const rows = Array.isArray(state.data) ? state.data : [];
  if (!rows.length) {
    $("#validation-status").text("No data available for validation.");
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
  $("#validation-status").text("Starting validation…");

  for (let start = 0; start < totalRows; start += batchSize) {
    const stop = Math.min(start + batchSize, totalRows);

    if (setProcessingState) {
      setProcessingState(start, stop, true);
    }

    $("#validation-status").text(
      `Validating rows ${start + 1}-${stop} of ${totalRows}…`
    );

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
        $("#validation-status").text(statusMessage);
      } else {
        $("#validation-status").text(
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
      $("#validation-status").text(message);

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
    $("#validation-status").text("Validation completed.");
  }

  $button.prop("disabled", !selectedEmailColumn).text("Validate Emails");
});
