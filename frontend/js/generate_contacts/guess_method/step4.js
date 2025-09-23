(function (window, $) {
  "use strict";

  const Constants = window.guessStep4Constants;
  const Shared = window.guessStep4Shared;
  const Contacts = window.guessStep4Contacts;
  const Columns = window.guessStep4Columns;
  const Emails = window.guessStep4Emails;
  const Storage = window.guessStep4Storage;
  const UI = window.guessStep4UI;

  const TABLE_CONTAINER = "#guess-step4-container";
  const STALE_CONTACTS_MESSAGE =
    "Step 2 results changed. Generate contacts again to view updates.";

  function flushPendingStep2Edit() {
    if (typeof window.guessStep2SaveInlineEdits === "function") {
      try {
        window.guessStep2SaveInlineEdits();
      } catch (err) {
        console.error("Unable to persist Step 2 edits before Step 4 action", err);
      }
    }

    const activeElement = document.activeElement;
    if (!activeElement) {
      return Promise.resolve();
    }

    const $active = $(activeElement);
    const isEditableCell =
      $active.length &&
      $active.is("td[data-column]") &&
      $active.closest("#guess-results-container").length;

    if (!isEditableCell) {
      return Promise.resolve();
    }

    if (typeof activeElement.blur === "function") {
      activeElement.blur();
    }

    return new Promise(function (resolve) {
      setTimeout(resolve, 0);
    });
  }

  let parsedContacts = [];
  let availableColumns = [];
  let selectedColumns = [];
  let columnLabels = {};
  let hasDisplayedContacts = false;

  function resetContactsState(message) {
    parsedContacts = [];
    availableColumns = [];
    selectedColumns = [];
    columnLabels = {};
    hasDisplayedContacts = false;
    UI.showEmptyState(message || "No contacts available");
    $(Constants.COLUMN_TOGGLE_CONTAINER).empty();
    $(Constants.COLUMN_CONTROLS_WRAPPER).hide();
  }

  function invalidateContactsData(message) {
    Storage.clearContacts();
    resetContactsState(message || STALE_CONTACTS_MESSAGE);
  }

  function ensureEmailColumnsSelected() {
    const requiredColumns = ["email", "email_pattern"];
    const storedSelection = Storage.loadSelectedColumns();
    let baseSelection = [];
    if (Array.isArray(storedSelection) && storedSelection.length) {
      baseSelection = storedSelection.slice();
    } else if (Array.isArray(selectedColumns) && selectedColumns.length) {
      baseSelection = selectedColumns.slice();
    }
    const seen = new Set(baseSelection);
    let changed = false;

    requiredColumns.forEach(function (column) {
      if (!seen.has(column)) {
        baseSelection.push(column);
        seen.add(column);
        changed = true;
      }
    });

    if (changed) {
      Storage.storeSelectedColumns(baseSelection);
    }
  }

  function updateAvailableColumns(rows) {
    const columns = Columns.collectColumns(rows);
    availableColumns = columns;
    if (!columns.length) {
      selectedColumns = [];
      columnLabels = {};
      return;
    }

    const defaultMatches = Columns.findDefaultColumnMatches(rows, columns);
    columnLabels = Columns.buildColumnLabels(columns, defaultMatches);

    const storedSelection = Storage.loadSelectedColumns().filter(function (column) {
      return columns.indexOf(column) !== -1;
    });

    if (storedSelection.length) {
      selectedColumns = Shared.orderColumns(storedSelection, columns);
    } else {
      const defaults = defaultMatches.map(function (match) {
        return match.key;
      });
      selectedColumns =
        defaults.length > 0
          ? Shared.orderColumns(defaults, columns)
          : columns.slice(0, Math.min(columns.length, 6));
    }

    Storage.storeSelectedColumns(selectedColumns);
  }

  function handleColumnToggle(column, isChecked) {
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

    selectedColumns = Shared.orderColumns(selectedColumns, availableColumns);
    Storage.storeSelectedColumns(selectedColumns);
    UI.renderContactsTable(TABLE_CONTAINER, parsedContacts, selectedColumns, columnLabels);
  }

  function refreshContactsDisplay() {
    if (!Array.isArray(parsedContacts) || !parsedContacts.length) {
      resetContactsState("No contacts available");
      return;
    }

    parsedContacts = Contacts.normalizeContacts(parsedContacts);
    updateAvailableColumns(parsedContacts);
    UI.renderColumnControls(availableColumns, selectedColumns, columnLabels, handleColumnToggle);
    UI.renderContactsTable(TABLE_CONTAINER, parsedContacts, selectedColumns, columnLabels);
    hasDisplayedContacts = true;
  }

  function createContacts() {
    parsedContacts = Contacts.buildContactRows();
    parsedContacts = Contacts.normalizeContacts(parsedContacts);
    Storage.storeContacts(parsedContacts);
    refreshContactsDisplay();
  }

  function populateEmails() {
    if (!Array.isArray(parsedContacts) || !parsedContacts.length) {
      alert("No contacts available to populate. Please create contacts first.");
      return;
    }

    const result = Emails.generateEmailRows(parsedContacts);

    if (!result.baseRows.length) {
      if (result.existingGenerated.length) {
        ensureEmailColumnsSelected();
        alert("Email variations are already populated for the available contacts.");
        refreshContactsDisplay();
        return;
      }
      alert("No base contacts are available. Please create contacts first.");
      return;
    }

    if (!result.generatedCount) {
      if (result.existingGenerated.length) {
        ensureEmailColumnsSelected();
        alert("Email variations are already populated for the available contacts.");
        refreshContactsDisplay();
        return;
      }
      alert(
        "Unable to generate email variations. Ensure contacts include first name, last name, and domain details."
      );
      parsedContacts = Contacts.normalizeContacts(result.baseRows);
      Storage.storeContacts(parsedContacts);
      refreshContactsDisplay();
      return;
    }

    parsedContacts = result.updatedRows;
    Storage.storeContacts(parsedContacts);
    ensureEmailColumnsSelected();
    refreshContactsDisplay();
  }

  function clearStep4Results() {
    Storage.clearContacts();
    Storage.clearSelectedColumns();
    resetContactsState("No contacts available");
  }

  function loadStoredContacts() {
    const saved = Storage.loadContacts();
    if (saved && Array.isArray(saved)) {
      parsedContacts = Contacts.normalizeContacts(saved);
    } else {
      parsedContacts = [];
    }
    refreshContactsDisplay();
  }

  function handleCopy() {
    UI.copyTableToClipboard(Constants.TABLE_SELECTOR);
  }

  $(document).on("guessStep2ResultsUpdated", function (event, results) {
    if (results && typeof results === "object") {
      window.guessStep2Results = results;
    }

    const hadContacts =
      hasDisplayedContacts ||
      (Array.isArray(parsedContacts) && parsedContacts.length > 0) ||
      (Array.isArray(window.guessStep4ContactsData) &&
        window.guessStep4ContactsData.length > 0);

    if (hadContacts) {
      invalidateContactsData();
    }
  });

  $(function () {
    $("#guess-create-contacts-btn").on("click", function () {
      flushPendingStep2Edit().then(function () {
        createContacts();
      });
    });
    $(Constants.POPULATE_EMAILS_BUTTON).on("click", function () {
      flushPendingStep2Edit().then(function () {
        populateEmails();
      });
    });
    $("#guess-copy-step4-results").on("click", handleCopy);
    $(Constants.CLEAR_STEP4_BUTTON).on("click", clearStep4Results);
    loadStoredContacts();
  });
})(window, window.jQuery);
