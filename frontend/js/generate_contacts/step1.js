function loadSavedSetup() {
  const savedTsv = localStorage.getItem("saved_tsv") || "";
  const savedInstructions = localStorage.getItem("saved_instructions") || "";
  const savedPrompt = localStorage.getItem("saved_prompt") || "";

  return { savedTsv, savedInstructions, savedPrompt };
}

function autoPopulateFromSaved() {
  const setup = loadSavedSetup();
  if (setup.savedTsv || setup.savedInstructions || setup.savedPrompt) {
    $("#tsv-input").val(setup.savedTsv);
    $("#instructions").val(setup.savedInstructions);
    $("#prompt").val(setup.savedPrompt);

    if (setup.savedTsv) {
      const formData = new FormData();
      formData.append("tsv_text", setup.savedTsv);
      $.ajax({
        url: "/upload",
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
          renderDataTable(JSON.parse(data));
        },
        error: function (xhr) {
          console.error(xhr.responseText);
        },
      });
    }
  }
}

function autoSave() {
  localStorage.setItem("saved_tsv", $("#tsv-input").val());
  localStorage.setItem("saved_instructions", $("#instructions").val());
  localStorage.setItem("saved_prompt", $("#prompt").val());
}

$(document).ready(function () {
  autoPopulateFromSaved();
  $("#tsv-input, #instructions, #prompt").on("input", autoSave);
  $(window).on("beforeunload", autoSave);
});

$("#upload-form").on("submit", function (e) {
  e.preventDefault();
  var formData = new FormData(this);
  $.ajax({
    url: "/upload",
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (data) {
      renderDataTable(JSON.parse(data));
      autoSave();
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#save-setup-btn").on("click", function () {
  localStorage.setItem("saved_tsv", $("#tsv-input").val());
  localStorage.setItem("saved_instructions", $("#instructions").val());
  localStorage.setItem("saved_prompt", $("#prompt").val());
});

$("#clear-step1").on("click", function () {
  $("#tsv-input").val("");
  $("#instructions").val("");
  $("#prompt").val("");
  $("#table-container").empty();
  localStorage.removeItem("saved_tsv");
  localStorage.removeItem("saved_instructions");
  localStorage.removeItem("saved_prompt");
});

function renderDataTable(data) {
  if (!data.length) {
    $("#table-container").html("No rows");
    return;
  }
  var html = "<table><thead><tr>";
  Object.keys(data[0]).forEach(function (col) {
    html += "<th>" + col + "</th>";
  });
  html += "</tr></thead><tbody>";
  data.forEach(function (row) {
    html += "<tr>";
    Object.values(row).forEach(function (val) {
      html += "<td>" + val + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  $("#table-container").html(html);
}
