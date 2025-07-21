function loadSavedSetup(){
    const savedTsv = localStorage.getItem('saved_tsv') || '';
    const savedInstructions = localStorage.getItem('saved_instructions') || '';
    const savedPrompt = localStorage.getItem('saved_prompt') || '';

    $('#saved-tsv').val(savedTsv);
    $('#saved-instructions').val(savedInstructions);
    $('#saved-prompt').val(savedPrompt);

    if(savedTsv || savedInstructions || savedPrompt){
        $('#past-section').show();
    }

    return {savedTsv, savedInstructions, savedPrompt};
}

function autoPopulateFromSaved(){
    const setup = loadSavedSetup();
    if(setup.savedTsv || setup.savedInstructions || setup.savedPrompt){
        $('#tsv-input').val(setup.savedTsv);
        $('#instructions').val(setup.savedInstructions);
        $('#prompt').val(setup.savedPrompt);

        if(setup.savedTsv){
            const formData = new FormData();
            formData.append('tsv_text', setup.savedTsv);
            $.ajax({
                url: '/upload',
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data){
                    renderDataTable(JSON.parse(data));
                },
                error: function(xhr){ console.error(xhr.responseText); }
            });
        }
    }
}

$(document).ready(function(){
    autoPopulateFromSaved();
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
