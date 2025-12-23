let activeSelectIndex = null;

function isAirflowUrl() {
  return window.location.href.includes('https://airflow.p6m.');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "selectServers":
      if (isAirflowUrl()) {
        selectServersAirflow(message.serverNames, sendResponse);
        return true;
      } else {
        selectServers(message.serverNames);
      }
      break;
    case "getSelectedServers":
      if (isAirflowUrl()) {
        getSelectedServersAirflow(sendResponse);
      } else {
        getSelectedServers(sendResponse);
      }
      break;
    case "scrollToLastOption":
      if (isAirflowUrl()) {
        scrollToLastOptionAirflow();
      } else {
        scrollToLastOption();
      }
      break;
    case "clearSelection":
      if (isAirflowUrl()) {
        clearSelectionAirflow();
        return true;
      } else {
        clearSelection();
      }
      break;
    case "findMultipleSelects":
      if (isAirflowUrl()) {
        findMultipleSelectsAirflow(sendResponse);
      } else {
        findMultipleSelects(sendResponse);
      }
      break;
    case "highlightSelect":
      if (isAirflowUrl()) {
        highlightSelectAirflow(message.index);
      } else {
        highlightSelect(message.index);
      }
      break;
    case "unhighlightSelect":
      if (isAirflowUrl()) {
        unhighlightSelectAirflow();
      } else {
        unhighlightSelect();
      }
      break;
    case "getActiveSelectInfo":
      if (isAirflowUrl()) {
        getActiveSelectInfoAirflow(sendResponse);
        return true;
      } else {
        getActiveSelectInfo(sendResponse);
      }
      break;
    case "fetchOptionsUsingRegex":
      if (isAirflowUrl()) {
        fetchOptionsUsingRegexAirflow(message.regex, sendResponse);
        return true;
      } else {
        const regex = new RegExp(message.regex);
        const selectElement = document.querySelectorAll('select[multiple]')[activeSelectIndex];
        if (!selectElement) {
          return;
        }
        const options = Array.from(selectElement.options);
        const matchedOptions = options.filter(option => regex.test(option.text)).map(option => option.value);
        sendResponse({matchedOptions: matchedOptions});
      }
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
  // Reset styles from both implementations to avoid conflicts
  resetSelectStyles();
  resetInputStylesAirflow();
  const selectElement = document.querySelectorAll('select[multiple]')[index];
  if (selectElement) {
    selectElement.style.border = '2px solid red';
    activeSelectIndex = index;
    activeInputFieldAirflow = null; // Clear Airflow-specific state
    const yOffset = -100;
    const elementTop = selectElement.getBoundingClientRect().top + window.pageYOffset;
    const topPosition = elementTop + yOffset;
    window.scrollTo({ top: topPosition, behavior: 'smooth' });
  }
}

