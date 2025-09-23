const VALIDATE_EMAILS_STORAGE_KEYS = {
  tsv: "validate_emails_step1_tsv",
};

const VALIDATION_RESULTS_COLUMN = "validation_results";
const VALIDATION_PROCESSING_LABEL = "Processing…";

const HIDDEN_METADATA_PREFIX = "_";

function isHiddenMetadataKey(key) {
  return typeof key === "string" && key.startsWith(HIDDEN_METADATA_PREFIX);
}

const validateEmailsState = {
  data: [],
  columns: [],
  processing: new Set(),
};

function ensureValidationResultsColumn() {
  if (!validateEmailsState.columns.includes(VALIDATION_RESULTS_COLUMN)) {
    validateEmailsState.columns.push(VALIDATION_RESULTS_COLUMN);
  }
}

function ensureColumnsFromRow(row) {
  if (!row || typeof row !== "object") {
    return;
  }

  Object.keys(row).forEach((key) => {
    if (isHiddenMetadataKey(key)) {
      return;
    }
    if (!validateEmailsState.columns.includes(key)) {
      validateEmailsState.columns.push(key);
    }
  });
}

function renderValidateEmailsTable(data) {
  if (!data || !data.length) {
    $("#table-container").html("No rows");
    return;
  }

  const columns =
    validateEmailsState.columns.length > 0
      ? validateEmailsState.columns
      : Object.keys(data[0]);

  let html = "<table><thead><tr><th>index</th>";
  columns.forEach((column) => {
    html += `<th>${column}</th>`;
  });
  html += "</tr></thead><tbody>";

  data.forEach((row, index) => {
    const isProcessing = validateEmailsState.processing.has(index);
    const rowClass = isProcessing ? " class=\"processing-row\"" : "";
    html += `<tr data-row-index="${index}"${rowClass}><td>${index}</td>`;
    columns.forEach((column) => {
      const value = row[column];
      let cellValue = value;
      if (cellValue === null || cellValue === undefined) {
        cellValue = "";
      } else if (typeof cellValue === "object") {
        try {
          cellValue = JSON.stringify(cellValue);
        } catch (err) {
          cellValue = String(cellValue);
        }
      }
      html += `<td>${cellValue}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  $("#table-container").html(html);
}

function handleValidateEmailsDataLoaded(data, options = {}) {
  const shouldMerge = Boolean(options && options.merge);

  if (!shouldMerge) {
    validateEmailsState.data = Array.isArray(data) ? data : [];
    const initialColumns = validateEmailsState.data.length
      ? Object.keys(validateEmailsState.data[0])
      : [];
    validateEmailsState.columns = initialColumns.filter(
      (column) => !isHiddenMetadataKey(column)
    );
    validateEmailsState.processing = new Set();
    validateEmailsState.data.forEach((row) => {
      ensureColumnsFromRow(row);
    });
  } else if (
    Array.isArray(data) &&
    Array.isArray(validateEmailsState.data) &&
    validateEmailsState.data.length
  ) {
    data.forEach((record) => {
      if (!record || typeof record.__index !== "number") {
        return;
      }
      const index = record.__index;
      const updatedRow = { ...record };
      delete updatedRow.__index;

      const existingRow =
        index >= 0 && index < validateEmailsState.data.length
          ? validateEmailsState.data[index]
          : {};
      validateEmailsState.data[index] = {
        ...existingRow,
        ...updatedRow,
      };
      ensureColumnsFromRow(updatedRow);
      validateEmailsState.processing.delete(index);
    });
  }

  ensureValidationResultsColumn();
  renderValidateEmailsTable(validateEmailsState.data);

  if (!shouldMerge) {
    $(document).trigger("validateEmails:dataLoaded", [validateEmailsState]);
  }
  $(document).trigger("validateEmails:dataUpdated", [validateEmailsState]);
}

function setValidationProcessingState(start, stop, isProcessing) {
  if (
    typeof start !== "number" ||
    typeof stop !== "number" ||
    stop <= start ||
    !Array.isArray(validateEmailsState.data) ||
    !validateEmailsState.data.length
  ) {
    return;
  }

  const safeStart = Math.max(0, Math.floor(start));
  const safeStop = Math.min(
    Math.ceil(stop),
    validateEmailsState.data.length
  );

  ensureValidationResultsColumn();

  for (let index = safeStart; index < safeStop; index += 1) {
    if (isProcessing) {
      validateEmailsState.processing.add(index);
      const currentRow = validateEmailsState.data[index] || {};
      validateEmailsState.data[index] = {
        ...currentRow,
        [VALIDATION_RESULTS_COLUMN]: VALIDATION_PROCESSING_LABEL,
      };
    } else {
      validateEmailsState.processing.delete(index);
      const currentRow = validateEmailsState.data[index];
      if (
        currentRow &&
        currentRow[VALIDATION_RESULTS_COLUMN] === VALIDATION_PROCESSING_LABEL
      ) {
        validateEmailsState.data[index] = {
          ...currentRow,
          [VALIDATION_RESULTS_COLUMN]: "",
        };
      }
    }
  }

  renderValidateEmailsTable(validateEmailsState.data);
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
window.setValidationProcessingState = setValidationProcessingState;
