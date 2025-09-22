const VALIDATE_EMAILS_STORAGE_KEYS = {
  tsv: "validate_emails_step1_tsv",
};

const validateEmailsState = {
  data: [],
  columns: [],
};

function renderValidateEmailsTable(data) {
  if (!data || !data.length) {
    $("#table-container").html("No rows");
    return;
  }

  let html = "<table><thead><tr><th>index</th>";
  Object.keys(data[0]).forEach((column) => {
    html += `<th>${column}</th>`;
  });
  html += "</tr></thead><tbody>";

  data.forEach((row, index) => {
    html += `<tr><td>${index}</td>`;
    Object.values(row).forEach((value) => {
      const cellValue = value === null || value === undefined ? "" : value;
      html += `<td>${cellValue}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  $("#table-container").html(html);
}

function handleValidateEmailsDataLoaded(data) {
  validateEmailsState.data = Array.isArray(data) ? data : [];
  validateEmailsState.columns = validateEmailsState.data.length
    ? Object.keys(validateEmailsState.data[0])
    : [];

  renderValidateEmailsTable(validateEmailsState.data);
  $(document).trigger("validateEmails:dataLoaded", [validateEmailsState]);
}

function saveStep1State() {
  localStorage.setItem(
    VALIDATE_EMAILS_STORAGE_KEYS.tsv,
    $("#tsv-input").val()
  );
}

function autoPopulateFromSaved() {
  const savedTsv =
    localStorage.getItem(VALIDATE_EMAILS_STORAGE_KEYS.tsv) || "";
  if (!savedTsv) {
    return;
  }

  $("#tsv-input").val(savedTsv);

  const formData = new FormData();
  formData.append("tsv_text", savedTsv);

  $.ajax({
    url: "/validate_emails/upload",
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (response) {
      const parsed = JSON.parse(response);
      handleValidateEmailsDataLoaded(parsed);
    },
    error: function (xhr) {
      console.error(xhr.responseText || "Failed to load saved data.");
    },
  });
}

$(document).ready(function () {
  autoPopulateFromSaved();

  $("#tsv-input").on("input", function () {
    saveStep1State();
  });

  $("#upload-form").on("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(this);

    $.ajax({
      url: "/validate_emails/upload",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        const parsed = JSON.parse(response);
        handleValidateEmailsDataLoaded(parsed);
        saveStep1State();
      },
      error: function (xhr) {
        alert(xhr.responseText || "Failed to load data.");
      },
    });
  });

  $("#clear-step1").on("click", function () {
    $("#tsv-input").val("");
    $("#table-container").empty();
    localStorage.removeItem(VALIDATE_EMAILS_STORAGE_KEYS.tsv);
    handleValidateEmailsDataLoaded([]);
  });
});

window.validateEmailsState = validateEmailsState;
window.handleValidateEmailsDataLoaded = handleValidateEmailsDataLoaded;
window.renderValidateEmailsTable = renderValidateEmailsTable;
