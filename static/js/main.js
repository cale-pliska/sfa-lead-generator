var lastResults = null;

function loadSavedSetup(){
    $('#saved-tsv').val(localStorage.getItem('saved_tsv') || '');
    $('#saved-instructions').val(localStorage.getItem('saved_instructions') || '');
    $('#saved-prompt').val(localStorage.getItem('saved_prompt') || '');
    if($('#saved-tsv').val() || $('#saved-instructions').val() || $('#saved-prompt').val()){
        $('#past-section').show();
    }
}

$(document).ready(function(){
    loadSavedSetup();
});

$('#upload-form').on('submit', function(e){
    e.preventDefault();
    var formData = new FormData(this);
    $.ajax({
        url: '/upload',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(data){
            renderTable(JSON.parse(data));
            $('#process-section').show();
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});

$('#save-setup-btn').on('click', function(){
    localStorage.setItem('saved_tsv', $('#tsv-input').val());
    localStorage.setItem('saved_instructions', $('#instructions').val());
    localStorage.setItem('saved_prompt', $('#prompt').val());
    loadSavedSetup();
});

$('#load-setup-btn').on('click', function(){
    $('#tsv-input').val($('#saved-tsv').val());
    $('#instructions').val($('#saved-instructions').val());
    $('#prompt').val($('#saved-prompt').val());
});

$('#saved-tsv, #saved-instructions, #saved-prompt').on('change', function(){
    localStorage.setItem('saved_tsv', $('#saved-tsv').val());
    localStorage.setItem('saved_instructions', $('#saved-instructions').val());
    localStorage.setItem('saved_prompt', $('#saved-prompt').val());
});

function renderTable(data){
    if(!data.length){ $('#table-container').html('No rows'); return; }
    var html = '<table><thead><tr>';
    Object.keys(data[0]).forEach(function(col){ html += '<th>'+col+'</th>'; });
    html += '</tr></thead><tbody>';
    data.forEach(function(row){
        html += '<tr>';
        Object.values(row).forEach(function(val){ html += '<td>'+val+'</td>'; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    $('#table-container').html(html);
}

$('#process-btn').on('click', function(){
    var prompt = $('#prompt').val();
    var instructions = $('#instructions').val();
    $.ajax({
        url: '/process',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({prompt: prompt, instructions: instructions}),
        success: function(data){
            console.log("Raw data from backend:", data);
            lastResults = data;
            renderTable(data);
            $('#import-contacts-btn').show();
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});

$('#import-contacts-btn').on('click', function(){
    if(!lastResults){ return; }
    var results = lastResults.map(function(row){ return row.result; }).filter(Boolean);
    $.ajax({
        url: '/import_contacts',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({results: results}),
        success: function(){
            alert('Contacts imported');
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});

$('#process-single-btn').on('click', function(){
    var prompt = $('#prompt').val();
    var instructions = $('#instructions').val();
    var rowIndex = parseInt($('#row-index').val()) || 0;
    $.ajax({
        url: '/process_single',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({prompt: prompt, instructions: instructions, row_index: rowIndex}),
        success: function(data){
            var $table = $('#table-container table');
            if($table.length){
                var $rows = $table.find('tbody tr');
                if($table.find('th.result-column').length === 0){
                    $table.find('thead tr').append('<th class="result-column">result</th>');
                    $rows.each(function(){ $(this).append('<td></td>'); });
                }
                if(rowIndex < $rows.length){
                    $rows.eq(rowIndex).find('td').last().text(data.result);
                }
            } else {
                alert('Result: ' + data.result);
            }
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});


