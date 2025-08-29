(function () {
  const regionSel = document.getElementById('filter-region');
  const xpSel = document.getElementById('filter-experience');
  const budgetInput = document.getElementById('max-budget');
  const applyBtn = document.getElementById('apply-filters');
  const resetBtn = document.getElementById('reset-filters');
  const grid = document.getElementById('destinations-grid');
  const itineraryList = document.getElementById('itinerary-list');
  const clearBtn = document.getElementById('clear-itinerary');
  const daysInput = document.getElementById('days');
  const travelersInput = document.getElementById('travelers');
  const subtotalEl = document.getElementById('subtotal');
  const grandEl = document.getElementById('grandtotal');

  if (!grid) return;

  const TAX_RATE = 0.12;

  function parseRupees(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatINR(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  }

  function getCards() {
    return Array.from(grid.querySelectorAll('.card'));
  }

  function applyFilters() {
    const region = (regionSel.value || '').toLowerCase();
    const xp = (xpSel.value || '').toLowerCase();
    const maxBudget = parseRupees(budgetInput.value);

    getCards().forEach(card => {
      const cRegion = (card.getAttribute('data-region') || '').toLowerCase();
      const cXp = (card.getAttribute('data-experience') || '').toLowerCase();
      const cost = parseRupees(card.getAttribute('data-cost'));

      const regionOk = !region || cRegion === region;
      const xpOk = !xp || cXp === xp;
      const budgetOk = !maxBudget || cost <= maxBudget;

      card.style.display = (regionOk && xpOk && budgetOk) ? '' : 'none';
    });
  }

  function resetFilters() {
    regionSel.value = '';
    xpSel.value = '';
    budgetInput.value = '';
    applyFilters();
  }

  // Itinerary state
  const itinerary = new Map(); // id -> { name, cost }

  function syncItineraryUI() {
    itineraryList.innerHTML = '';
    let subtotal = 0;

    itinerary.forEach((item, id) => {
      subtotal += item.cost;
      const li = document.createElement('li');
      li.style.margin = '0.25rem 0';
      li.innerHTML = `${item.name} — <strong>${formatINR(item.cost)}</strong> <button data-remove="${id}" style="margin-left:0.5rem;background:#b33;">Remove</button>`;
      itineraryList.appendChild(li);
    });

    subtotalEl.textContent = formatINR(subtotal);

    const days = Math.max(1, parseRupees(daysInput.value));
    const travelers = Math.max(1, parseRupees(travelersInput.value));
    const total = Math.round(subtotal * days * travelers * (1 + TAX_RATE));
    grandEl.textContent = formatINR(total);
  }

  function addToItinerary(card) {
    const id = card.getAttribute('data-id');
    const name = card.querySelector('h4')?.textContent || id;
    const cost = parseRupees(card.getAttribute('data-cost'));
    itinerary.set(id, { name, cost });
    syncItineraryUI();
  }

  function removeFromItinerary(id) {
    itinerary.delete(id);
    syncItineraryUI();
  }

  // Events
  applyBtn?.addEventListener('click', applyFilters);
  resetBtn?.addEventListener('click', resetFilters);
  [regionSel, xpSel, budgetInput].forEach(el => el?.addEventListener('change', applyFilters));

  daysInput?.addEventListener('input', syncItineraryUI);
  travelersInput?.addEventListener('input', syncItineraryUI);
  clearBtn?.addEventListener('click', () => { itinerary.clear(); syncItineraryUI(); });

  grid.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('btn-add')) {
      const card = target.closest('.card');
      if (card) addToItinerary(card);
    } else if (target.classList.contains('btn-details')) {
      const card = target.closest('.card');
      const id = card?.getAttribute('data-id') || '';
      const lpUrl = id ? `https://www.lonelyplanet.com/search?q=${encodeURIComponent(id)}` : target.getAttribute('data-url');
      if (lpUrl) window.open(lpUrl, '_blank');
    } else if (target.getAttribute('data-remove')) {
      const id = target.getAttribute('data-remove');
      if (id) removeFromItinerary(id);
    }
  });

  // Initialize
  applyFilters();
  syncItineraryUI();
})();
