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
            renderDataTable(JSON.parse(data));
            $('#step2').show();
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

function renderDataTable(data){
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

function renderResultsTable(data){
    if(!data.length){ $('#results-container').html('No results'); return; }
    var html = '<table><thead><tr>';
    Object.keys(data[0]).forEach(function(col){ html += '<th>'+col+'</th>'; });
    html += '</tr></thead><tbody>';
    data.forEach(function(row){
        html += '<tr>';
        Object.values(row).forEach(function(val){ html += '<td>'+val+'</td>'; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    $('#results-container').html(html);
}

function addOrUpdateResultRow(rowData, index){
    var $table = $('#results-container table');
    if(!$table.length){
        renderResultsTable([rowData]);
        return;
    }
    var keys = Object.keys(rowData);
    var rowHtml = '<tr>' + keys.map(function(k){ return '<td>'+rowData[k]+'</td>'; }).join('') + '</tr>';
    var $rows = $table.find('tbody tr');
    if(index < $rows.length){
        $rows.eq(index).replaceWith(rowHtml);
    } else {
        $table.find('tbody').append(rowHtml);
    }
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
            renderResultsTable(data);
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
            addOrUpdateResultRow(data, rowIndex);
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});


