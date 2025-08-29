(function () {
  const accordion = document.getElementById('itinerary-accordion');
  if (!accordion) return;

  const templateSelect = document.getElementById('template-select');
  const travelerInput = document.getElementById('traveler-count');
  const currencySelect = document.getElementById('currency-select');
  const btnNewDay = document.getElementById('btn-new-day');
  const btnSave = document.getElementById('btn-save');
  const btnLoad = document.getElementById('btn-load');
  const btnClear = document.getElementById('btn-clear');
  const btnPrint = document.getElementById('btn-print');
  const subtotalDayEl = document.getElementById('subtotal-day');
  const tripTotalEl = document.getElementById('trip-total');

  const quickDay = document.getElementById('quick-day');
  const quickTitle = document.getElementById('quick-title');
  const quickCost = document.getElementById('quick-cost');
  const quickAdd = document.getElementById('quick-add');

  const STORAGE_KEY = 'ei.itinerary.v1';

  function formatCurrency(amount) {
    const cur = currencySelect.value || 'INR';
    const locale = cur === 'USD' ? 'en-US' : 'en-IN';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount);
  }

  function getTravelers() {
    const n = Number(travelerInput.value);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function createDay(index) {
    const day = document.createElement('div');
    day.className = 'day open';
    day.setAttribute('data-index', String(index));

    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `<h4>Day ${index}</h4><div><button class="toggle">Collapse</button> <button class="add-act">Add Activity</button> <button class="remove-day" style="background:#a33;">Remove Day</button></div>`;
    const body = document.createElement('div');
    body.className = 'day-body';
    body.innerHTML = `<ul class="activity-list"></ul>`;

    day.appendChild(header);
    day.appendChild(body);
    return day;
  }

  function getDays() {
    return Array.from(accordion.querySelectorAll('.day'));
  }

  function ensureDayExists(dayNumber) {
    while (getDays().length < dayNumber) {
      const newIndex = getDays().length + 1;
      accordion.appendChild(createDay(newIndex));
    }
  }

  function addActivity(dayNumber, title, costPerTraveler) {
    ensureDayExists(dayNumber);
    const day = getDays()[dayNumber - 1];
    const list = day.querySelector('.activity-list');
    const li = document.createElement('li');
    const safeTitle = title && title.trim() ? title.trim() : `Activity ${list.children.length + 1}`;
    const cost = Number(costPerTraveler) || 0;
    li.innerHTML = `<span>${safeTitle}</span><span><strong data-cost="${cost}">${formatCurrency(cost)}</strong> <button class="remove-act" style="margin-left:0.5rem;background:#b33;">Remove</button></span>`;
    list.appendChild(li);
    recalcTotals();
  }

  function recalcTotals() {
    let subtotalPerDay = 0;
    const travelers = getTravelers();

    getDays().forEach(day => {
      const costs = Array.from(day.querySelectorAll('[data-cost]')).map(el => Number(el.getAttribute('data-cost')) || 0);
      const sum = costs.reduce((a, b) => a + b, 0) * travelers;
      subtotalPerDay += sum;
    });

    subtotalDayEl.textContent = formatCurrency(subtotalPerDay);
    tripTotalEl.textContent = formatCurrency(subtotalPerDay * getDays().length);
  }

  function renumberDays() {
    getDays().forEach((day, idx) => {
      const n = idx + 1;
      day.setAttribute('data-index', String(n));
      const h = day.querySelector('.day-header h4');
      if (h) h.textContent = `Day ${n}`;
    });
  }

  function serialize() {
    const data = {
      travelers: getTravelers(),
      currency: currencySelect.value || 'INR',
      days: getDays().map(day => {
        const acts = Array.from(day.querySelectorAll('.activity-list li')).map(li => {
          const title = li.querySelector('span')?.textContent || '';
          const costEl = li.querySelector('[data-cost]');
          const cost = Number(costEl?.getAttribute('data-cost')) || 0;
          return { title, cost };
        });
        return { activities: acts };
      })
    };
    return data;
  }

  function deserialize(data) {
    accordion.innerHTML = '';
    travelerInput.value = String(data.travelers || 1);
    currencySelect.value = data.currency || 'INR';
    const days = Array.isArray(data.days) ? data.days : [];
    days.forEach((d, i) => {
      const day = createDay(i + 1);
      accordion.appendChild(day);
      (d.activities || []).forEach(act => addActivity(i + 1, act.title, act.cost));
    });
    if (days.length === 0) {
      accordion.appendChild(createDay(1));
    }
    recalcTotals();
  }

  function save() {
    try {
      const data = serialize();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      alert('Itinerary saved');
    } catch (e) {
      alert('Failed to save.');
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return alert('No saved itinerary');
      const data = JSON.parse(raw);
      deserialize(data);
    } catch (e) {
      alert('Failed to load.');
    }
  }

  function clearAll() {
    accordion.innerHTML = '';
    accordion.appendChild(createDay(1));
    recalcTotals();
  }

  accordion.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const day = target.closest('.day');

    if (target.classList.contains('toggle')) {
      const isOpen = day?.classList.toggle('open');
      if (target instanceof HTMLButtonElement) target.textContent = isOpen ? 'Collapse' : 'Expand';
    } else if (target.classList.contains('add-act')) {
      const idx = Number(day?.getAttribute('data-index')) || getDays().length;
      addActivity(idx, '', 0);
    } else if (target.classList.contains('remove-day')) {
      day?.remove();
      renumberDays();
      recalcTotals();
    } else if (target.classList.contains('remove-act')) {
      const li = target.closest('li');
      li?.remove();
      recalcTotals();
    }
  });

  btnNewDay?.addEventListener('click', () => {
    accordion.appendChild(createDay(getDays().length + 1));
    recalcTotals();
  });
  btnSave?.addEventListener('click', save);
  btnLoad?.addEventListener('click', load);
  btnClear?.addEventListener('click', clearAll);
  btnPrint?.addEventListener('click', () => window.print());

  quickAdd?.addEventListener('click', () => {
    const day = Math.max(1, Number(quickDay.value) || 1);
    const title = quickTitle.value;
    const cost = Number(quickCost.value) || 0;
    addActivity(day, title, cost);
    if (!templateSelect.value) {
      const exists = getDays().length >= day;
      if (!exists) ensureDayExists(day);
    }
    quickTitle.value = '';
    quickCost.value = '';
  });

  travelerInput?.addEventListener('input', recalcTotals);
  currencySelect?.addEventListener('change', () => {
    // refresh currency display
    Array.from(document.querySelectorAll('[data-cost]')).forEach(el => {
      const cost = Number(el.getAttribute('data-cost')) || 0;
      el.textContent = formatCurrency(cost);
    });
    recalcTotals();
  });

  templateSelect?.addEventListener('change', () => {
    const tpl = templateSelect.value;
    if (!tpl) { clearAll(); return; }
    const data = getTemplateData(tpl);
    deserialize(data);
  });

  function getTemplateData(id) {
    if (id === 'goa-weekend') {
      return {
        travelers: getTravelers(), currency: currencySelect.value || 'INR', days: [
          { activities: [ { title: 'Arrive in Goa, beach sunset', cost: 0 }, { title: 'Seafood dinner', cost: 600 } ] },
          { activities: [ { title: 'Water sports at Calangute', cost: 1200 }, { title: 'Fort Aguada visit', cost: 200 } ] },
          { activities: [ { title: 'Old Goa churches', cost: 150 }, { title: 'Baga night market', cost: 300 } ] }
        ]
      };
    }
    if (id === 'golden-triangle') {
      return {
        travelers: getTravelers(), currency: currencySelect.value || 'INR', days: [
          { activities: [ { title: 'Delhi city tour', cost: 500 }, { title: 'Street food walk', cost: 300 } ] },
          { activities: [ { title: 'Agra Fort & Taj Mahal', cost: 800 } ] },
          { activities: [ { title: 'Drive to Jaipur', cost: 0 }, { title: 'Chokhi Dhani evening', cost: 700 } ] },
          { activities: [ { title: 'Amber Fort & Hawa Mahal', cost: 600 } ] },
          { activities: [ { title: 'Local markets & departure', cost: 0 } ] }
        ]
      };
    }
    if (id === 'kerala-seven') {
      return {
        travelers: getTravelers(), currency: currencySelect.value || 'INR', days: [
          { activities: [ { title: 'Arrive Kochi, Fort Kochi walk', cost: 0 } ] },
          { activities: [ { title: 'Munnar tea gardens', cost: 400 } ] },
          { activities: [ { title: 'Eravikulam National Park', cost: 500 } ] },
          { activities: [ { title: 'Thekkady boating', cost: 350 } ] },
          { activities: [ { title: 'Backwaters houseboat (Alleppey)', cost: 1800 } ] },
          { activities: [ { title: 'Kovalam beach day', cost: 0 } ] },
          { activities: [ { title: 'Thiruvananthapuram city & departure', cost: 0 } ] }
        ]
      };
    }
    return { travelers: getTravelers(), currency: currencySelect.value || 'INR', days: [] };
  }

  // Initialize
  accordion.appendChild(createDay(1));
  recalcTotals();
})();


