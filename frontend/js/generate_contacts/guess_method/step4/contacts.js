(function (window) {
  "use strict";

  const Shared = window.guessStep4Shared;
  const Constants = window.guessStep4Constants;

  function readStoredStep2Results() {
    let saved = null;
    try {
      saved = localStorage.getItem(Constants.STEP2_RESULTS_KEY);
    } catch (err) {
      console.error("Unable to access stored Step 2 results", err);
      return {};
    }

    if (!saved) {
      return {};
    }

    try {
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.error("Unable to parse stored Step 2 results", err);
      return {};
    }
  }

  function ensureStep2Results(forceReload) {
    const hasExistingResults =
      window.guessStep2Results && typeof window.guessStep2Results === "object";
    if (!forceReload && hasExistingResults) {
      return window.guessStep2Results;
    }

    const storedResults = readStoredStep2Results();
    const hasStoredResults =
      storedResults && typeof storedResults === "object" && Object.keys(storedResults).length > 0;

    if (hasStoredResults) {
      window.guessStep2Results = storedResults;
      return window.guessStep2Results;
    }

    if (hasExistingResults) {
      if (forceReload) {
        console.warn(
          "Stored Step 2 results were empty; retaining in-memory results instead.",
        );
      }
      return window.guessStep2Results;
    }

    window.guessStep2Results = storedResults && typeof storedResults === "object" ? storedResults : {};
    return window.guessStep2Results;
  }

  function ensureCanonicalFields(row) {
    if (!row || typeof row !== "object") {
      return {};
    }
    const normalized = row;
    if (typeof normalized.business_name === "undefined") {
      const businessKey = Shared.inferBusinessNameKey(normalized);
      if (businessKey && typeof normalized[businessKey] !== "undefined") {
        normalized.business_name = normalized[businessKey];
      }
    }
    if (typeof normalized.website === "undefined") {
      const websiteKey = Shared.resolveWebsiteColumn([normalized], Object.keys(normalized));
      if (websiteKey && typeof normalized[websiteKey] !== "undefined") {
        normalized.website = normalized[websiteKey];
      }
    }
    return normalized;
  }

  function normalizeContacts(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map(function (row) {
      return ensureCanonicalFields(Shared.cloneRow(row));
    });
  }

  function resolveDomainForEmail(row) {
    if (!row || typeof row !== "object") {
      return "";
    }
    const columns = Object.keys(row);
    const domainKey = Shared.resolveDomainColumn([row], columns);
    if (domainKey) {
      const domain = Shared.cleanDomainValue(row[domainKey]);
      if (domain) {
        return domain;
      }
    }
    const websiteKey = Shared.resolveWebsiteColumn([row], columns);
    if (websiteKey) {
      const domain = Shared.cleanDomainValue(row[websiteKey]);
      if (domain) {
        return domain;
      }
    }
    return "";
  }

  function buildContactRows() {
    const results = ensureStep2Results(true);
    const indexes = Object.keys(results).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });

    const contacts = [];

    indexes.forEach(function (idx) {
      const row = results[idx] || {};
      const baseData = ensureCanonicalFields(Shared.cloneRow(row));
      const rawContacts = baseData.raw_contacts;
      const contactEntries = Shared.ensureArray(Shared.parseRawContacts(rawContacts));

      if (!contactEntries.length) {
        const fallback = ensureCanonicalFields(Shared.cloneRow(baseData));
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
        const current = ensureCanonicalFields(Shared.cloneRow(baseData));
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

    return normalizeContacts(contacts);
  }

  window.guessStep4Contacts = {
    ensureStep2Results: ensureStep2Results,
    ensureCanonicalFields: ensureCanonicalFields,
    normalizeContacts: normalizeContacts,
    resolveDomainForEmail: resolveDomainForEmail,
    buildContactRows: buildContactRows,
  };
})(window);
