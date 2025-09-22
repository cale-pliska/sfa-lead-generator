(function (window) {
  "use strict";

  const Shared = window.guessStep4Shared;

  const DEFAULT_COLUMN_SPECS = [
    {
      id: "business_name",
      label: "Business Name",
      resolve: Shared.resolveBusinessNameColumn,
    },
    { id: "first_name", label: "First Name", match: Shared.matchesExact("first_name") },
    { id: "last_name", label: "Last Name", match: Shared.matchesExact("last_name") },
    { id: "email", label: "Email", match: Shared.matchesExact("email") },
    {
      id: "email_pattern",
      label: "Email Pattern",
      match: Shared.matchesExact("email_pattern"),
    },
    { id: "role", label: "Role", match: Shared.matchesExact("role") },
    { id: "domain", label: "Domain", resolve: Shared.resolveDomainColumn },
    { id: "website", label: "Website", resolve: Shared.resolveWebsiteColumn },
  ];

  function collectColumns(rows) {
    const columnSet = new Set();
    rows.forEach(function (row) {
      if (row && typeof row === "object") {
        Object.keys(row).forEach(function (key) {
          columnSet.add(key);
        });
      }
    });

    const preferred = [
      "business_name",
      "first_name",
      "last_name",
      "email",
      "email_pattern",
      "role",
      "email_domain",
      "domain",
      "website",
      "contact_position",
      "parse_status",
      "additional_contact_data",
      "index",
      "raw_public_emails",
      "raw_contacts",
    ];

    const ordered = [];
    preferred.forEach(function (key) {
      if (columnSet.has(key)) {
        ordered.push(key);
        columnSet.delete(key);
      }
    });

    Array.from(columnSet)
      .sort(function (a, b) {
        return String(a).localeCompare(String(b));
      })
      .forEach(function (key) {
        ordered.push(key);
      });

    return ordered;
  }

  function findDefaultColumnMatches(rows, columns) {
    const matches = [];
    const used = new Set();
    DEFAULT_COLUMN_SPECS.forEach(function (spec) {
      let key = null;
      if (typeof spec.resolve === "function") {
        key = spec.resolve(rows, columns);
      }
      if (!key && typeof spec.match === "function") {
        key = columns.find(function (column) {
          if (used.has(column)) {
            return false;
          }
          return spec.match(column);
        });
      }
      if (key && columns.indexOf(key) !== -1 && !used.has(key)) {
        matches.push({ key: key, spec: spec });
        used.add(key);
      }
    });
    return matches;
  }

  function buildColumnLabels(columns, defaultMatches) {
    const labels = {};
    const overrides = {};
    (defaultMatches || []).forEach(function (match) {
      overrides[match.key] = match.spec.label;
    });
    columns.forEach(function (column) {
      if (Object.prototype.hasOwnProperty.call(overrides, column)) {
        labels[column] = overrides[column];
      } else {
        labels[column] = Shared.formatColumnLabel(column);
      }
    });
    return labels;
  }

  window.guessStep4Columns = {
    DEFAULT_COLUMN_SPECS: DEFAULT_COLUMN_SPECS,
    collectColumns: collectColumns,
    findDefaultColumnMatches: findDefaultColumnMatches,
    buildColumnLabels: buildColumnLabels,
  };
})(window);
