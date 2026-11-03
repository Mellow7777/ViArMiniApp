"use strict";
/* Окремий навігаційний шар. Старий app.js залишається без змін, окрім dev API. */
(function(){
 const home=document.getElementById('crmHome'), menu=document.getElementById('crmMenu'), nav=document.getElementById('crmBottomNav');
 const adminButton=document.getElementById('adminButton');
 const user=window.Telegram?.WebApp?.initDataUnsafe?.user;
 const name=user?.first_name?.trim();
 document.getElementById('crmGreeting').textContent=name?`Вітаємо, ${name}!`:'Вітаємо у ViAr CRM';
 document.getElementById('crmToday').textContent=new Intl.DateTimeFormat('uk-UA',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 const isAdmin=Boolean(user&&[564525966,587588909].includes(Number(user.id)));
 document.querySelectorAll('.crm-admin-only').forEach(el=>el.hidden=!isAdmin);
 function closeProfileOnNavigation(){
  const panel=document.getElementById('profilePanel');
  if(!panel || panel.hidden)return;
  // Use the existing app.js close handler; it also clears profile-open.
  document.getElementById('closeProfileButton')?.click();
  panel.hidden=true;
  document.body.classList.remove('profile-open');
 }
 function closeRouteOnNavigation(){
  const panel=document.getElementById('myRoutePanel');
  if(!panel || panel.hidden)return;
  // Route panel belongs to legacy app.js. Hide it without resetting route data.
  panel.hidden=true;
  document.getElementById('myRouteButton')?.setAttribute('aria-expanded','false');
 }
 function go(page){
  if(page==='admin'&&!isAdmin)return;
  // Profile is a full-screen overlay. Close it before changing CRM pages.
  if(page!=='profile')closeProfileOnNavigation();
  if(page!=='route')closeRouteOnNavigation();
  document.body.classList.toggle('crm-order',page==='order'||page==='route'||page==='profile'||page==='admin');
  document.body.classList.toggle('crm-mode',page==='home'||page==='menu');
  home.hidden=page!=='home';menu.hidden=page!=='menu';
  nav.querySelectorAll('[data-crm-go]').forEach(b=>b.classList.toggle('active',b.dataset.crmGo===page));
  if(page==='route'){
   const panel=document.getElementById('myRoutePanel');
   if(panel?.hidden)document.getElementById('myRouteButton')?.click();
   document.getElementById('myRouteButton')?.scrollIntoView({block:'start'});
  }
  if(page==='profile')document.getElementById('profileButton')?.click();
  if(page==='admin')adminButton?.click();
  if(page==='home'||page==='menu'){
   // The old profile CSS locks body scrolling; restore it after navigation.
   document.body.classList.remove('profile-open');
   if(!document.querySelector('.cart-drawer.show, .product-modal.show')){
    document.body.style.overflow='';
   }
   window.scrollTo({top:0,left:0,behavior:'instant'});
  }
  if(page==='home')loadDashboard();
 }
 document.querySelectorAll('[data-crm-go]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.crmGo)));
 async function loadDashboard(){
  const status=document.getElementById('crmDataStatus');
  status.textContent='Оновлюємо показники…';
  const initData=window.Telegram?.WebApp?.initData||'';
  if(!initData){status.textContent='Відкрийте застосунок через Telegram для отримання показників.';return;}
  try{
   const response=await fetch(`${API_BASE_URL}/api/crm/dashboard`,{headers:{'X-Telegram-Init-Data':initData},cache:'no-store'});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const data=await response.json();
   const money=new Intl.NumberFormat('uk-UA',{style:'currency',currency:'UAH',maximumFractionDigits:0});
   const amount=money.format(data.orderAmountToday||0);
   document.getElementById('crmRevenue').textContent=amount;
   document.getElementById('crmRepRevenue').textContent=amount;
   const admin=Boolean(data.isAdmin);
   document.getElementById('crmHomeTitle').textContent=admin?'Стан компанії':'Мій робочий день';
   document.getElementById('crmHomeRole').textContent=admin?'Компанія · сьогодні':'Мій день';
   document.getElementById('crmCompanyCard').hidden=!admin;
   document.getElementById('crmRepAmount').hidden=admin;
   document.getElementById('crmRouteCard').hidden=admin;
   const routeTotal=Number(data.routeTotal)||0;
   const routeDone=Number(data.routeCompleted)||0;
   const progress=routeTotal>0?Math.max(0,Math.min(100,Math.round(100*routeDone/routeTotal))):0;
   document.getElementById('crmRouteProgressFill').style.width=progress+'%';
   document.getElementById('crmRouteProgress').setAttribute('aria-valuenow',String(progress));
   document.getElementById('crmOrders').textContent=data.ordersToday??0;
   document.getElementById('crmShops').textContent=data.shopsToday??0;
   document.getElementById('crmRoute').textContent=`${data.routeCompleted??0} / ${data.routeTotal??0}`;
   document.getElementById('crmPending').textContent=data.routePending??0;
   document.getElementById('crmRevenueLabel').textContent='Замовлення компанії сьогодні';
   status.textContent='Дані за сьогодні · час Києва. Сума оформлених замовлень.';
  }catch(e){status.textContent='Не вдалося завантажити показники. Перевірте API та спробуйте знову.';document.getElementById('crmRevenue').textContent='—';document.getElementById('crmRepRevenue').textContent='—';
   ['crmOrders','crmShops','crmRoute','crmPending'].forEach(id=>document.getElementById(id).textContent='—');console.warn('CRM dashboard',e);}
 }
 go('home');
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadDashboard();});
 // Mobile soft keyboard: hide fixed tabs and basket while editing fields.
 // visualViewport catches keyboard resize; focus is a fallback for Telegram iOS WebView.
 (() => {
   const editable = el => el && (el.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"]'));
   const mobile = () => window.matchMedia('(max-width: 799px)').matches;
   const syncKeyboard = () => {
     const vv = window.visualViewport;
     const viewportShrunk = vv && (window.innerHeight - vv.height - vv.offsetTop > 130);
     const editing = editable(document.activeElement);
     document.body.classList.toggle('crm-keyboard-open', mobile() && (viewportShrunk || editing));
   };
   document.addEventListener('focusin', syncKeyboard);
   document.addEventListener('focusout', () => setTimeout(syncKeyboard, 180));
   window.visualViewport?.addEventListener('resize', syncKeyboard);
   window.visualViewport?.addEventListener('scroll', syncKeyboard);
   window.addEventListener('resize', syncKeyboard);
   syncKeyboard();
 })();
 window.ViArCRM={go,refreshDashboard:loadDashboard};
})();
