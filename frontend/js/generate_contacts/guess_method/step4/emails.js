(function (window) {
  "use strict";

  const Shared = window.guessStep4Shared;
  const Contacts = window.guessStep4Contacts;

  function buildEmailVariationsForRow(row) {
    const variations = [];
    const domain = Contacts.resolveDomainForEmail(row);
    if (!domain) {
      return variations;
    }

    const first = Shared.sanitizeNamePart(
      row.first_name || row.firstname || row.first || row.firstName
    );
    const last = Shared.sanitizeNamePart(
      row.last_name || row.lastname || row.last || row.lastName
    );

    if (!first) {
      return variations;
    }

    const firstInitial = first.charAt(0);
    const existing = new Set();

    function add(pattern, localPart) {
      if (!pattern || !localPart) {
        return;
      }
      const email = localPart + "@" + domain;
      const key = pattern + "::" + email.toLowerCase();
      if (existing.has(key)) {
        return;
      }
      existing.add(key);
      variations.push({ pattern: pattern, email: email });
    }

    if (first && last) {
      add("First.Last", first + "." + last);
    }
    if (firstInitial && last) {
      add("FirstInitial.Last", firstInitial + "." + last);
    }
    add("First", first);
    if (first && last) {
      add("FirstLast", first + last);
    }
    if (firstInitial && last) {
      add("FirstInitialLast", firstInitial + last);
    }

    return variations;
  }

  function generateEmailRows(parsedContacts) {
    const baseRows = [];
    const existingGenerated = [];

    (Array.isArray(parsedContacts) ? parsedContacts : []).forEach(function (row) {
      if (!row || typeof row !== "object") {
        return;
      }
      if (row.email_pattern) {
        existingGenerated.push(row);
        return;
      }
      baseRows.push(Contacts.ensureCanonicalFields(Shared.cloneRow(row)));
    });

    const updatedRows = [];
    let generatedCount = 0;

    baseRows.forEach(function (row) {
      const variations = buildEmailVariationsForRow(row);
      variations.forEach(function (variation) {
        const emailRow = Contacts.ensureCanonicalFields(Shared.cloneRow(row));
        emailRow.email = variation.email;
        emailRow.email_pattern = variation.pattern;
        updatedRows.push(emailRow);
        generatedCount += 1;
      });
    });

    return {
      baseRows: baseRows,
      existingGenerated: existingGenerated,
      generatedCount: generatedCount,
      updatedRows: Contacts.normalizeContacts(updatedRows),
    };
  }

  window.guessStep4Emails = {
    buildEmailVariationsForRow: buildEmailVariationsForRow,
    generateEmailRows: generateEmailRows,
  };
})(window);
