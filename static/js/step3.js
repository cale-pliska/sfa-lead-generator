var parsedContacts = [];

function renderContactsTable(data){
    if(!data.length){ $('#contacts-container').html('No contacts'); return; }
    var html = '<table><thead><tr>';
    Object.keys(data[0]).forEach(function(col){ html += '<th>'+col+'</th>'; });
    html += '</tr></thead><tbody>';
    data.forEach(function(row){
        html += '<tr>';
        Object.values(row).forEach(function(val){ html += '<td>'+val+'</td>'; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    $('#contacts-container').html(html);
}

$('#parse-btn').on('click', function(){
    if(!step2Results.length){
        alert('No Step 2 results to parse');
        return;
    }
    $.ajax({
        url: '/parse_contacts',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({results: step2Results}),
        success: function(data){
            parsedContacts = data;
            renderContactsTable(data);
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});
