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
 function go(page){
  if(page==='admin'&&!isAdmin)return;
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
  if(page==='home'||page==='menu')window.scrollTo(0,0);
 }
 document.querySelectorAll('[data-crm-go]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.crmGo)));
 go('home');
 window.ViArCRM={go};
})();
