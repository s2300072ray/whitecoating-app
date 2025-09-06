/* ====== Local DB & 初始化 ====== */
const DB_KEY = 'whitecoating_local_v4';
const LINK_CAT_KEY = 'wc_link_categories_v1';
const TASK_CAT_KEY = 'wc_task_categories_v1';

const DEFAULT_LINK_CATS = ['創作資訊','技術資訊','生活旅行','美食地圖','有趣人物','新聞媒體','個人資料','學習新知','其他'];
const DEFAULT_TASK_CATS = ['創作競賽','學校計畫','家庭生活','學校教學','研究安排','會議討論','其他','學習新知'];

const state = { links: [], tasks: [], staleDays: 30, overdueDays: 20 };
let linkCats = [], taskCats = [];

const $ = s => document.querySelector(s);
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(16).slice(2)+Date.now().toString(16);
const normTags = s => (s||'').split(',').map(x=>x.trim()).filter(Boolean);
const favicon = url => { try{const u=new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;}catch{return '';} };
const isStale = iso => (Date.now()-new Date(iso)) / 86400000 >= state.staleDays;
const isOverdue = due => due && due < new Date().toISOString().slice(0,10);
const tagClassByIndex = i => i%2===0 ? 'blue' : 'green';

function loadDB(){
  try{ linkCats = JSON.parse(localStorage.getItem(LINK_CAT_KEY))||DEFAULT_LINK_CATS.slice(); }catch{ linkCats=DEFAULT_LINK_CATS.slice(); }
  try{ taskCats = JSON.parse(localStorage.getItem(TASK_CAT_KEY))||DEFAULT_TASK_CATS.slice(); }catch{ taskCats=DEFAULT_TASK_CATS.slice(); }
  try{
    const j = JSON.parse(localStorage.getItem(DB_KEY)||'null');
    if(j){ Object.assign(state, j); }
  }catch{ saveDB(); }
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function saveCats(){
  localStorage.setItem(LINK_CAT_KEY, JSON.stringify(linkCats));
  localStorage.setItem(TASK_CAT_KEY, JSON.stringify(taskCats));
  renderCategorySelectors();
}

/* ====== 分類 UI ====== */
function renderCategorySelectors(){
  const mk = (arr, withAll=false)=> (withAll?['<option value="">全部分類</option>']:[]).concat(arr.map(c=>`<option value="${c}">${c}</option>`)).join('');
  $('#categorySelect').innerHTML = mk(linkCats);
  $('#taskCategorySelect').innerHTML = mk(taskCats);
  $('#filterCategorySelect').innerHTML = mk(linkCats, true);
}
function promptAddCategory(kind){
  const name = (prompt('輸入新分類名稱：')||'').trim(); if(!name) return;
  const pool = kind==='task'?taskCats:linkCats;
  if(pool.includes(name)) return alert('分類已存在');
  pool.push(name); saveCats();
}
function manageCategories(){
  const set = prompt('要管理哪一類？\n1=連結分類\n2=任務分類');
  if(set!=='1'&&set!=='2') return;
  const pool = set==='2'?taskCats:linkCats;
  if(!pool.length) return alert('尚無分類');
  const pick = prompt(pool.map((c,i)=>`${i+1}. ${c}`).join('\n')+'\n\n輸入編號管理:');
  if(pick===null) return; const idx=Number(pick)-1;
  if(idx<0||idx>=pool.length) return alert('無效編號');
  const chosen=pool[idx];
  const act=prompt(`管理「${chosen}」\n1=重新命名\n2=刪除`);
  if(act==='1'){
    const nn=(prompt('新名稱：',chosen)||'').trim();
    if(!nn) return; if(pool.includes(nn)&&nn!==chosen) return alert('已存在相同名稱');
    pool[idx]=nn;
    (set==='2'?state.tasks:state.links).forEach(x=>{ if(x.category===chosen)x.category=nn; });
    saveCats(); saveDB(); renderLinks(); renderTasks();
  }else if(act==='2'){
    if(!confirm(`確定刪除分類「${chosen}」？`)) return;
    pool.splice(idx,1);
    (set==='2'?state.tasks:state.links).forEach(x=>{ if(x.category===chosen)x.category=''; });
    saveCats(); saveDB(); renderLinks(); renderTasks();
  }
}

/* ====== CRUD：Links ====== */
function addLink({url,title,category,tags}){
  if(!url) return;
  state.links.push({id:uid(),url,title:title||url,category:category||'',tags:normTags(tags).join(','),createdAt:nowISO(),updatedAt:nowISO(),isDeleted:false});
  saveDB(); renderLinks();
}
function updateLink(p){
  const it=state.links.find(x=>x.id===p.id); if(!it) return;
  if(p.url!=null) it.url=p.url;
  if(p.title!=null) it.title=p.title;
  if(p.category!=null) it.category=p.category;
  if(p.tags!=null) it.tags=normTags(p.tags).join(',');
  it.updatedAt=nowISO(); saveDB(); renderLinks();
}
function deleteLink(id){ const it=state.links.find(x=>x.id===id); if(it){ it.isDeleted=true; it.updatedAt=nowISO(); saveDB(); renderLinks(); }}

/* ====== CRUD：Tasks ====== */
function addTask({title,dueDate,category,tags}){
  if(!title) return;
  state.tasks.push({id:uid(),title,notes:'',createdAt:nowISO(),dueDate:dueDate||'',status:false,category:category||'',tags:normTags(tags).join(','),updatedAt:nowISO(),isDeleted:false});
  saveDB(); renderTasks();
}
function updateTask(p){
  const t=state.tasks.find(x=>x.id===p.id); if(!t) return;
  if(p.title!=null) t.title=p.title;
  if(p.dueDate!=null) t.dueDate=p.dueDate;
  if(p.status!=null) t.status=!!p.status;
  if(p.category!=null) t.category=p.category;
  if(p.tags!=null) t.tags=normTags(p.tags).join(',');
  t.updatedAt=nowISO(); saveDB(); renderTasks();
}
function toggleTask(id){ const t=state.tasks.find(x=>x.id===id); if(t){t.status=!t.status; t.updatedAt=nowISO(); saveDB(); renderTasks();}}
function deleteTask(id){ const t=state.tasks.find(x=>x.id===id); if(t){t.isDeleted=true; t.updatedAt=nowISO(); saveDB(); renderTasks();}}

/* ====== Render：Links ====== */
function renderLinks(){
  const q=($('#q').value||'').toLowerCase(), fcat=$('#filterCategorySelect').value||'', ftag=($('#filterTag').value||'').toLowerCase();
  const sort=$('#sort').value||'created_desc';
  let arr=state.links.filter(x=>!x.isDeleted);
  arr=arr.filter(it=>{
    const tags=(it.tags||'').toLowerCase();
    return (!q||(it.title.toLowerCase().includes(q)||it.url.toLowerCase().includes(q)||tags.includes(q))) &&
           (!fcat||it.category===fcat) && (!ftag||tags.includes(ftag));
  });
  switch(sort){
    case 'created_asc': arr.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); break;
    case 'title_asc': arr.sort((a,b)=>a.title.localeCompare(b.title)); break;
    case 'title_desc': arr.sort((a,b)=>b.title.localeCompare(a.title)); break;
    default: arr.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  const box=$('#list'); box.innerHTML='';
  if(!arr.length) return box.innerHTML='<div class="card muted">目前沒有資料</div>';
  for(const it of arr){
    const card=document.createElement('div'); card.className='item'+(isStale(it.createdAt)?' stale':'');
    const head=document.createElement('div'); head.className='item-head';
    const ico=favicon(it.url); if(ico){const img=document.createElement('img'); img.src=ico; img.className='fav'; head.appendChild(img);}
    const a=document.createElement('a'); a.href=it.url; a.target='_blank'; a.textContent=it.title||it.url; head.appendChild(a);
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=`${new Date(it.createdAt).toLocaleString()} · 分類：${it.category||'未填'}`;
    const urlLine=document.createElement('div'); urlLine.className='meta'; urlLine.textContent=it.url;
    const actions=document.createElement('div'); actions.className='actions';
    const edit=document.createElement('button'); edit.className='btn ghost'; edit.textContent='編輯';
    edit.onclick=()=>{ const nt=prompt('標題',it.title); if(nt===null)return; const nc=prompt('分類',it.category||''); if(nc===null)return; const tg=prompt('標籤',normTags(it.tags).join(',')); if(tg===null)return; updateLink({id:it.id,title:nt||it.url,category:nc||'',tags:tg}); };
    const del=document.createElement('button'); del.className='btn danger'; del.textContent='刪除'; del.onclick=()=>{if(confirm('確定刪除？')) deleteLink(it.id);};
    actions.append(edit,del); card.append(head,meta,urlLine,actions); box.appendChild(card);
  }
}

/* ====== Render：Tasks ====== */
function renderTasks(){
  const mode=$('#taskView').value||'all', sort=$('#taskSort').value||'due_asc';
  let arr=state.tasks.filter(t=>!t.isDeleted);
  if(mode==='open') arr=arr.filter(t=>!t.status);
  if(mode==='done') arr=arr.filter(t=>t.status);
  const byDue=(a,b,d=1)=> (a.dueDate||'').localeCompare(b.dueDate||'')*d;
  switch(sort){ case 'due_desc':arr.sort((a,b)=>byDue(a,b,-1));break; case 'created_desc':arr.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));break; default:arr.sort((a,b)=>byDue(a,b,1)); }
  const wrap=$('#taskList'); wrap.innerHTML='';
  if(!arr.length) return wrap.innerHTML='<div class="card muted">目前沒有任務</div>';
  for(const t of arr){
    const card=document.createElement('div'); card.className='item'+(isOverdue(t.dueDate)?' overdue':'');
    const row=document.createElement('div'); row.className='item-head';
    const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=!!t.status; chk.onchange=()=>toggleTask(t.id);
    const tt=document.createElement('div'); tt.textContent=t.title; row.append(chk,tt);
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=`建立：${new Date(t.createdAt).toLocaleString()} · 到期：${t.dueDate||'未設定'} · 分類：${t.category||'未填'}`;
    const actions=document.createElement('div'); actions.className='actions';
    const edit=document.createElement('button'); edit.className='btn ghost'; edit.textContent='編輯';
    edit.onclick=()=>{ const nt=prompt('任務',t.title); if(nt===null)return; const nd=prompt('到期日(YYYY-MM-DD)',t.dueDate||''); if(nd===null)return; const nc=prompt('分類',t.category||''); if(nc===null)return; const tg=prompt('標籤',normTags(t.tags).join(',')); if(tg===null)return; updateTask({id:t.id,title:nt,dueDate:nd,category:nc,tags:tg}); };
    const del=document.createElement('button'); del.className='btn danger'; del.textContent='刪除'; del.onclick=()=>{if(confirm('確定刪除？')) deleteTask(t.id);};
    actions.append(edit,del); card.append(row,meta,actions); wrap.appendChild(card);
  }
}

