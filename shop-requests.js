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
      const shopsButton = document.createElement('button');
      shopsButton.type='button';
      shopsButton.innerHTML='🏪 <strong>Торгові точки</strong><small>Редагування та коди 1С</small>';
      shopsButton.addEventListener('click', () => openPanel('shops'));
      grid.appendChild(shopsButton);
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
    title.textContent = mode === 'new' ? 'Нова торгова точка' : mode === 'admin' ? 'Заявки на підтвердження' : mode === 'shops' ? 'Торгові точки' : 'Мої заявки';
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
          message.textContent = 'Заявку надіслано. Точку можна обрати для замовлення вже зараз.';
          if (typeof loadShops === 'function') await loadShops();
          form.reset();
        } catch (err) { message.textContent = err.message; }
        finally { button.disabled = false; }
      });
    } else if (mode === 'shops') loadShopAdmin();
    else loadList(mode);
  }
  async function loadShopAdmin() {
    content.textContent='Завантаження…';
    try {
      const rows=await request('/api/crm/shops/all');
      content.innerHTML=`<input id="shopAdminSearch" placeholder="Пошук за назвою, адресою або ID" style="width:100%;padding:12px;margin-bottom:12px" /><div id="shopAdminList"></div>`;
      const search=content.querySelector('#shopAdminSearch'), list=content.querySelector('#shopAdminList');
      function draw() {
        const q=search.value.trim().toLowerCase();
        const selected=rows.filter(r=>[r.id,r.name,r.address,r.district].join(' ').toLowerCase().includes(q)).slice(0,70);
        list.innerHTML=selected.map(r=>`<article class="shop-request-card">
          <strong>${escapeHtml(r.name)}</strong><div>${escapeHtml(r.address)}</div>
          <small>ID ${r.id} · ${r.isRequestShop?'Нова точка':'Excel'} · ${r.requestStatus==='pending'?'Очікує підтвердження':''} ${r.isActive?'':'· Вимкнено'}</small>
          <button type="button" data-shop-edit="${r.id}">Редагувати</button></article>`).join('') || '<p>Точок не знайдено</p>';
        list.querySelectorAll('[data-shop-edit]').forEach(b=>b.addEventListener('click',()=>editShop(rows.find(r=>String(r.id)===b.dataset.shopEdit))));
      }
      search.addEventListener('input',draw);draw();
    } catch(e) {content.textContent=e.message;}
  }
  async function editShop(shop) {
    if (!shop) return;
    // Contacts are stored separately in ShopContacts and loaded via the existing admin-protected card API.
    let contact = {phone:'', contactPerson:'', note:''};
    content.textContent = 'Завантажуємо дані точки…';
    try {
      contact = await request(`/api/crm/shop-card/${shop.id}`);
    } catch (err) {
      content.textContent = `Не вдалося завантажити контакти: ${err.message}`;
      return; // Never show blank contact inputs that could overwrite existing data.
    }
    content.innerHTML=`<button type="button" id="shopEditBack">← До списку</button><h3>Точка №${shop.id}</h3>
      <form id="shopEditForm">
      <label>Назва<input name="name" maxlength="150" minlength="2" required value="${escapeHtml(shop.name)}"></label>
      <label>Адреса<input name="address" maxlength="250" minlength="5" required value="${escapeHtml(shop.address)}"></label>
      <label>Район<input name="district" maxlength="100" value="${escapeHtml(shop.district)}"></label>
      <label>Телефон<input type="tel" name="phone" maxlength="40" value="${escapeHtml(contact.phone)}" placeholder="+380..."></label>
      <label>Контактна особа<input name="contactPerson" maxlength="120" value="${escapeHtml(contact.contactPerson)}" placeholder="Ім’я та прізвище"></label>
      <label>Коментар для точки<textarea name="note" maxlength="1000" rows="3" placeholder="Інформація для торгового">${escapeHtml(contact.note)}</textarea></label>
      <label>Тип ціни<select name="priceType"><option value="Розница" ${shop.priceType!=='Опт'?'selected':''}>Розница</option><option value="Опт" ${shop.priceType==='Опт'?'selected':''}>Опт</option></select></label>
      <label>Код торгової точки в 1С<input name="code1C" maxlength="80" value="${escapeHtml(shop.code1C)}" placeholder="Код з 1С"></label>
      <label><input name="isActive" type="checkbox" ${shop.isActive?'checked':''}> Активна точка</label>
      <button type="submit">Зберегти зміни</button><p id="shopEditMessage" role="status"></p></form>`;
    content.querySelector('#shopEditBack').addEventListener('click',loadShopAdmin);
    const form=content.querySelector('#shopEditForm');
    form.addEventListener('submit',async e=>{
      e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;
      const data=Object.fromEntries(new FormData(form));data.isActive=form.elements.isActive.checked;
      const contacts={phone:data.phone,contactPerson:data.contactPerson,note:data.note};
      delete data.phone;delete data.contactPerson;delete data.note;
      const message=content.querySelector('#shopEditMessage');
      try {
        // Save contacts first. If the second request fails, tell the admin about partial saving.
        await request(`/api/crm/shop-card/${shop.id}/contact`,'PUT',contacts);
        try { await request(`/api/crm/shops/${shop.id}`,'PUT',data); }
        catch (err) {throw new Error(`Контакти збережено, але інші дані точки — ні: ${err.message}`);}
        message.textContent='Усі зміни збережено';
        if(typeof loadShops==='function') await loadShops();
      } catch(err) {content.querySelector('#shopEditMessage').textContent=err.message;}
      finally {btn.disabled=false;}
    });
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
        try { await request(`/api/crm/shop-requests/${button.dataset.id}/review`, 'POST', {status,comment}); if (typeof loadShops === 'function') await loadShops(); await loadList(mode); }
        catch (err) { window.alert(err.message); button.disabled = false; }
      }));
    } catch (err) { content.textContent = err.message; }
  }
})();
