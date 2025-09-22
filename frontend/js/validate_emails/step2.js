let selectedEmailColumn = null;

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

$(document).on("validateEmails:dataLoaded", function (_event, state) {
  updateEmailColumnControls(state || {});
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
  const batchSize = 20;
  const totalRows = rows.length;
  let resetFlag = true;
  let hasError = false;
  let lastSummary = null;

  $button.prop("disabled", true).text("Validating…");
  $("#validation-status").text("Starting validation…");

  for (let start = 0; start < totalRows; start += batchSize) {
    const stop = Math.min(start + batchSize, totalRows);

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
