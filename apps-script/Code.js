function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GitHub Actions')
    .addItem('Run Python Script', 'triggerWorkflow')
    .addToUi();
}

function triggerWorkflow() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var repo = props.getProperty('REPO');
  var url = 'https://api.github.com/repos/' + repo + '/actions/workflows/run-python.yml/dispatches';
  var payload = JSON.stringify({ref: 'main'});
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  UrlFetchApp.fetch(url, options);
  SpreadsheetApp.getUi().alert('Workflow triggered');
}
