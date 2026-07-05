document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('productSelect');
  const fillBtn = document.getElementById('fillBtn');
  const optionsBtn = document.getElementById('optionsBtn');

  // Load saved records
  const { records = [] } = await chrome.storage.local.get('records');
  select.innerHTML = records.map((r, i) =>
    `<option value="${i}">${r.name || 'Unnamed'}</option>`
  ).join('');

  // Fill form button
  fillBtn.addEventListener('click', async () => {
    const index = select.value;
    if (index === undefined || !records[index]) return;
    const product = records[index];

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes('seller.meesho.com')) {
      alert('Please open a Meesho seller listing page first.');
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: 'fillForm', product });
  });

  // Open options page
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});