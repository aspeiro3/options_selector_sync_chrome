let activeButton = null;
let currentButtonIndex = 0;
let buttons = document.getElementById('buttonsContainer').children;

document.addEventListener('DOMContentLoaded', async function() {
  localizeUI();
  initButtons();
  await listenForSelectButtons();
});

async function toggleControlPanel(index) {
  const controlPanel = document.getElementById('controlPanel');
  controlPanel.style.display = 'block';
  await sendMessageToContentScript({action: "highlightSelect", index: index});
  await fetchSelectedServers(index);
}

async function fetchSelectedServers(index) {
  await sendMessageToContentScript({action: "getActiveSelectInfo", index}, updateControlPanelWithSelectInfo);
}

async function clearSelection() {
  document.getElementById("serverNames").value = '';
  updateSubmitButtonText();
  await sendMessageToContentScript({action: "clearSelection"});
}

async function listenForSelectButtons() {
  await sendMessageToContentScript({action: "findMultipleSelects"}, response => {
    if (response && response.selects) {
      const container = document.getElementById('buttonsContainer');
      if (response.selects.length > 1) {
        response.selects.forEach((select, index) => createSelectButton(container, index, select));
        highlightActiveButton(container.firstChild);
      }
      toggleControlPanel(0);
    }
  });
}

function localizeUI() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    element[element.tagName === 'TEXTAREA' ? 'placeholder' : 'textContent'] = message;
  });
}

function initButtons() {
  const serverNamesTextarea = document.getElementById("serverNames");
  const clearButton = document.getElementById("clear");
  const submitButton = document.getElementById("submit");
  serverNamesTextarea.addEventListener('input', updateSubmitButtonText);
  clearButton.addEventListener("click", clearSelection);
  submitButton.addEventListener("click", selectServersAction);
}

function updateSubmitButtonText() {
  const serverCount = document.getElementById("serverNames").value.split('\n').filter(name => name.trim()).length;
  document.getElementById("submit").textContent = chrome.i18n.getMessage("selectServersButton") + ` (${serverCount})`;
}

function createSelectButton(container, index, select) {
  const inputForSelect = select.buttonText;
  const buttonText = inputForSelect ? inputForSelect : `Select #${index + 1}`;
  const button = document.createElement('button');
  button.textContent = buttonText;
  button.addEventListener('click', function() {
    toggleControlPanel(index);
    highlightActiveButton(button);
  });
  container.appendChild(button);
}

function highlightActiveButton(newActiveButton) {
  if (activeButton) {
    activeButton.classList.remove('active-select-button');
  }
  newActiveButton.classList.add('active-select-button');
  activeButton = newActiveButton;
}

function getUnselectedServerNames(serverNames, callback) {
  sendMessageToContentScript({action: "getSelectedServers"}, function(response) {
    const selectedServers = response.selectedServers || [];
    const unselectedServerNames = serverNames.filter(name => !selectedServers.includes(name));
    callback(unselectedServerNames);
  });
}

function selectServersAction() {
  const serverNamesInput = document.getElementById("serverNames").value;
  const serverNames = serverNamesInput.split('\n').map(name => name.trim()).filter(name => name);
  sendMessageToContentScript({action: "selectServers", serverNames: serverNames}, function() {
    sendMessageToContentScript({action: "scrollToLastOption"}, function() {
      getUnselectedServerNames(serverNames, function(unselectedServerNames) {
        if (unselectedServerNames && unselectedServerNames.length > 0) {
          alert(chrome.i18n.getMessage("unselectedServers") + "\n\n" + unselectedServerNames.join('\n'));
        }
        if (currentButtonIndex + 1 < buttons.length) {
          currentButtonIndex++;
          toggleControlPanel(currentButtonIndex);
          highlightActiveButton(buttons[currentButtonIndex]);
        } else {
          window.close();
          sendMessageToContentScript({action: "unhighlightSelect"});
        }
      });
    });
  });
}

function updateControlPanelWithSelectInfo(response) {
  if (response && response.options) {
    const serverNamesTextarea = document.getElementById("serverNames");
    const selectedOptionsText = response.options.filter(opt => opt.selected).map(opt => opt.text).join('\n');
    serverNamesTextarea.value = selectedOptionsText;
    updateSubmitButtonText();
  }
}

function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs.length) {
      if (typeof callback === 'function') {
        callback(null);
      }
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
      if (chrome.runtime.lastError) {
        if (typeof callback === 'function') {
          callback(null);
        }
      } else {
        if (typeof callback === 'function') {
          callback(response);
        }
      }
    });
  });
}
