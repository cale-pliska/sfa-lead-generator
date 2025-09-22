(function (window) {
  "use strict";

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function cloneRow(row) {
    return row && typeof row === "object" ? { ...row } : {};
  }

  function extractBracketedJson(text) {
    if (typeof text !== "string") {
      return null;
    }
    const match = text.match(/\[\s*\[[\s\S]*?\]\s*\]/);
    return match ? match[0] : null;
  }

  function parseRawContacts(raw) {
    if (!raw && raw !== 0) {
      return [];
    }

    if (Array.isArray(raw)) {
      return raw;
    }

    if (typeof raw === "object") {
      if (Array.isArray(raw.contacts)) {
        return raw.contacts;
      }
      return [];
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) {
        return [];
      }

      const bracketed = extractBracketedJson(trimmed) || trimmed;
      try {
        const parsed = JSON.parse(bracketed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        console.warn("Unable to parse raw contacts", err);
      }
    }

    return [];
  }

  function matchesExact(expected) {
    const normalized = String(expected || "").toLowerCase();
    return function (column) {
      return String(column || "").toLowerCase() === normalized;
    };
  }

  function formatColumnLabel(column) {
    if (!column && column !== 0) {
      return "";
    }
    const words = String(column)
      .replace(/[_\s]+/g, " ")
      .trim();
    if (!words) {
      return String(column);
    }
    if (words.length <= 4 && words === words.toUpperCase()) {
      return words;
    }
    return words.replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  function orderColumns(columns, referenceOrder) {
    const ordered = [];
    referenceOrder.forEach(function (column) {
      if (columns.indexOf(column) !== -1) {
        ordered.push(column);
      }
    });
    columns.forEach(function (column) {
      if (referenceOrder.indexOf(column) === -1 && ordered.indexOf(column) === -1) {
        ordered.push(column);
      }
    });
    return ordered;
  }

  function sanitizeNamePart(value) {
    if (!value && value !== 0) {
      return "";
    }
    return String(value)
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  }

  function cleanDomainValue(value) {
    if (!value && value !== 0) {
      return "";
    }
    let domain = String(value).trim();
    if (!domain) {
      return "";
    }
    domain = domain.replace(/^mailto:/i, "");
    const atIndex = domain.lastIndexOf("@");
    if (atIndex !== -1) {
      domain = domain.slice(atIndex + 1);
    }
    domain = domain.replace(/^https?:\/\//i, "");
    domain = domain.replace(/^www\./i, "");
    const colonIndex = domain.indexOf(":");
    if (colonIndex !== -1) {
      domain = domain.slice(0, colonIndex);
    }
    const slashIndex = domain.indexOf("/");
    if (slashIndex !== -1) {
      domain = domain.slice(0, slashIndex);
    }
    const questionIndex = domain.indexOf("?");
    if (questionIndex !== -1) {
      domain = domain.slice(0, questionIndex);
    }
    const hashIndex = domain.indexOf("#");
    if (hashIndex !== -1) {
      domain = domain.slice(0, hashIndex);
    }
    return domain.trim().toLowerCase();
  }

  function inferBusinessNameKey(obj) {
    if (!obj || typeof obj !== "object") {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, "business_name")) {
      return "business_name";
    }
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (key === "index") {
        continue;
      }
      const lower = key.toLowerCase();
      if (
        lower === "business name" ||
        lower === "business_name" ||
        (lower.includes("business") && lower.includes("name")) ||
        lower === "company name"
      ) {
        return key;
      }
    }
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (key === "index") {
        continue;
      }
      if (key.toLowerCase() === "name") {
        return key;
      }
    }
    return null;
  }

  function resolveBusinessNameColumn(rows, columns) {
    if (!Array.isArray(columns) || !columns.length) {
      return null;
    }
    if (columns.indexOf("business_name") !== -1) {
      return "business_name";
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const candidate = inferBusinessNameKey(row);
      if (candidate && columns.indexOf(candidate) !== -1) {
        return candidate;
      }
    }
    const fallback = columns.find(function (column) {
      const lower = String(column || "").toLowerCase();
      return lower.includes("business") && lower.includes("name");
    });
    return fallback || null;
  }

  function resolveDomainColumn(rows, columns) {
    if (!Array.isArray(columns) || !columns.length) {
      return null;
    }
    if (columns.indexOf("email_domain") !== -1) {
      return "email_domain";
    }
    const exactDomain = columns.find(function (column) {
      return String(column || "").toLowerCase() === "domain";
    });
    if (exactDomain) {
      return exactDomain;
    }
    const partial = columns.find(function (column) {
      return String(column || "").toLowerCase().includes("domain");
    });
    return partial || null;
  }

  function resolveWebsiteColumn(rows, columns) {
    if (!Array.isArray(columns) || !columns.length) {
      return null;
    }
    if (columns.indexOf("website") !== -1) {
      return "website";
    }
    const directMatch = columns.find(function (column) {
      const lower = String(column || "").toLowerCase();
      return (
        lower === "company_website" ||
        lower === "company website" ||
        lower === "site" ||
        lower === "url" ||
        lower.endsWith("website")
      );
    });
    if (directMatch) {
      return directMatch;
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || typeof row !== "object") {
        continue;
      }
      const keys = Object.keys(row);
      for (let j = 0; j < keys.length; j += 1) {
        const key = keys[j];
        if (String(key || "").toLowerCase() === "website") {
          return key;
        }
      }
    }
    return null;
  }

  window.guessStep4Shared = {
    ensureArray: ensureArray,
    cloneRow: cloneRow,
    extractBracketedJson: extractBracketedJson,
    parseRawContacts: parseRawContacts,
    matchesExact: matchesExact,
    formatColumnLabel: formatColumnLabel,
    orderColumns: orderColumns,
    sanitizeNamePart: sanitizeNamePart,
    cleanDomainValue: cleanDomainValue,
    inferBusinessNameKey: inferBusinessNameKey,
    resolveBusinessNameColumn: resolveBusinessNameColumn,
    resolveDomainColumn: resolveDomainColumn,
    resolveWebsiteColumn: resolveWebsiteColumn,
  };
})(window);
