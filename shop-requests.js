"use strict";
// CRM v13 Stage 1: independent request screens. Does not change order workflow.
(() => {
  const api = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
  const userId = Number(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0);
  const isAdmin = [564525966, 587588909].includes(userId);
  const menu = document.getElementById('crmMenu');
  if (!menu) return;
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = '➕ Додати торгову точку →';
  menu.insertBefore(addButton, menu.querySelector('p'));
  const myButton = document.createElement('button');
  myButton.type = 'button';
  myButton.textContent = '📋 Мої заявки →';
  menu.insertBefore(myButton, menu.querySelector('p'));
  if (isAdmin) {
    const grid = document.querySelector('#adminHome .admin-home-grid');
    if (grid) {
      const adminButton = document.createElement('button');
      adminButton.type = 'button';
      adminButton.innerHTML = '📝 <strong>Заявки на підтвердження</strong><small>Нові торгові точки</small>';
      adminButton.addEventListener('click', () => openPanel('admin'));
      grid.appendChild(adminButton);
    }
  }
  const panel = document.createElement('section');
  panel.id = 'shopRequestsPanel';
  panel.setAttribute('aria-label', 'Заявки торгових точок');
  panel.hidden = true;
  panel.innerHTML = `<div class="shop-request-top"><h2 id="shopRequestTitle"></h2><button type="button" id="shopRequestClose">✕</button></div><div id="shopRequestContent"></div>`;
  document.body.appendChild(panel);
  const content = panel.querySelector('#shopRequestContent');
  const title = panel.querySelector('#shopRequestTitle');
  panel.querySelector('#shopRequestClose').addEventListener('click', () => { panel.hidden = true; });
  addButton.addEventListener('click', () => openPanel('new'));
  myButton.addEventListener('click', () => openPanel('mine'));
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(path, method='GET', data) {
    const initData = window.Telegram?.WebApp?.initData || '';
    if (!initData) throw new Error('Відкрийте CRM через Telegram.');
    const response = await fetch(`${api}${path}`, {
      method, cache:'no-store', headers: { 'X-Telegram-Init-Data':initData, ...(data ? {'Content-Type':'application/json'} : {}) },
      ...(data ? {body:JSON.stringify(data)} : {})
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Помилка сервера: ${response.status}`);
    }
    return response.json();
  }
  function openPanel(mode) {
    panel.hidden = false;
    title.textContent = mode === 'new' ? 'Нова торгова точка' : mode === 'admin' ? 'Заявки на підтвердження' : 'Мої заявки';
    if (mode === 'new') {
      content.innerHTML = `<form id="newShopRequestForm">
        <label>Назва магазину<input name="name" maxlength="150" required minlength="2" placeholder="Назва точки"></label>
        <label>Адреса<input name="address" maxlength="250" required minlength="5" placeholder="Місто, вулиця, будинок"></label>
        <label>Район<input name="district" maxlength="100" placeholder="Необов'язково"></label>
        <label>Коментар<textarea name="comment" maxlength="500" rows="3" placeholder="Контакт, орієнтир, примітки"></textarea></label>
        <button type="submit">Надіслати заявку</button><p id="shopRequestMessage" role="status"></p></form>`;
      const form = document.getElementById('newShopRequestForm');
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const button = form.querySelector('[type=submit]'); button.disabled = true;
        const message = document.getElementById('shopRequestMessage');
        try {
          await request('/api/crm/shop-requests', 'POST', Object.fromEntries(new FormData(form)));
          message.textContent = 'Заявку надіслано. Очікуйте підтвердження адміністратора.';
          form.reset();
        } catch (err) { message.textContent = err.message; }
        finally { button.disabled = false; }
      });
    } else loadList(mode);
  }
  async function loadList(mode) {
    content.textContent = 'Завантаження…';
    try {
      const rows = await request('/api/crm/shop-requests');
      content.innerHTML = rows.length ? rows.map(r => `<article class="shop-request-card">
        <strong>${escapeHtml(r.name)}</strong><div>${escapeHtml(r.address)}</div>
        ${r.district ? `<div>${escapeHtml(r.district)}</div>` : ''}
        <small>№${r.id} · ${escapeHtml(r.status)} · ${escapeHtml(r.createdAt.slice(0,10))}</small>
        ${mode === 'admin' ? `<div>Торговий ID: ${r.representativeId}</div>` : ''}
        ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : ''}
        ${r.adminComment ? `<p>Адміністратор: ${escapeHtml(r.adminComment)}</p>` : ''}
        ${mode === 'admin' && r.status === 'pending' ? `<div class="shop-request-actions"><button data-review="approved" data-id="${r.id}">Підтвердити</button><button data-review="rejected" data-id="${r.id}">Відхилити</button></div>` : ''}
        </article>`).join('') : '<p>Заявок поки немає.</p>';
      if (mode === 'admin') content.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', async () => {
        const status = button.dataset.review;
        const comment = status === 'rejected' ? window.prompt('Причина відхилення (необов’язково):', '') : '';
        if (comment === null) return;
        button.disabled = true;
        try { await request(`/api/crm/shop-requests/${button.dataset.id}/review`, 'POST', {status,comment}); await loadList(mode); }
        catch (err) { window.alert(err.message); button.disabled = false; }
      }));
    } catch (err) { content.textContent = err.message; }
  }
})();
