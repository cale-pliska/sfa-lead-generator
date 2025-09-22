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
  html += `<p><strong>Total processed:</strong> ${summary.total}</p>`;
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

$("#validate-emails-btn").on("click", function () {
  if (!selectedEmailColumn) {
    $("#validation-status").text(
      "Please select the column that contains email addresses."
    );
    return;
  }

  const $button = $(this);
  $button.prop("disabled", true).text("Validating…");
  $("#validation-status").text("Validating email addresses…");

  $.ajax({
    url: "/validate_emails/validate",
    method: "POST",
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify({ column: selectedEmailColumn }),
    success: function (response) {
      if (response && response.records) {
        window.handleValidateEmailsDataLoaded(response.records);
      }
      if (response && response.summary) {
        renderValidationSummary(response.summary);
      }
      $("#validation-status").text("Validation completed.");
    },
    error: function (xhr) {
      let message = "Failed to validate email addresses.";
      let responseJson = xhr.responseJSON;
      if (!responseJson && xhr.responseText) {
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
    },
    complete: function () {
      $button.prop("disabled", !selectedEmailColumn).text("Validate Emails");
    },
  });
});
