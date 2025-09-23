(function (window, $) {
  "use strict";

  const Shared = window.guessStep4Shared;
  const Constants = window.guessStep4Constants;

  function formatSourceValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function fallbackCopy(text) {
    const temp = $("<textarea>");
    $("body").append(temp);
    temp.val(text).select();
    document.execCommand("copy");
    temp.remove();
  }

  function copyTableToClipboard(selector) {
    const table = $(selector);
    if (!table.length) {
      alert("No data to copy.");
      return;
    }

    const rows = [];
    table.find("tr").each(function () {
      const cols = [];
      $(this)
        .find("th,td")
        .each(function () {
          cols.push($(this).text());
        });
      rows.push(cols.join("\t"));
    });

    const tsv = rows.join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).catch(function () {
        fallbackCopy(tsv);
      });
    } else {
      fallbackCopy(tsv);
    }
  }

  function renderSourcePreview(containerSelector, rows, emptyMessage) {
    const container = $(containerSelector);
    if (!container.length) {
      return;
    }

    if (!Array.isArray(rows) || !rows.length) {
      container.html(
        '<div class="guess-step4-empty">' +
          (emptyMessage || "No source data loaded.") +
          "</div>"
      );
      return;
    }

    const columnSet = new Set();
    rows.forEach(function (row) {
      if (row && typeof row === "object") {
        Object.keys(row).forEach(function (key) {
          columnSet.add(key);
        });
      }
    });

    const preferred = [
      "index",
      "business_name",
      "raw_public_emails",
      "email_domain",
      "raw_contacts",
    ];

    const columns = [];
    preferred.forEach(function (key) {
      if (columnSet.has(key)) {
        columns.push(key);
        columnSet.delete(key);
      }
    });

    Array.from(columnSet)
      .sort(function (a, b) {
        return String(a).localeCompare(String(b));
      })
      .forEach(function (key) {
        columns.push(key);
      });

    if (!columns.length) {
      container.html(
        '<div class="guess-step4-empty">' +
          (emptyMessage || "No source data loaded.") +
          "</div>"
      );
      return;
    }

    let html =
      '<table id="guess-step4-source-table"><thead><tr>';
    columns.forEach(function (column) {
      html +=
        "<th>" + (Shared.formatColumnLabel(column) || column) + "</th>";
    });
    html += "</tr></thead><tbody>";

    rows.forEach(function (row) {
      html += "<tr>";
      columns.forEach(function (column) {
        html += "<td>" + formatSourceValue(row[column]) + "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.html(html);
  }

  function renderContactsTable(containerSelector, rows, selectedColumns, columnLabels) {
    const container = $(containerSelector);
    if (!Array.isArray(selectedColumns) || !selectedColumns.length) {
      container.html('<div class="guess-step4-empty">Select at least one column to view results.</div>');
      return;
    }

    let html = '<table id="guess-step4-results-table"><thead><tr>';
    selectedColumns.forEach(function (column) {
      const heading = columnLabels[column] || Shared.formatColumnLabel(column);
      html += "<th>" + heading + "</th>";
    });
    html += "</tr></thead><tbody>";

    rows.forEach(function (row) {
      html += "<tr>";
      selectedColumns.forEach(function (column) {
        const value = row[column];
        html += "<td>" + (value !== undefined && value !== null ? value : "") + "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.html(html);
  }

  function renderColumnControls(columns, selectedColumns, columnLabels, onToggleChange) {
    const wrapper = $(Constants.COLUMN_CONTROLS_WRAPPER);
    const container = $(Constants.COLUMN_TOGGLE_CONTAINER);
    container.empty();

    if (!Array.isArray(columns) || !columns.length) {
      wrapper.hide();
      return;
    }

    wrapper.css("display", "flex");

    columns.forEach(function (column) {
      const isChecked = selectedColumns.indexOf(column) !== -1;
      const labelText = columnLabels[column] || Shared.formatColumnLabel(column);
      const safeId = "guess-step4-col-" + String(column).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();

      const $label = $("<label>").addClass("guess-step4-toggle");
      const $input = $("<input>")
        .attr("type", "checkbox")
        .attr("id", safeId)
        .attr("data-column", column)
        .prop("checked", isChecked);
      const $slider = $("<span>").addClass("guess-step4-toggle-slider").attr("aria-hidden", "true");
      const $text = $("<span>").addClass("guess-step4-toggle-label").text(labelText);

      $input.on("change", function () {
        if (typeof onToggleChange === "function") {
          onToggleChange(column, $(this).is(":checked"), this);
        }
      });

      $label.append($input, $slider, $text);
      container.append($label);
    });
  }

  function showEmptyState(message) {
    $("#guess-step4-container").html(message || "No contacts available");
  }

  window.guessStep4UI = {
    copyTableToClipboard: copyTableToClipboard,
    renderSourcePreview: renderSourcePreview,
    renderContactsTable: renderContactsTable,
    renderColumnControls: renderColumnControls,
    showEmptyState: showEmptyState,
  };
})(window, window.jQuery);
