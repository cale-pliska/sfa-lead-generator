(function () {
  let parsedContacts = [];
  const CONTACTS_KEY = "generate_contacts_guess_saved_contacts";
  const STEP2_RESULTS_KEY = "generate_contacts_guess_step2_results";

  function ensureStep2Results() {
    if (window.guessStep2Results && typeof window.guessStep2Results === "object") {
      return window.guessStep2Results;
    }
    const saved = localStorage.getItem(STEP2_RESULTS_KEY);
    if (saved) {
      try {
        window.guessStep2Results = JSON.parse(saved);
        return window.guessStep2Results;
      } catch (e) {
        console.error("Unable to parse Step 2 results", e);
      }
    }
    window.guessStep2Results = {};
    return window.guessStep2Results;
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
    if (table.length === 0) {
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

  function renderContactsTable(data) {
    if (!data.length) {
      $("#guess-contacts-container").html("No contacts");
      return;
    }
    const cols = Object.keys(data[0]);
    cols.sort(function (a, b) {
      if (a === "business_name") return -1;
      if (b === "business_name") return 1;
      return 0;
    });
    let html = '<table id="guess-contacts-results-table"><thead><tr>';
    cols.forEach(function (col) {
      html += "<th>" + col + "</th>";
    });
    html += "</tr></thead><tbody>";
    data.forEach(function (row) {
      html += "<tr>";
      cols.forEach(function (k) {
        html += "<td>" + (row[k] || "") + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    $("#guess-contacts-container").html(html);
  }

  $(document).ready(function () {
    const saved = localStorage.getItem(CONTACTS_KEY);
    if (saved) {
      try {
        parsedContacts = JSON.parse(saved);
        renderContactsTable(parsedContacts);
      } catch (e) {
        console.error(e);
      }
    }
  });

  $("#guess-parse-btn").on("click", function () {
    const currentStep2Results = ensureStep2Results();
    if (Object.keys(currentStep2Results).length === 0) {
      alert("No Step 2 results to parse");
      return;
    }
    $.ajax({
      url: "/generate_contacts/guess/parse_contacts",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ results: Object.values(currentStep2Results) }),
      success: function (data) {
        parsedContacts = parsedContacts.concat(data);
        renderContactsTable(parsedContacts);
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(parsedContacts));
      },
      error: function (xhr) {
        alert(xhr.responseText);
      },
    });
  });

  $("#guess-clear-step3").on("click", function () {
    $("#guess-contacts-container").empty();
    parsedContacts = [];
    localStorage.removeItem(CONTACTS_KEY);
  });

  $("#guess-copy-step3-results").on("click", function () {
    copyTableToClipboard("#guess-contacts-results-table");
  });
})();
