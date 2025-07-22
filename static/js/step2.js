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
