(function () {
  const STORAGE_KEYS = {
    tsv: "generate_contacts_guess_step1_tsv",
    instructions: "generate_contacts_guess_step1_instructions",
    prompt: "generate_contacts_guess_step1_prompt",
  };

  const LEGACY_STORAGE_KEYS = {
    tsv: "generate_contacts_guess_step1_tsv_legacy",
    instructions: "generate_contacts_guess_step1_instructions_legacy",
    prompt: "generate_contacts_guess_step1_prompt_legacy",
  };

  function loadValueWithFallback(key) {
    const current = localStorage.getItem(STORAGE_KEYS[key]) || "";
    if (current && current.length) {
      return current;
    }
    const legacyKey = LEGACY_STORAGE_KEYS[key];
    if (!legacyKey) {
      return "";
    }
    const legacyValue = localStorage.getItem(legacyKey) || "";
    if (legacyValue && legacyValue.length) {
      localStorage.setItem(STORAGE_KEYS[key], legacyValue);
      return legacyValue;
    }
    return "";
  }

  function loadSavedSetup() {
    const savedTsv = loadValueWithFallback("tsv");
    const savedInstructions = loadValueWithFallback("instructions");
    const savedPrompt = loadValueWithFallback("prompt");

    return { savedTsv, savedInstructions, savedPrompt };
  }

  function renderTable(data) {
    if (!data.length) {
      $("#guess-table-container").html("No rows");
      return;
    }
    let html = "<table><thead><tr><th>index</th>";
    Object.keys(data[0]).forEach(function (col) {
      html += "<th>" + col + "</th>";
    });
    html += "</tr></thead><tbody>";
    data.forEach(function (row, idx) {
      html += "<tr><td>" + idx + "</td>";
      Object.values(row).forEach(function (val) {
        html += "<td>" + val + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    $("#guess-table-container").html(html);
  }

  function autoPopulateFromSaved() {
    const setup = loadSavedSetup();
    let tsvData = setup.savedTsv;

    if (!tsvData) {
      tsvData =
        "business_name\tLocation\tPopulation\twebsite\n" +
        "Origin Point\tmadison wi Downtown\t25000\thttps://www.originpoint.com/branches/wi/madison";
    }

    $("#guess-tsv-input").val(tsvData);
    $("#guess-instructions").val(setup.savedInstructions);
    $("#guess-shared-prompt").val(setup.savedPrompt);

    if (tsvData) {
      const formData = new FormData();
      formData.append("tsv_text", tsvData);
      $.ajax({
        url: "/generate_contacts/guess/upload",
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
          renderTable(JSON.parse(data));
        },
        error: function (xhr) {
          console.error(xhr.responseText);
        },
      });
    }
  }

  function autoSave() {
    localStorage.setItem(STORAGE_KEYS.tsv, $("#guess-tsv-input").val());
    localStorage.setItem(
      STORAGE_KEYS.instructions,
      $("#guess-instructions").val()
    );
    localStorage.setItem(
      STORAGE_KEYS.prompt,
      $("#guess-shared-prompt").val()
    );
    Object.values(LEGACY_STORAGE_KEYS).forEach(function (legacyKey) {
      localStorage.removeItem(legacyKey);
    });
  }

  $(document).ready(function () {
    autoPopulateFromSaved();
    $("#guess-tsv-input, #guess-instructions, #guess-shared-prompt").on(
      "input",
      autoSave
    );
    $(window).on("beforeunload", autoSave);
  });

  $("#guess-upload-form").on("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    $.ajax({
      url: "/generate_contacts/guess/upload",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        renderTable(JSON.parse(data));
        autoSave();
      },
      error: function (xhr) {
        alert(xhr.responseText);
      },
    });
  });

  $("#guess-clear-step1").on("click", function () {
    $("#guess-table-container").empty();
  });
})();