function unhighlightSelect() {
  resetSelectStyles();
  resetInputStylesAirflow();
  activeSelectIndex = null;
  activeInputFieldAirflow = null;
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
  if (activeSelectIndex === null) return;
  const selectElement = document.querySelectorAll('select[multiple]')[activeSelectIndex];
  if (selectElement && selectElement.options.length) {
    selectElement.options[selectElement.options.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

function scrollToLastOptionAirflow() {
  if (activeSelectIndex === null) return;
  const inputFields = findAirflowInputFields();
  if (inputFields[activeSelectIndex]) {
    inputFields[activeSelectIndex].scrollIntoView({ behavior: 'smooth', block: 'end' });
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

let activeInputFieldAirflow = null;

function findAirflowInputFields() {
  const inputFields = [];
  const seenInputs = new Set();
  
  const targetsListContainer = document.querySelector('#element_targets_list');
  if (targetsListContainer) {
    const mainInput = targetsListContainer.querySelector('input[placeholder*="Select"], input[type="text"]:not([type="hidden"])');
    if (mainInput && !seenInputs.has(mainInput)) {
      inputFields.push(mainInput);
      seenInputs.add(mainInput);
    }
  }
  
  if (inputFields.length === 0) {
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    const selectInputs = allInputs.filter(i => {
      const hasSelectPlaceholder = i.placeholder?.includes('Select');
      const notInTargetsList = !i.closest('#element_targets_list');
      const notSeen = !seenInputs.has(i);
      return hasSelectPlaceholder && notInTargetsList && notSeen;
    });
    
    if (selectInputs.length > 0) {
      inputFields.push(selectInputs[0]);
      seenInputs.add(selectInputs[0]);
    }
  }
  
  return inputFields;
}

function findMultipleSelectsAirflow(sendResponse) {
  const inputFields = findAirflowInputFields();
  
  const selectData = inputFields.map((input, index) => {
    const buttonText = input.value || input.placeholder || null;
    return {
      index: index,
      buttonText: buttonText,
    };
  });

  sendResponse({selects: selectData});
}

function highlightSelectAirflow(index) {
  // Reset styles from both implementations to avoid conflicts
  resetInputStylesAirflow();
  resetSelectStyles();
  const inputFields = findAirflowInputFields();
  
  if (inputFields[index]) {
    inputFields[index].style.border = '2px solid red';
    activeSelectIndex = index;
    activeInputFieldAirflow = inputFields[index];
    const yOffset = -100;
    const elementTop = inputFields[index].getBoundingClientRect().top + window.pageYOffset;
    const topPosition = elementTop + yOffset;
    window.scrollTo({ top: topPosition, behavior: 'smooth' });
  }
}

function unhighlightSelectAirflow() {
  resetInputStylesAirflow();
  resetSelectStyles();
  activeSelectIndex = null;
  activeInputFieldAirflow = null;
}

function resetInputStylesAirflow() {
  const inputFields = findAirflowInputFields();
  inputFields.forEach(input => {
    input.style.border = '';
  });
}

async function getActiveSelectInfoAirflow(sendResponse) {
  const inputFields = findAirflowInputFields();
  
  if (!inputFields[activeSelectIndex]) {
    sendResponse({error: "Input element not found."});
    return;
  }

  const inputField = inputFields[activeSelectIndex];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  const activeInput = inputFields[activeSelectIndex];
  const targetsList = document.querySelector('#element_targets_list');
  
  let container = activeInput.closest('#element_targets_list');
  if (!container) {
    container = activeInput.closest('[role="combobox"]');
  }
  if (!container) {
    container = activeInput.closest('[class*="react-select"], [class*="chakra-select"]');
  }
  if (!container) {
    container = activeInput.parentElement;
  }
  
  let hiddenInputs = [];
  if (targetsList) {
    hiddenInputs = Array.from(targetsList.querySelectorAll('input[type="hidden"]')).filter(input => {
      const name = input.getAttribute('name');
      return !name || name.includes('targets_list') || name.includes('element_targets');
    });
  }
  
  if (hiddenInputs.length === 0 && container) {
    hiddenInputs = Array.from(container.querySelectorAll('input[type="hidden"]'));
  }
  if (hiddenInputs.length === 0) {
    const parent = activeInput.parentElement;
    if (parent) {
      hiddenInputs = parent.querySelectorAll('input[type="hidden"]');
    }
  }
  if (hiddenInputs.length === 0) {
    const form = activeInput.closest('form, [role="form"]');
    if (form) {
      hiddenInputs = form.querySelectorAll('input[type="hidden"]');
    }
  }
  
  const selectedFromHidden = Array.from(hiddenInputs).map(input => input.value.trim()).filter(v => v);
  let selectedChips = [];
  
  if (targetsList) {
    const allSpans = Array.from(targetsList.querySelectorAll('span'));
    selectedChips = allSpans.filter(span => {
      const hasTextSpan = span.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
      const hasRemoveButton = span.querySelector('[aria-label*="Remove"], svg, [role="button"]');
      const isVisible = span.offsetParent !== null;
      const hasText = span.textContent.trim().length > 0;
      return hasText && isVisible && (hasRemoveButton || hasTextSpan);
    });
    
    if (selectedChips.length === 0) {
      const chipSpansWithRemove = Array.from(targetsList.querySelectorAll('span[aria-label*="Remove"]'));
      selectedChips = chipSpansWithRemove;
    }
    
    if (selectedChips.length === 0) {
      const chipSpansWithSvg = Array.from(targetsList.querySelectorAll('span')).filter(span => {
        const hasSvg = span.querySelector('svg');
        const text = span.textContent.trim();
        const isVisible = span.offsetParent !== null;
        return hasSvg && text.length > 0 && text.length < 100 && isVisible;
      });
      selectedChips = chipSpansWithSvg;
    }
    
    selectedChips = Array.from(new Set(selectedChips));
  }
  
  if (selectedChips.length === 0 && container) {
    selectedChips = Array.from(container.querySelectorAll('*')).filter(el => {
      const hasRemoveButton = el.querySelector('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"], svg');
      const hasChipClasses = el.className && (
        el.className.includes('multiValue') || 
        el.className.includes('chakra-tag') || 
        el.className.includes('multi-value') || 
        el.className.includes('tag') ||
        el.className.includes('chip') ||
        el.className.includes('badge')
      );
      const isVisible = el.offsetParent !== null;
      const hasText = el.textContent && el.textContent.trim().length > 0;
      return (hasRemoveButton || hasChipClasses) && isVisible && hasText;
    });
  }
  
  if (selectedChips.length === 0) {
    const parent = activeInput.parentElement;
    if (parent) {
      selectedChips = Array.from(parent.querySelectorAll('*')).filter(el => {
        const hasRemoveButton = el.querySelector('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"], svg');
        const hasChipClasses = el.className && (
          el.className.includes('multiValue') || 
          el.className.includes('chakra-tag') || 
          el.className.includes('multi-value') || 
          el.className.includes('tag') ||
          el.className.includes('chip') ||
          el.className.includes('badge')
        );
        const isVisible = el.offsetParent !== null;
        const hasText = el.textContent && el.textContent.trim().length > 0;
        return (hasRemoveButton || hasChipClasses) && isVisible && hasText;
      });
    }
  }
  
  if (selectedChips.length === 0 && container) {
    const allElements = container.querySelectorAll('div, span, button');
    selectedChips = Array.from(allElements).filter(el => {
      const text = el.textContent.trim();
      const hasCloseIcon = el.querySelector('svg, [class*="close"], [class*="remove"], button');
      const isVisible = el.offsetParent !== null;
      const textLength = text.length;
      const isClickable = el.getAttribute('role') === 'button' || el.tagName === 'BUTTON' || el.onclick;
      return textLength > 0 && textLength < 100 && isVisible && (hasCloseIcon || isClickable);
    });
  }
  
  if (selectedChips.length === 0) {
    const inputParent = activeInput.parentElement;
    if (inputParent) {
      const siblings = Array.from(inputParent.children).filter(el => el !== activeInput);
      const allCandidates = [...siblings, ...Array.from(inputParent.querySelectorAll('div, span'))];
      
      selectedChips = allCandidates.filter(el => {
        const text = el.textContent.trim();
        const isVisible = el.offsetParent !== null;
        const hasReasonableText = text.length > 0 && text.length < 100;
        const isNotInput = el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT';
        const hasCloseOrButton = el.querySelector('svg, button, [class*="close"], [class*="remove"]') || 
                                 el.getAttribute('role') === 'button' ||
                                 el.onclick;
        return isVisible && hasReasonableText && isNotInput && hasCloseOrButton;
      }).slice(0, 20);
    }
  }
  
  const selectedFromChips = selectedChips
    .map(chip => {
      const textSpan = chip.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
      if (textSpan) {
        const text = textSpan.textContent.trim();
        if (text) return text;
      }
      const clone = chip.cloneNode(true);
      const removeButtons = clone.querySelectorAll('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"], svg, [role="button"]');
      removeButtons.forEach(btn => btn.remove());
      const text = clone.textContent.trim();
      return text;
    })
    .filter(text => text !== null && text !== '' && text.length > 0);
  
  const allSelectedValues = [...selectedFromHidden, ...selectedFromChips];
  const seenValues = new Set();
  const originalSelectedValues = [];
  
  for (const value of allSelectedValues) {
    const normalized = value.toLowerCase().trim();
    if (!seenValues.has(normalized)) {
      seenValues.add(normalized);
      originalSelectedValues.push(value);
    }
  }
  
  const selectedValues = new Set([
    ...selectedFromHidden.map(v => v.toLowerCase().trim()),
    ...selectedFromChips.map(v => v.toLowerCase().trim())
  ]);
  
  let availableOptions = [];
  
  if (originalSelectedValues.length > 0) {
    const quickOptions = originalSelectedValues.map(text => ({
      value: text,
      text: text,
      selected: true
    }));
    
    (async () => {
      try {
        inputField.focus();
        nativeSetter.call(inputField, ' ');
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        
        const optionNodes = document.querySelectorAll('[role="option"], [id*="-option-"], .chakra-react-select__option');
        availableOptions = Array.from(new Set(Array.from(optionNodes).map(el => el.textContent.trim())));
        
        nativeSetter.call(inputField, '');
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {
      }
    })();
    
    sendResponse({index: activeSelectIndex, options: quickOptions});
    return;
  }
  
  try {
    inputField.focus();
    nativeSetter.call(inputField, ' ');
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    
    const optionNodes = document.querySelectorAll('[role="option"], [id*="-option-"], .chakra-react-select__option');
    availableOptions = Array.from(new Set(Array.from(optionNodes).map(el => el.textContent.trim())));
    
    nativeSetter.call(inputField, '');
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (e) {
  }
  
  if (availableOptions.length === 0) {
    availableOptions = [];
  }
  
  const options = availableOptions.map(text => {
    const normalizedText = text.toLowerCase().trim();
    return {
      value: text,
      text: text,
      selected: selectedValues.has(normalizedText)
    };
  });
  
  originalSelectedValues.forEach(originalText => {
    const normalizedSelected = originalText.toLowerCase().trim();
    const alreadyIncluded = options.some(opt => opt.text.toLowerCase().trim() === normalizedSelected);
    if (!alreadyIncluded && originalText) {
      options.push({
        value: originalText,
        text: originalText,
        selected: true
      });
    }
  });
  
  sendResponse({index: activeSelectIndex, options: options});
}

async function selectServersAirflow(serverNames, sendResponse) {
  const inputFields = findAirflowInputFields();
  
  if (!inputFields[activeSelectIndex]) {
    if (sendResponse) sendResponse({done: true});
    return;
  }

  const inputField = inputFields[activeSelectIndex];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  
  const parsePattern = (p) => {
    if (p instanceof RegExp) return p;
    if (typeof p === 'string' && p.startsWith('/') && p.endsWith('/')) {
      const match = p.match(/^\/(.+)\/([gimuy]*)$/);
      if (match) {
        return new RegExp(match[1], match[2] || 'i');
      }
      return new RegExp(p.slice(1, -1), 'i');
    }
    return p;
  };

  const patterns = serverNames.map(parsePattern);
  const results = { matched: [], notMatched: [] };
  const targetsList = document.querySelector('#element_targets_list');
  let currentlySelected = [];
  
  if (targetsList) {
    const hiddenInputs = Array.from(targetsList.querySelectorAll('input[type="hidden"]')).filter(input => {
      const name = input.getAttribute('name');
      return name && (name.includes('targets_list') || name.includes('element_targets'));
    });
    const selectedFromHidden = Array.from(hiddenInputs).map(input => input.value.trim()).filter(v => v);
    
    const chipSpans = Array.from(targetsList.querySelectorAll('span')).filter(span => {
      const hasTextSpan = span.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
      const hasRemoveButton = span.querySelector('[aria-label*="Remove"], svg, [role="button"]');
      const isVisible = span.offsetParent !== null;
      const hasText = span.textContent.trim().length > 0;
      return hasText && isVisible && (hasRemoveButton || hasTextSpan);
    });
    
    const selectedFromChips = chipSpans.map(chip => {
      const textSpan = chip.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
      if (textSpan) {
        const text = textSpan.textContent.trim();
        if (text) return text;
      }
      const clone = chip.cloneNode(true);
      const removeButtons = clone.querySelectorAll('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"], svg, [role="button"]');
      removeButtons.forEach(btn => btn.remove());
      return clone.textContent.trim();
    }).filter(text => text !== null && text !== '' && text.length > 0);
    
    currentlySelected = [...selectedFromHidden, ...selectedFromChips];
  }
  
  const normalizedCurrentlySelected = new Set(currentlySelected.map(v => v.toLowerCase().trim()));
  const normalizedNewSelections = new Set(serverNames.map(v => v.toLowerCase().trim()));
  const toRemove = currentlySelected.filter(current => {
    const normalized = current.toLowerCase().trim();
    return !normalizedNewSelections.has(normalized);
  });
  
  for (const targetToRemove of toRemove) {
    if (targetsList) {
      const chipSpans = Array.from(targetsList.querySelectorAll('span'));
      for (const span of chipSpans) {
        const textSpan = span.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
        let spanText = '';
        if (textSpan) {
          spanText = textSpan.textContent.trim();
        } else {
          const clone = span.cloneNode(true);
          const removeButtons = clone.querySelectorAll('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"], svg, [role="button"]');
          removeButtons.forEach(btn => btn.remove());
          spanText = clone.textContent.trim();
        }
        
        if (spanText.toLowerCase().trim() === targetToRemove.toLowerCase().trim()) {
          const removeButton = span.querySelector('[aria-label*="Remove"], [role="button"], button, svg');
          if (removeButton) {
            removeButton.click();
            await new Promise(r => setTimeout(r, 200));
            break;
          }
        }
      }
    }
  }

  let currentlySelectedAfterRemoval = [];
  if (targetsList) {
    const hiddenInputs = Array.from(targetsList.querySelectorAll('input[type="hidden"]')).filter(input => {
      const name = input.getAttribute('name');
      return name && (name.includes('targets_list') || name.includes('element_targets'));
    });
    const selectedFromHidden = Array.from(hiddenInputs).map(input => input.value.trim()).filter(v => v);
    
    const chipSpans = Array.from(targetsList.querySelectorAll('span')).filter(span => {
      const hasTextSpan = span.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
      const hasRemoveButton = span.querySelector('[aria-label*="Remove"], svg, [role="button"]');
      const isVisible = span.offsetParent !== null;
      const hasText = span.textContent.trim().length > 0;
      return hasText && isVisible && (hasRemoveButton || hasTextSpan);
    });
    
    const selectedFromChips = chipSpans.map(chip => {
      const textSpan = chip.querySelector('span:not([aria-label*="Remove"]):not([role="button"])');
      if (textSpan) {
        const text = textSpan.textContent.trim();
        if (text) return text;
      }
      const clone = chip.cloneNode(true);
      const removeButtons = clone.querySelectorAll('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"], svg, [role="button"]');
      removeButtons.forEach(btn => btn.remove());
      return clone.textContent.trim();
    }).filter(text => text !== null && text !== '' && text.length > 0);
    
    currentlySelectedAfterRemoval = [...selectedFromHidden, ...selectedFromChips];
  }
  
  const normalizedCurrentlySelectedAfterRemoval = new Set(
    currentlySelectedAfterRemoval.map(v => v.toLowerCase().trim())
  );

  inputField.focus();
  nativeSetter.call(inputField, ' ');
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 800));

  const optionNodes = document.querySelectorAll('[role="option"], [id*="-option-"], .chakra-react-select__option');
  const availableOptions = Array.from(new Set(Array.from(optionNodes).map(el => el.textContent.trim())));

  const toAdd = new Set();
  patterns.forEach(p => {
    const found = availableOptions.filter(opt => 
      p instanceof RegExp ? p.test(opt) : opt.toLowerCase() === p.toLowerCase()
    );
    if (found.length > 0) {
      found.forEach(f => {
        const normalized = f.toLowerCase().trim();
        if (!normalizedCurrentlySelectedAfterRemoval.has(normalized)) {
          toAdd.add(f);
        }
      });
    } else if (!(p instanceof RegExp)) {
      const normalized = p.toLowerCase().trim();
      if (!normalizedCurrentlySelectedAfterRemoval.has(normalized)) {
        toAdd.add(p);
      }
    } else {
      results.notMatched.push(p.toString());
    }
  });

  for (const target of toAdd) {
    inputField.focus();
    nativeSetter.call(inputField, target);
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));

    inputField.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', keyCode: 13, which: 13, bubbles: true
    }));
    
    await new Promise(r => setTimeout(r, 300));
    
    if (document.querySelector(`input[type="hidden"][value="${target}"]`)) {
      results.matched.push(target);
    } else {
      results.notMatched.push(target);
    }
  }

  nativeSetter.call(inputField, '');
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  
  if (sendResponse) {
    sendResponse({done: true, matched: results.matched, notMatched: results.notMatched});
  }
}

