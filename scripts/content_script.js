let activeSelectIndex = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "selectServers":
      selectServers(message.serverNames);
      break;
    case "getSelectedServers":
      getSelectedServers(sendResponse);
      break;
    case "scrollToLastOption":
      scrollToLastOption();
      break;
    case "clearSelection":
      clearSelection();
      break;
    case "findMultipleSelects":
      findMultipleSelects(sendResponse);
      break;
    case "highlightSelect":
      highlightSelect(message.index);
      break;
    case "unhighlightSelect":
      unhighlightSelect();
      break;
    case "getActiveSelectInfo":
      getActiveSelectInfo(sendResponse);
      break;
  }
});

function findMultipleSelects(sendResponse) {
  const multipleSelects = document.querySelectorAll('select[multiple]');
  const selectData = Array.from(multipleSelects).map((select, index) => {
    const inputForSelect = select.parentNode.querySelector('input');
    const buttonText = inputForSelect ? inputForSelect.value : null;

    return {
      index: index,
      buttonText: buttonText,
    };
  });

  sendResponse({selects: selectData});
}


function highlightSelect(index) {
  resetSelectStyles();
  const selectElement = document.querySelectorAll('select[multiple]')[index];
  if (selectElement) {
    selectElement.style.border = '2px solid red';
    activeSelectIndex = index;
  }
}

function highlightSelect(index) {
  resetSelectStyles();
  const selectElement = document.querySelectorAll('select[multiple]')[index];
  if (selectElement) {
    selectElement.style.border = '2px solid red';
    activeSelectIndex = index;
    const yOffset = -100;
    const elementTop = selectElement.getBoundingClientRect().top + window.pageYOffset;
    const topPosition = elementTop + yOffset;
    window.scrollTo({ top: topPosition, behavior: 'smooth' });
  }
}

function unhighlightSelect() {
  resetSelectStyles();
  activeSelectIndex = null;
}

function getActiveSelectInfo(sendResponse) {
  const select = document.querySelectorAll('select[multiple]')[activeSelectIndex];
  if (select) {
    const options = Array.from(select.options).map(option => ({
      value: option.value, text: option.text, selected: option.selected
    }));
    sendResponse({index: activeSelectIndex, options: options});
  } else {
    sendResponse({error: "Select element not found."});
  }
}

function selectServers(serverNames) {
  const selectElement = document.querySelectorAll('select[multiple]')[activeSelectIndex];
  if (selectElement) {
    selectElement.querySelectorAll('option').forEach(option => {
      option.selected = serverNames.includes(option.value);
    });
    selectElement.dispatchEvent(new Event('change'));
  }
}

function getSelectedServers(sendResponse) {
  const selectElement = document.querySelectorAll('select[multiple]')[activeSelectIndex];
  if (!selectElement) return [];
  const selectedServers = Array.from(selectElement.selectedOptions).map(option => option.value);
  sendResponse({selectedServers: selectedServers});
}

function scrollToLastOption() {
  const selectElement = document.querySelectorAll('select[multiple]')[activeSelectIndex];
  if (selectElement && selectElement.options.length) {
    selectElement.options[selectElement.options.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

function clearSelection() {
  const selectElement = document.querySelectorAll('select[multiple]')[activeSelectIndex];
  if (selectElement) {
    Array.from(selectElement.options).forEach(option => option.selected = false);
    selectElement.dispatchEvent(new Event('change'));
  }
}

function resetSelectStyles() {
  document.querySelectorAll('select[multiple]').forEach(select => select.style.border = '');
}
