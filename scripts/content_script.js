function selectServers(serverNames) {
  const selectElement = document.querySelector('select[name="value"]');
  if (selectElement) {
    const options = selectElement.querySelectorAll('option');
    options.forEach(option => {
      option.selected = serverNames.includes(option.value);
    });
    selectElement.dispatchEvent(new Event('change'));
  }
}

function getSelectedServers() {
  const selectElement = document.querySelector('select[name="value"]');
  if (!selectElement) return [];
  return Array.from(selectElement.selectedOptions).map(option => option.value);
}

function scrollToLastOption() {
  const selectElement = document.querySelector('select[name="value"]');
  if (selectElement && selectElement.options.length > 0) {
    const lastOption = selectElement.options[selectElement.options.length - 1];
    lastOption.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

function clearSelection() {
  const selectElement = document.querySelector('select[name="value"]');
  if (selectElement) {
    selectElement.value = '';
    selectElement.dispatchEvent(new Event('change'));
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "selectServers") {
    selectServers(message.serverNames);
  } else if (message.action === "getSelectedServers") {
    sendResponse({selectedServers: getSelectedServers()});
  } else if (message.action === "scrollToLastOption") {
    scrollToLastOption();
  } else if (message.action === "clearSelection") {
    clearSelection();
  }
});