/* ====== 匯出／匯入 ====== */
function exportJSON(){
  const blob=new Blob([JSON.stringify({version:4,...state,linkCats,taskCats},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`whitecoating-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function importJSON(file){
  const r=new FileReader(); r.onload=()=>{ try{ const j=JSON.parse(r.result); state.links=j.links||state.links; state.tasks=j.tasks||state.tasks; state.staleDays=j.staleDays??state.staleDays; state.overdueDays=j.overdueDays??state.overdueDays; linkCats=j.linkCats?.length?j.linkCats:linkCats; taskCats=j.taskCats?.length?j.taskCats:taskCats; saveDB(); saveCats(); renderLinks(); renderTasks(); alert('匯入完成'); }catch(e){alert('匯入失敗:'+e.message);} }; r.readAsText(file);
}

/* ====== 綁定 ====== */
document.addEventListener('DOMContentLoaded',()=>{
  loadDB(); renderCategorySelectors();
  $('#staleDays').value=state.staleDays; $('#overdueDays').value=state.overdueDays;
  renderLinks(); renderTasks();

  $('#addLinkForm').onsubmit=e=>{e.preventDefault(); addLink({url:$('#urlInput').value.trim(),title:$('#titleInput').value.trim(),category:$('#categorySelect').value,tags:$('#tagsInput').value}); e.target.reset();};
  $('#addTaskForm').onsubmit=e=>{e.preventDefault(); addTask({title:$('#taskTitleInput').value.trim(),dueDate:$('#taskDueDateInput').value,category:$('#taskCategorySelect').value,tags:$('#taskTagsInput').value}); e.target.reset();};

  $('#q').oninput=renderLinks; $('#filterCategorySelect').oninput=renderLinks; $('#filterTag').oninput=renderLinks; $('#sort').oninput=renderLinks;
  $('#taskView').oninput=renderTasks; $('#taskSort').oninput=renderTasks;

  $('#staleDays').onchange=()=>{state.staleDays=Number($('#staleDays').value||30); saveDB(); renderLinks();};
  $('#overdueDays').onchange=()=>{state.overdueDays=Number($('#overdueDays').value||20); saveDB(); renderTasks();};

  $('#btnExport').onclick=exportJSON; $('#importFile').onchange=e=>importJSON(e.target.files[0]);
  $('#btnAddLinkCat').onclick=()=>promptAddCategory('link'); $('#btnAddTaskCat').onclick=()=>promptAddCategory('task'); $('#btnManageCats').onclick=manageCategories;

  // === 新增：切換清單顯示 ===
  $('#toggleLinks').onclick=()=>{
    const box=$('#list'); const btn=$('#toggleLinks');
    if(box.style.display==='none'){ box.style.display=''; btn.textContent='隱藏'; }
    else { box.style.display='none'; btn.textContent='顯示'; }
  };
  $('#toggleTasks').onclick=()=>{
    const box=$('#taskList'); const btn=$('#toggleTasks');
    if(box.style.display==='none'){ box.style.display=''; btn.textContent='隱藏'; }
    else { box.style.display='none'; btn.textContent='顯示'; }
  };
});
