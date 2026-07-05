const form = document.getElementById('addForm');
const listDiv = document.getElementById('productList');

async function renderList() {
  const { records = [] } = await chrome.storage.local.get('records');
  listDiv.innerHTML = records.map((r, i) => `
    <div class="product-card">
      <strong>${r.name || 'Unnamed'}</strong><br>
      Price: ₹${r.price} | MRP: ₹${r.mrp}<br>
      <button data-index="${i}" class="deleteBtn">🗑 Delete</button>
    </div>
  `).join('');
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = e.target.dataset.index;
      const { records } = await chrome.storage.local.get('records');
      records.splice(idx, 1);
      await chrome.storage.local.set({ records });
      renderList();
    });
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const product = {
    name: document.getElementById('pName').value,
    description: document.getElementById('pDesc').value,
    mrp: document.getElementById('pMrp').value,
    price: document.getElementById('pPrice').value,
    shipping: document.getElementById('pShipping').value,
    category: document.getElementById('pCategory').value,
    images: document.getElementById('pImages').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  const { records = [] } = await chrome.storage.local.get('records');
  records.push(product);
  await chrome.storage.local.set({ records });
  form.reset();
  renderList();
});

renderList();