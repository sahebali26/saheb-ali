<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>STH ERP</title>
<style>
:root{--bg:#f5f7fb;--panel:#fff;--text:#172033;--muted:#697386;--line:#e7eaf0;--primary:#111827;--primary2:#374151;--accent:#2563eb;--good:#15803d;--warn:#b45309;--danger:#dc2626;--shadow:0 8px 30px rgba(17,24,39,.07);--radius:16px}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);background:var(--bg)}
button,input,select,textarea{font:inherit}button{cursor:pointer}
.app{display:flex;min-height:100vh}.sidebar{width:248px;background:#101828;color:#fff;position:fixed;inset:0 auto 0 0;padding:22px 14px;z-index:20;display:flex;flex-direction:column}
.brand{font-size:20px;font-weight:800;padding:4px 10px 22px}.brand span{display:block;font-size:11px;font-weight:500;color:#98a2b3;margin-top:3px}
.nav{display:flex;flex-direction:column;gap:4px;overflow:auto}.nav button{border:0;background:transparent;color:#cbd5e1;text-align:left;padding:11px 12px;border-radius:10px;font-weight:600}.nav button:hover,.nav button.active{background:#1d2939;color:#fff}.nav .section{font-size:10px;text-transform:uppercase;color:#667085;letter-spacing:.12em;padding:15px 12px 5px}
.main{margin-left:248px;width:calc(100% - 248px);padding:24px 28px 50px}.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}.title h1{margin:0;font-size:28px;letter-spacing:-.03em}.title p{margin:5px 0 0;color:var(--muted);font-size:13px}.actions{display:flex;gap:8px;align-items:center}.btn{border:1px solid var(--line);background:var(--panel);color:var(--text);padding:10px 13px;border-radius:10px;font-weight:700}.btn.primary{background:var(--primary);color:#fff;border-color:var(--primary)}.btn.danger{color:#fff;background:var(--danger);border-color:var(--danger)}.btn:disabled{opacity:.5;cursor:not-allowed}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow)}.card .label{color:var(--muted);font-size:12px;font-weight:700}.card .value{font-size:25px;font-weight:850;margin-top:8px;letter-spacing:-.02em}.card .sub{font-size:11px;color:var(--muted);margin-top:6px}
.grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-bottom:16px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}.panel-head h3{margin:0;font-size:15px}.panel-head small{color:var(--muted)}.panel-body{padding:16px 18px}
.table-wrap{overflow:auto}.table{width:100%;border-collapse:collapse;font-size:12px}.table th,.table td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}.table th{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;background:#fafbfc}.table tr:last-child td{border-bottom:0}.empty{padding:30px;text-align:center;color:var(--muted)}
.badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;background:#eef2ff;color:#3730a3}.badge.good{background:#ecfdf3;color:#166534}.badge.warn{background:#fffbeb;color:#92400e}.badge.danger{background:#fef2f2;color:#991b1b}
.searchbar{display:flex;gap:8px;flex-wrap:wrap}.searchbar input,.searchbar select,.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);background:#fff;border-radius:9px;padding:9px 10px;outline:none}.searchbar input{min-width:220px;flex:1}.searchbar input:focus,.field input:focus,.field select:focus,.field textarea:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
.module-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}.module-toolbar h2{font-size:17px;margin:0}.module-toolbar p{margin:4px 0 0;color:var(--muted);font-size:12px}
.modal{position:fixed;inset:0;background:rgba(15,23,42,.48);display:none;align-items:center;justify-content:center;padding:20px;z-index:50}.modal.show{display:flex}.modal-card{background:#fff;width:min(860px,100%);max-height:90vh;overflow:auto;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.2)}.modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px;border-bottom:1px solid var(--line)}.modal-head h3{margin:0}.modal-body{padding:18px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field label{display:block;font-size:11px;font-weight:800;color:var(--muted);margin-bottom:6px}.field.full{grid-column:1/-1}.field textarea{min-height:80px;resize:vertical}.modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:16px 18px;border-top:1px solid var(--line)}
.loading{position:fixed;inset:0;background:#101828;display:flex;align-items:center;justify-content:center;z-index:100;color:#fff;transition:opacity .25s}.loading.hide{opacity:0;pointer-events:none}.loader-box{text-align:center}.spinner{width:42px;height:42px;border:3px solid #344054;border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 15px}@keyframes spin{to{transform:rotate(360deg)}}.loader-box strong{display:block;font-size:18px}.loader-box span{display:block;color:#98a2b3;font-size:12px;margin-top:4px}
.toast{position:fixed;right:20px;bottom:20px;background:#101828;color:#fff;padding:12px 15px;border-radius:10px;box-shadow:var(--shadow);opacity:0;transform:translateY(8px);transition:.2s;z-index:120;font-size:12px}.toast.show{opacity:1;transform:none}.toast.error{background:#991b1b}
.mobile-menu{display:none}
@media(max-width:1100px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.grid{grid-template-columns:1fr}}
@media(max-width:800px){.sidebar{transform:translateX(-100%);transition:.2s}.sidebar.open{transform:none}.main{margin-left:0;width:100%;padding:16px}.mobile-menu{display:block}.topbar{align-items:flex-start}.title h1{font-size:23px}.form-grid{grid-template-columns:1fr}.cards{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.cards{grid-template-columns:1fr}.actions .hide-sm{display:none}}
</style>
</head>
<body>
<div id="loading" class="loading"><div class="loader-box"><div class="spinner"></div><strong>STH ERP</strong><span>Connecting to your Google Sheet…</span></div></div>

<aside id="sidebar" class="sidebar">
  <div class="brand">STH ERP<span>Saheb Trend House · Production</span></div>
  <nav id="nav" class="nav"></nav>
</aside>

<main class="main">
  <header class="topbar">
    <div class="title">
      <button class="btn mobile-menu" onclick="toggleMenu()">☰</button>
      <h1 id="pageTitle">Dashboard</h1>
      <p id="pageSub">Live data from Google Sheets</p>
    </div>
    <div class="actions"><button class="btn" onclick="refreshCurrent()">↻ Refresh</button></div>
  </header>
  <section id="content"></section>
</main>

<div id="modal" class="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal-card">
    <div class="modal-head"><h3 id="modalTitle">Add Record</h3><button class="btn" onclick="closeModal()">✕</button></div>
    <div id="modalBody" class="modal-body"></div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button id="saveBtn" class="btn primary" onclick="submitForm()">Save</button></div>
  </div>
</div>
<div id="toast" class="toast"></div>

<script>
const API = 'https://script.google.com/macros/s/AKfycbx2eq-YOQtAawrCTsu5d-K_JSV_dXP7ZpE7qPyaKrAZ6yUQDAA9uaZk5_UjP24VUieW5Q/exec';

const MODULES = {
  dashboard:{label:'Dashboard',readOnly:true},
  stock:{label:'Stock',readOnly:true},
  sales:{label:'Sales',editable:true},
  returns:{label:'Returns',editable:true},
  purchase:{label:'Purchase Received',editable:true},
  po:{label:'Purchase Orders',editable:true},
  poSummary:{label:'PO Summary',readOnly:true},
  suppliers:{label:'Suppliers',editable:true},
  supplierPayments:{label:'Supplier Payments',editable:true},
  partners:{label:'Partners',editable:true},
  partnerTransactions:{label:'Partner Transactions',editable:true},
  creditNote:{label:'Credit Notes',editable:true},
  expense:{label:'Expenses',editable:true},
  products:{label:'Products',editable:true},
  supplierLedger:{label:'Supplier Ledger',readOnly:true},
  partnerContribution:{label:'Partner Contribution',readOnly:true},
  taskMaster:{label:'Task Master',editable:true},
  dailyTasks:{label:'Daily Task Tracker',editable:true}
};

const WRITE_FIELDS = {
  sales:['Sales Date','Order ID','Platform','Product ID','Quantity','Remarks'],
  returns:['Returs Date','Platform','Product ID','Quantity','Remarks'],
  purchase:['Purchase Date','PO ID','Invoice No','Supplier','Product ID','Received Qty','Unit Price','Remarks'],
  po:['PO ID','PO Date','Supplier','Expected Date','Recived Date','Product ID','Ordered Qty','Unit Price','Discount %','Remarks','PO Description'],
  supplierPayments:['Payment Date','Supplier','PO ID','Payment Type','Payment Method','Amount','Reference No','Remarks'],
  creditNote:['Credit Note Date','Supplier','PO ID','Quantity','Rate','Reason','Resolution','Remarks'],
  expense:['Expense Date','Expense Type','Description','Related To','Payment Method','Amount','Remarks'],
  partnerTransactions:['Transaction Date','Partner','Transaction Type','Amount','Reference','Payment Method','Remarks'],
  products:['Product ID','Product Type','Category','Product Name','Variant','Unit','Purchase Price','Selling Price','Min Stock','Status','Last Updated'],
  suppliers:['Supplier ID','Supplier Name','Supplier Type','Contact Person','Mobile','GSTIN','Address','City','State','Opening Balance','Status','Notes'],
  partners:['Partner ID','Partner Name','Role','Investment %','Profit Share%','Mobile','Email','Opening Capital','Status'],
  taskMaster:['Task ID','Category','Task','Frequency ','Priority','Status','Start Time','End Time','Remarks'],
  dailyTasks:['Date','Task ID','Category','Task','Priority','Status','Start Time','End Time','Remarks']
};

const state={data:null,module:'dashboard',rows:[],editing:null};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function money(v){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)||0);}
function date(v){if(!v)return ''; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
function toast(msg,error=false){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(error?' error':'');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.className='toast',2600);}
function toggleMenu(){document.getElementById('sidebar').classList.toggle('open');}
function setLoading(on){document.getElementById('loading').classList.toggle('hide',!on);}

async function api(action, extra={}){
  const body={action,...extra};
  const res=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'});
  const text=await res.text();
  let json; try{json=JSON.parse(text)}catch(e){throw new Error('API returned an invalid response. Check the Apps Script deployment.');}
  if(!json.ok)throw new Error(json.error||'Request failed');
  return json.data;
}

async function init(){
  try{
    state.data=await api('bootstrap');
    renderNav();
    await openModule('dashboard');
  }catch(e){toast(e.message,true); document.getElementById('content').innerHTML='<div class="panel"><div class="empty">Unable to load ERP data.<br><br>'+esc(e.message)+'</div></div>';}
  finally{setLoading(false);}
}

function renderNav(){
  const nav=document.getElementById('nav');
  const groups=[
    ['WORKSPACE',['dashboard','stock','sales','returns','purchase','po','poSummary']],
    ['PARTIES',['suppliers','supplierPayments','partners','partnerTransactions']],
    ['FINANCE',['creditNote','expense','supplierLedger','partnerContribution']],
    ['MASTERS',['products','taskMaster','dailyTasks']]
  ];
  nav.innerHTML=groups.map(([g,items])=>'<div class="section">'+g+'</div>'+items.map(k=>`<button data-nav="${k}" onclick="openModule('${k}')">${MODULES[k].label}</button>`).join('')).join('');
}

async function openModule(module){
  state.module=module; state.editing=null;
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===module));
  document.getElementById('sidebar').classList.remove('open');
  if(module==='dashboard'){document.getElementById('pageTitle').textContent='Dashboard';document.getElementById('pageSub').textContent='Live operational overview';await renderDashboard();return;}
  const m=MODULES[module];
  document.getElementById('pageTitle').textContent=m.label;
  document.getElementById('pageSub').textContent='Google Sheet: '+(state.data?.modules?.[module]?.sheet||'');
  try{
    const d=await api('list',{module});
    state.rows=d.rows||[];
    renderTable(module);
  }catch(e){toast(e.message,true);}
}

async function renderDashboard(){
  try{
    const d=await api('dashboard');
    const c=d.cards||{};
    const salesByShop=Object.entries(d.salesByShop||{}).sort((a,b)=>b[1]-a[1]);
    document.getElementById('content').innerHTML=`
      <div class="cards">
        ${card('Sales This Week',money(c.salesThisWeek),'From Sales Entry')}
        ${card('Supplier Pending Amount',money(c.supplierPendingAmount),'From Supplier Ledger')}
        ${card('Total Stock Value',money(c.totalStockValue),'From Stock Ledger')}
        ${card('Out of Stock',c.outOfStock,'From Stock Ledger')}
      </div>
      <div class="grid">
        <div class="panel"><div class="panel-head"><h3>Sales by Shop</h3><small>Current week</small></div><div class="panel-body">${salesByShop.length?salesByShop.map(x=>bar(x[0],x[1],salesByShop[0][1])).join(''):'<div class="empty">No sales data</div>'}</div></div>
        <div class="panel"><div class="panel-head"><h3>Stock Alerts</h3><small>Priority items</small></div><div class="table-wrap">${miniTable(d.stockAlerts,['Product Name','Current Stock','Status'])}</div></div>
      </div>
      <div class="grid">
        <div class="panel"><div class="panel-head"><h3>Pending PO</h3><small>Open orders</small></div><div class="table-wrap">${miniTable(d.pendingPO,['PO ID','Supplier','Pending Amount','PO Status'])}</div></div>
        <div class="panel"><div class="panel-head"><h3>Supplier Payments</h3><small>Latest</small></div><div class="table-wrap">${miniTable(d.supplierPayments,['Payment Date','Supplier','PO ID','Amount'])}</div></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>Recent Sales</h3><small>Latest 12</small></div><div class="table-wrap">${miniTable(d.recentSales,['Sales Date','Order ID','Platform','Product Name','Quantity','Total Amount'])}</div></div>`;
  }catch(e){toast(e.message,true);}
}
function card(label,value,sub){return `<div class="card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;}
function bar(name,val,max){const pct=max?Math.max(3,Math.round(val/max*100)):3;return `<div style="margin:0 0 14px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px"><span>${esc(name)}</span><span>${money(val)}</span></div><div style="height:8px;background:#eef2f6;border-radius:99px"><div style="height:8px;width:${pct}%;background:#2563eb;border-radius:99px"></div></div></div>`;}
function miniTable(rows,cols){
  if(!rows?.length)return '<div class="empty">No data</div>';
  return `<table class="table"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${formatCell(r[c],c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderTable(module){
  const m=MODULES[module], data=state.data.modules[module], headers=data.headers||[];
  const rows=state.rows;
  const editable=!!m.editable;
  document.getElementById('content').innerHTML=`
    <div class="panel">
      <div class="module-toolbar">
        <div><h2>${esc(m.label)}</h2><p>${rows.length} live records</p></div>
        <div class="searchbar"><input id="tableSearch" placeholder="Search this module…" oninput="filterTable()">${editable?'<button class="btn primary" onclick="openForm()">+ Add</button>':''}</div>
      </div>
      <div id="tableContainer" class="table-wrap"></div>
    </div>`;
  drawRows(headers,rows);
}
function drawRows(headers,rows){
  const filtered=rows;
  const visible=headers.filter(h=>h);
  const display=visible.slice(0,16);
  let html='<table class="table"><thead><tr>'+display.map(h=>`<th>${esc(h)}</th>`).join('')+(MODULES[state.module].editable?'<th>Action</th>':'')+'</tr></thead><tbody>';
  if(!filtered.length)html+='<tr><td colspan="'+(display.length+1)+'" class="empty">No matching records</td></tr>';
  filtered.forEach(r=>{
    html+='<tr>'+display.map(h=>`<td>${formatCell(r[h],h)}</td>`).join('');
    if(MODULES[state.module].editable){
      const key=keyField(state.module,headers);
      html+=`<td><button class="btn" onclick="openForm(${JSON.stringify(String(r[key]??''))})">Edit</button></td>`;
    }
    html+='</tr>';
  });
  html+='</tbody></table>';
  document.getElementById('tableContainer').innerHTML=html;
}
function filterTable(){
  const q=(document.getElementById('tableSearch')?.value||'').toLowerCase();
  const rows=state.rows.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(q)));
  drawRows(state.data.modules[state.module].headers,rows);
}
function formatCell(v,h){
  if(v===null||v===undefined||v==='')return '—';
  const s=String(h||'').toLowerCase();
  if(s.includes('date'))return date(v);
  if(s.includes('amount')||s.includes('price')||s.includes('capital')||s.includes('value')||s.includes('balance')||s.includes('payment')||s.includes('pending'))return money(v);
  if(s.includes('status')){const x=String(v).toLowerCase();const cls=x.includes('out')||x.includes('cancel')?'danger':x.includes('pending')||x.includes('partial')||x.includes('low')?'warn':'good';return `<span class="badge ${cls}">${esc(v)}</span>`;}
  return esc(v);
}
function keyField(module,headers){
  const preferred={sales:'Sales ID',returns:'Returs ID',purchase:'Purchase Date',po:'PO ID',supplierPayments:'Payment ID',creditNote:'Credit Note ID',expense:'Expense ID',partnerTransactions:'Transaction ID',products:'Product ID',suppliers:'Supplier ID',partners:'Partner ID',taskMaster:'Task ID',dailyTasks:'Date'};
  return preferred[module]||headers[0];
}

function openForm(key){
  const module=state.module;
  const fields=WRITE_FIELDS[module]||[];
  const existing=key?state.rows.find(r=>String(r[keyField(module,state.data.modules[module].headers)])===String(key)):null;
  state.editing=existing?{keyField:keyField(module,state.data.modules[module].headers),key}:null;
  document.getElementById('modalTitle').textContent=existing?'Edit '+MODULES[module].label:'Add '+MODULES[module].label;
  document.getElementById('modalBody').innerHTML='<div class="form-grid">'+fields.map(f=>fieldHtml(module,f,existing?.[f])).join('')+'</div>';
  document.getElementById('modal').classList.add('show');
}
function fieldHtml(module,f,val){
  const label=f.trim(), lower=label.toLowerCase();
  let type='text';
  if(lower.includes('date'))type='date';
  else if(lower.includes('amount')||lower.includes('price')||lower.includes('qty')||lower.includes('quantity')||lower.includes('%')||lower==='rate')type='number';
  const options=selectOptions(module,label);
  if(options) return `<div class="field"><label>${esc(label)}</label><select id="f_${css(label)}"><option value="">Select…</option>${options.map(o=>`<option ${String(o.value)==String(val??'')?'selected':''} value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select></div>`;
  if(lower==='remarks'||lower==='notes'||lower==='description'||lower==='reason')return `<div class="field full"><label>${esc(label)}</label><textarea id="f_${css(label)}">${esc(val??'')}</textarea></div>`;
  let v=val??''; if(type==='date'&&v)v=new Date(v).toISOString().slice(0,10);
  return `<div class="field"><label>${esc(label)}</label><input id="f_${css(label)}" type="${type}" value="${esc(v)}"></div>`;
}
function css(s){return s.replace(/[^a-zA-Z0-9]/g,'_');}
function selectOptions(module,label){
  const mods=state.data.modules;
  const rows=(m)=>mods[m]?.rows||[];
  if(label==='Product ID')return rows('products').map(r=>({value:r['Product ID'],label:(r['Product ID']||'')+' — '+(r['Product Name']||'')}));
  if(label==='Supplier')return rows('suppliers').map(r=>({value:r['Supplier ID'],label:(r['Supplier ID']||'')+' — '+(r['Supplier Name']||'')}));
  if(label==='Partner')return rows('partners').map(r=>({value:r['Partner ID'],label:(r['Partner ID']||'')+' — '+(r['Partner Name']||'')}));
  if(label==='PO ID')return rows('poSummary').map(r=>({value:r['PO ID'],label:r['PO ID']}));
  if(label==='Expense Type')return rows('expenseTypes').map(r=>({value:r['Expense Type'],label:r['Expense Type']}));
  if(label==='Platform')return settingList('Order Platforms');
  if(label==='Payment Method')return settingList('Payment Methods');
  if(label==='Product Type')return settingList('Product Type');
  if(label==='Unit')return settingList('Units');
  if(label==='Status')return settingList('Status');
  if(label==='PO Status')return settingList('PO Status');
  if(label==='Transaction Type')return settingList('Partnership Transection Types');
  if(label==='Frequency ')return ['Daily','Weekly','Monthly','As Needed','Follow-up'].map(x=>({value:x,label:x}));
  if(label==='Priority')return ['High','Medium','Low'].map(x=>({value:x,label:x}));
  if(label==='Payment Type')return ['Advance','Against Purchase','Settlement','Refund','Other'].map(x=>({value:x,label:x}));
  if(label==='Resolution')return ['Carry Forward','Refund','Adjustment','Settled'].map(x=>({value:x,label:x}));
  return null;
}
function settingList(header){
  const rows=state.data.modules.settings?.rows||[];
  const out=[];const seen=new Set();
  rows.forEach(r=>{const v=r[header];if(v!==''&&v!=null&&!seen.has(String(v))){seen.add(String(v));out.push({value:v,label:v});}});
  return out;
}
function closeModal(){document.getElementById('modal').classList.remove('show');state.editing=null;}

async function submitForm(){
  const module=state.module, fields=WRITE_FIELDS[module]||{}, payload={};
  (fields||[]).forEach(f=>{const el=document.getElementById('f_'+css(f));if(el)payload[f]=el.value;});
  const btn=document.getElementById('saveBtn');btn.disabled=true;btn.textContent='Saving…';
  try{
    if(state.editing){
      await api('update',{module,key:state.editing.keyField,value:state.editing.key,payload});
      toast('Record updated successfully');
    }else{
      await api('create',{module,payload});
      toast('Record saved successfully');
    }
    closeModal();
    await openModule(module);
  }catch(e){toast(e.message,true);}
  finally{btn.disabled=false;btn.textContent='Save';}
}

async function refreshCurrent(){setLoading(true);try{state.data=await api('bootstrap');await openModule(state.module);toast('Data refreshed');}catch(e){toast(e.message,true)}finally{setLoading(false)}}

init();
</script>
</body>
</html>