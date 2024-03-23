document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-i18n]').forEach(function(element) {
    const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    if (element.tagName === 'TEXTAREA') {
      element.setAttribute('placeholder', message);
    } else {
      element.textContent = message;
    }
  });

  const submitButton = document.getElementById("submit");
  const serverNamesTextarea = document.getElementById("serverNames");
  const clearButton = document.getElementById("clear");

  clearButton.addEventListener("click", function() {
    serverNamesTextarea.value = '';
    updateSubmitButtonText();

    chrome.tabs.query({active: true, currentWindow: true})
      .then(tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "clearSelection"});
      });
  });

  function updateSubmitButtonText() {
    const serverNamesInput = serverNamesTextarea.value;
    const serverCount = serverNamesInput.split('\n').filter(name => name.trim().length > 0).length;
    const buttonText = chrome.i18n.getMessage("selectServersButton") + ` (${serverCount})`;
    submitButton.textContent = buttonText;
  }

  updateSubmitButtonText();

  serverNamesTextarea.addEventListener('input', updateSubmitButtonText);

  chrome.tabs.query({active: true, currentWindow: true})
    .then(tabs => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedServers"})
        .then(response => {
          if (response && response.selectedServers) {
            serverNamesTextarea.value = response.selectedServers.join('\n');
            updateSubmitButtonText();
          }
        }).catch(err => console.error("Error fetching selected servers:", err));
    });

  submitButton.addEventListener("click", function() {
    const serverNamesInput = serverNamesTextarea.value;
    const serverNames = serverNamesInput.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    chrome.tabs.query({active: true, currentWindow: true})
      .then(tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "selectServers", serverNames: serverNames}).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, {action: "scrollToLastOption"});
        }).then(() => {
          window.close();
        });
      });
  });
});

