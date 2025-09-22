(function (window) {
  "use strict";

  const Constants = window.guessStep4Constants;

  function storeContacts(rows) {
    window.guessStep4ContactsData = rows;
    try {
      localStorage.setItem(Constants.CONTACTS_STORAGE_KEY, JSON.stringify(rows));
    } catch (err) {
      console.error("Unable to store Step 4 contacts", err);
    }
  }

  function loadContacts() {
    const saved = localStorage.getItem(Constants.CONTACTS_STORAGE_KEY);
    if (!saved) {
      return null;
    }
    try {
      const parsed = JSON.parse(saved);
      window.guessStep4ContactsData = parsed;
      return parsed;
    } catch (err) {
      console.error("Unable to load stored Step 4 contacts", err);
      return null;
    }
  }

  function clearContacts() {
    window.guessStep4ContactsData = [];
    try {
      localStorage.removeItem(Constants.CONTACTS_STORAGE_KEY);
    } catch (err) {
      console.error("Unable to clear stored Step 4 contacts", err);
    }
  }

  function storeSelectedColumns(columns) {
    if (!Array.isArray(columns)) {
      return;
    }
    try {
      localStorage.setItem(Constants.COLUMN_SELECTION_KEY, JSON.stringify(columns));
    } catch (err) {
      console.error("Unable to store Step 4 column selection", err);
    }
  }

  function loadSelectedColumns() {
    const stored = localStorage.getItem(Constants.COLUMN_SELECTION_KEY);
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

  function clearSelectedColumns() {
    try {
      localStorage.removeItem(Constants.COLUMN_SELECTION_KEY);
    } catch (err) {
      console.error("Unable to clear Step 4 column selection", err);
    }
  }

  window.guessStep4Storage = {
    storeContacts: storeContacts,
    loadContacts: loadContacts,
    clearContacts: clearContacts,
    storeSelectedColumns: storeSelectedColumns,
    loadSelectedColumns: loadSelectedColumns,
    clearSelectedColumns: clearSelectedColumns,
  };
})(window);
