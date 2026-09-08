// Customise this map to match the selectors on Meesho's "Add Product" page
const FIELD_MAP = {
  name: '#product-name',           // Product name input
  description: '#product-description', // Description textarea
  mrp: '#mrp',                     // MRP field
  price: '#selling-price',         // Selling price
  shipping: '#shipping-charge',    // Shipping charge
  category: '#category-input',     // Category (may be a searchable dropdown)
  images: '#image-url-input'       // If the form accepts URLs, else leave empty
};

// Helper to wait for an element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const elem = document.querySelector(selector);
      if (elem) {
        observer.disconnect();
        resolve(elem);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

// Fill a field and trigger React/Angular change event if needed
function setFieldValue(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return false;
  // Try to set value and dispatch events
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// Fill all fields from product object
async function fillForm(product) {
  // Map product keys to field names, skip empty selectors
  for (const [key, selector] of Object.entries(FIELD_MAP)) {
    if (!selector || product[key] === undefined || product[key] === '') continue;
    try {
      await waitForElement(selector);
      setFieldValue(selector, product[key]);
    } catch (e) {
      console.warn(`Could not fill ${key} - ${e.message}`);
    }
  }
  // If images are provided as URLs and the selector exists
  if (product.images && product.images.length && FIELD_MAP.images) {
    try {
      await waitForElement(FIELD_MAP.images);
      setFieldValue(FIELD_MAP.images, product.images.join(', '));
    } catch (e) {}
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm' && request.product) {
    fillForm(request.product).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
});