function getSelectedServersAirflow(sendResponse) {
  const inputFields = findAirflowInputFields();
  
  if (!inputFields[activeSelectIndex]) {
    sendResponse({selectedServers: []});
    return;
  }

  const activeInput = inputFields[activeSelectIndex];
  
  let container = activeInput.closest('#element_targets_list');
  if (!container) {
    container = activeInput.closest('[role="combobox"]');
  }
  if (!container) {
    container = activeInput.closest('[class*="react-select"], [class*="chakra-select"]');
  }
  if (!container) {
    container = activeInput.parentElement;
  }
  
  let hiddenInputs = container ? container.querySelectorAll('input[type="hidden"]') : [];
  if (hiddenInputs.length === 0) {
    const parent = activeInput.parentElement;
    if (parent) {
      hiddenInputs = parent.querySelectorAll('input[type="hidden"]');
    }
  }
  if (hiddenInputs.length === 0) {
    const form = activeInput.closest('form, [role="form"]');
    if (form) {
      hiddenInputs = form.querySelectorAll('input[type="hidden"]');
    }
  }
  
  const selectedFromHidden = Array.from(hiddenInputs).map(input => input.value.trim()).filter(v => v);
  
  let selectedChips = container ? container.querySelectorAll('[class*="multiValue"], [class*="chakra-tag"], [class*="multi-value"], [class*="tag"]') : [];
  if (selectedChips.length === 0) {
    const parent = activeInput.parentElement;
    if (parent) {
      selectedChips = parent.querySelectorAll('[class*="multiValue"], [class*="chakra-tag"], [class*="multi-value"], [class*="tag"]');
    }
  }
  
  const selectedFromChips = Array.from(selectedChips)
    .map(chip => {
      const text = chip.textContent.trim();
      if (!text) return null;
      
      const removeButton = chip.querySelector('[aria-label*="Remove"], button[aria-label*="Remove"], [class*="remove"], [class*="close"]');
      if (removeButton) {
        return text;
      }
      const isVisible = chip.offsetParent !== null;
      if (isVisible && text) {
        return text;
      }
      return null;
    })
    .filter(text => text !== null && text !== '');
  
  const selectedServers = Array.from(new Set([...selectedFromHidden, ...selectedFromChips]));
  sendResponse({selectedServers: selectedServers});
}

