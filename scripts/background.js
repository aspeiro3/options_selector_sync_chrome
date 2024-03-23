chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab && message.action) {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
});
