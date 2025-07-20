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
            renderTable(data);
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
            alert('Result: ' + data.result);
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});

