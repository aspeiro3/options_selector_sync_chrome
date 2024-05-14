let activeButton = null;
let lastLoadedKey = null;
let currentButtonIndex = 0;
let buttons = document.getElementById('buttonsContainer').children;

document.addEventListener('DOMContentLoaded', async function() {
  localizeUI();
  initButtons();
  initDropdown();
  toggleRegexVisibility();
  updateRegexListDropdown();
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
  toggleRegexVisibility();
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
    element[element.tagName === 'TEXTAREA' || element.tagName === 'INPUT' ? 'placeholder' : 'textContent'] = message;
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
    toggleRegexVisibility();
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

function toggleRegexVisibility() {
  const serverNamesTextarea = document.getElementById("serverNames");
  const toggleRegexButton = document.getElementById("toggleRegex");

  function updateToggleRegexVisibility() {
    toggleRegexButton.style.display = serverNamesTextarea.value.trim() ? "none" : "block";
  }
  updateToggleRegexVisibility();
  serverNamesTextarea.addEventListener('input', updateToggleRegexVisibility);
  serverNamesTextarea.addEventListener('focus', updateToggleRegexVisibility);
  serverNamesTextarea.addEventListener('blur', updateToggleRegexVisibility);
}

document.getElementById('fetchMatches').addEventListener('click', function() {
  const regexInput = document.getElementById('regexInput');
  const serverNames = document.getElementById('serverNames');
  const regexPattern = regexInput.value;
  const regex = new RegExp(regexPattern);
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "fetchOptionsUsingRegex", regex: regexPattern}, function(response) {
      if (response && response.matchedOptions) {
        const matchedOptionsText = response.matchedOptions.join('\n');
        if (matchedOptionsText) {
          serverNames.value = matchedOptionsText;
          saveRegex();
          updateSubmitButtonText();
          toggleRegexVisibility();
        }
        toggleRegex();
      }
    });
  });
});

function initDropdown() {
  const dropdown = document.getElementById('savedRegexes');
  dropdown.addEventListener('change', function() {
    const selectedKey = dropdown.value;
    lastLoadedKey = selectedKey;
    loadRegex(selectedKey);
  });
}

document.getElementById('savedRegexes').addEventListener('click', function() {
  if (lastLoadedKey) {
    loadRegex(lastLoadedKey);
  }
});

function loadRegex(key) {
  chrome.storage.local.get({ regexes: {} }, function(data) {
    if (key in data.regexes) {
      document.getElementById('regexTitle').value = key;
      document.getElementById('regexInput').value = data.regexes[key];
      updateDeleteButtonVisibility();
    }
  });
}

document.getElementById('regexTitle').addEventListener('input', function() {
  const regexTitle = document.getElementById('regexTitle').value;
  if (!regexTitle.trim()) {
    document.getElementById('deleteRegex').style.display = 'none';
  } else {
    updateDeleteButtonVisibility();
  }
});

function saveRegex() {
  chrome.storage.local.get({ regexes: {} }, function(data) {
    let regexes = data.regexes;

    const keys = Object.keys(regexes);
    const title = document.getElementById('regexTitle').value.trim() || `regex-${keys.length + 1}`;
    const pattern = document.getElementById('regexInput').value.trim();
    regexes[title] = pattern;
    if (keys.length > 20) {
      const oldestKey = keys.reduce((oldest, key) => !oldest || regexes[key].time < regexes[oldest].time ? key : oldest, null);
      delete regexes[oldestKey];
    }
    chrome.storage.local.set({ regexes }, updateRegexListDropdown);
  });
}

function updateRegexListDropdown() {
  chrome.storage.local.get({ regexes: {} }, function(data) {
    const dropdown = document.getElementById('savedRegexes');
    dropdown.innerHTML = '';

    const keys = Object.keys(data.regexes);
    if (keys.length > 0) {
      keys.forEach((key) => {
        let option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        dropdown.appendChild(option);
      });
      dropdown.style.display = '';
      dropdown.selectedIndex = 0;
      lastLoadedKey = dropdown.value;
    } else {
      dropdown.style.display = 'none';
    }
    document.getElementById('regexTitle').value = '';
    document.getElementById('regexInput').value = '';
  });
}

document.getElementById('toggleRegex').addEventListener('click', function() {
  toggleRegex();
  updateDeleteButtonVisibility();
});

function toggleRegex() {
  const regexControlPanel = document.getElementById('regexControlPanel');
  const serverNames = document.getElementById('serverNames');
  const toggleButton = document.getElementById('toggleRegex');
  const submitButton = document.getElementById('submit');
  const clearButton = document.getElementById('clear');
  const selectButtons = Array.from(buttons);

  if (regexControlPanel.style.display === 'none') {
    regexControlPanel.style.display = 'block';
    serverNames.style.display = 'none';
    toggleButton.textContent = chrome.i18n.getMessage("toggleReturn");
    if (selectButtons.length > 0) {
      selectButtons.forEach((button) => {
        button.classList.add('button-disabled');
        button.disabled = true;
      });
    }
    submitButton.classList.add('button-disabled');
    clearButton.classList.add('button-disabled');
    submitButton.disabled = true;
    clearButton.disabled = true;
  } else {
    regexControlPanel.style.display = 'none';
    serverNames.style.display = 'block';
    toggleButton.textContent = chrome.i18n.getMessage("toggleRegex");
    if (selectButtons.length > 0) {
      selectButtons.forEach((button) => {
        button.classList.remove('button-disabled');
        button.disabled = false;
      });
    }
    submitButton.classList.remove('button-disabled');
    clearButton.classList.remove('button-disabled');
    submitButton.disabled = false;
    clearButton.disabled = false;
  }
}

document.getElementById('deleteRegex').addEventListener('click', function() {
  const regexTitle = document.getElementById('regexTitle').value;
  chrome.storage.local.get({ regexes: {} }, function(data) {
    delete data.regexes[regexTitle];
    chrome.storage.local.set({ regexes: data.regexes }, function() {
      updateRegexListDropdown();
      updateDeleteButtonVisibility();
    });
  });
});

function updateDeleteButtonVisibility() {
  chrome.storage.local.get({ regexes: {} }, function(data) {
    const hasRegexes = Object.keys(data.regexes).length > 0;
    const deleteButton = document.getElementById('deleteRegex');
    const regexTitle = document.getElementById('regexTitle').value;

    if (hasRegexes && regexTitle) {
      deleteButton.style.display = 'block';
    } else {
      deleteButton.style.display = 'none';
    }
  });
}
