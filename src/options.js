// Saves options to chrome.storage
const saveOptions = () => {
    const openai_apikey = document.getElementById('openai_apikey').value;
  
    chrome.storage.sync.set(
      { openai_apikey: openai_apikey },
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
   
        document.getElementById('openai_apikey').value = items.openai_apikey;
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);