async function clearSelectionAirflow() {
  if (activeSelectIndex === null) return;
  
  const inputFields = findAirflowInputFields();
  if (!inputFields[activeSelectIndex]) return;
  
  const activeInput = inputFields[activeSelectIndex];
  
  // Find container for active input field
  let container = activeInput.closest('#element_targets_list');
  if (!container) {
    container = activeInput.closest('[role="combobox"]');
  }
  if (!container) {
    container = activeInput.closest('[class*="react-select"], [class*="chakra-select"]');
  }
  if (!container) {
    container = activeInput.parentElement;
  }
  
  // Remove chips only from the active select container
  if (container) {
    const removeButtons = container.querySelectorAll('[aria-label*="Remove"], [class*="remove"], button[aria-label*="Remove"]');
    for (const button of removeButtons) {
      button.click();
      await new Promise(r => setTimeout(r, 100));
    }
    
    const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
    hiddenInputs.forEach(input => {
      const chipContainer = input.closest('[role="listbox"], .chakra-react-select__multi-value, [class*="multiValue"], [class*="chakra-tag"]');
      if (chipContainer && container.contains(chipContainer)) {
        const removeButton = chipContainer.querySelector('[aria-label*="Remove"], [class*="remove"], button');
        if (removeButton) {
          removeButton.click();
        }
      }
    });
  }
}

async function fetchOptionsUsingRegexAirflow(regexPattern, sendResponse) {
  const inputFields = findAirflowInputFields();
  
  if (!inputFields[activeSelectIndex]) {
    sendResponse({matchedOptions: []});
    return;
  }

  const inputField = inputFields[activeSelectIndex];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  const regex = new RegExp(regexPattern);

  inputField.focus();
  nativeSetter.call(inputField, ' ');
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 800));

  const optionNodes = document.querySelectorAll('[role="option"], [id*="-option-"], .chakra-react-select__option');
  const availableOptions = Array.from(new Set(Array.from(optionNodes).map(el => el.textContent.trim())));
  
  const matchedOptions = availableOptions.filter(opt => regex.test(opt));

  nativeSetter.call(inputField, '');
  inputField.dispatchEvent(new Event('input', { bubbles: true }));

  sendResponse({matchedOptions: matchedOptions});
}
