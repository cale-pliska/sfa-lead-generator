function renderContacts(data){
    if(!data.length){ $('#table-container').html('No contacts'); return; }
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

function loadContacts(){
    $.getJSON('/contacts_data', function(data){ renderContacts(data); });
}

$(document).ready(function(){
    loadContacts();
});

$('#add-form').on('submit', function(e){
    e.preventDefault();
    var lines = $('#businesses').val().split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
    $.ajax({
        url: '/add_contacts',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({businesses: lines}),
        success: function(data){
            $('#businesses').val('');
            renderContacts(data);
        },
        error: function(xhr){ alert(xhr.responseText); }
    });
});
