/* ===== 資料層 ===== */
const DB_KEY = 'whitecoating_local_v4';
const LINK_CAT_KEY = 'wc_link_categories_v1';
const TASK_CAT_KEY = 'wc_task_categories_v1';

const DEFAULT_LINK_CATS = ['創作資訊','技術資訊','生活旅行','美食地圖','有趣人物','新聞媒體','個人資料','學習新知','其他'];
const DEFAULT_TASK_CATS = ['創作競賽','學校計畫','家庭生活','學校教學','研究安排','會議討論','其他','學習新知'];

const state = { links: [], tasks: [], staleDays: 30, overdueDays: 20 };
let linkCats = [];
let taskCats = [];

const $ = (s)=>document.querySelector(s);
const nowISO = ()=> new Date().toISOString();
const uid = ()=> Math.random().toString(16).slice(2)+Date.now().toString(16);
const normTags = (s)=> (s||'').split(',').map(x=>x.trim()).filter(Boolean);
const favicon = (url)=>{ try{ const u=new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; }catch{ return '';} };
const isStale = (iso)=> (Date.now()-new Date(iso)) / 86400000 >= state.staleDays;
const isOverdue = (due)=> due && due < new Date().toISOString().slice(0,10);
const tagClassByIndex = (i)=> i%2===0 ? 'blue' : 'green'; // 兩色交錯

function loadDB(){
  try{
    const L = JSON.parse(localStorage.getItem(LINK_CAT_KEY) || 'null');
    linkCats = Array.isArray(L) && L.length ? L : DEFAULT_LINK_CATS.slice();
  }catch{ linkCats = DEFAULT_LINK_CATS.slice(); }
  try{
    const T = JSON.parse(localStorage.getItem(TASK_CAT_KEY) || 'null');
    taskCats = Array.isArray(T) && T.length ? T : DEFAULT_TASK_CATS.slice();
  }catch{ taskCats = DEFAULT_TASK_CATS.slice(); }

  const raw = localStorage.getItem(DB_KEY);
  if(raw){
    try{
      const j = JSON.parse(raw);
      state.links = j.links || [];
      state.tasks = j.tasks || [];
      state.staleDays = Number(j.staleDays || 30);
      state.overdueDays = Number(j.overdueDays || 20);
    }catch{ saveDB(); }
  }else{
    saveDB();
  }
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function saveCats(){
  localStorage.setItem(LINK_CAT_KEY, JSON.stringify(linkCats));
  localStorage.setItem(TASK_CAT_KEY, JSON.stringify(taskCats));
  renderCategorySelectors();
}

/* ===== 分類 UI ===== */
function renderCategorySelectors(){
  const mk = (arr, withAll=false)=>{
    const out = [];
    if(withAll) out.push(`<option value="">全部分類</option>`);
    for(const c of arr) out.push(`<option value="${c}">${c}</option>`);
    return out.join('');
  };
  $('#categorySelect').innerHTML       = mk(linkCats);
  $('#taskCategorySelect').innerHTML   = mk(taskCats);
  $('#filterCategorySelect').innerHTML = mk(linkCats, true);
}
function promptAddCategory(kind){
  const name = (prompt('輸入新分類名稱：') || '').trim();
  if(!name) return;
  const pool = kind==='task' ? taskCats : linkCats;
  if(pool.includes(name)){ alert('分類已存在'); return; }
  pool.push(name);
  saveCats();
}
function manageCategories(){
  const set = prompt('要管理哪一類？\n1 = 連結分類\n2 = 任務分類\n(其他取消)');
  if(set!=='1' && set!=='2') return;
  const isTask = set==='2';
  const pool = isTask ? taskCats : linkCats;
  if(!pool.length) return alert('尚無分類');
  const list = pool.map((c,i)=> `${i+1}. ${c}`).join('\n');
  const pick = prompt(`目前分類：\n${list}\n\n輸入編號以管理，或取消：`);
  if(pick===null) return;
  const idx = Number(pick)-1;
  if(!Number.isFinite(idx) || idx<0 || idx>=pool.length) return alert('無效的編號');
  const chosen = pool[idx];
  const action = prompt(`要對「${chosen}」做什麼？\n1 = 重新命名\n2 = 刪除\n(其他取消)`);
  if(action==='1'){
    const nn = prompt('新名稱：', chosen);
    if(nn===null) return;
    const name = nn.trim();
    if(!name) return alert('名稱不可為空');
    if(pool.includes(name) && name!==chosen) return alert('已存在相同名稱');
    pool[idx]=name;
    const apply = (arr)=> arr.forEach(x=>{ if(x.category===chosen) x.category=name; });
    if(isTask) apply(state.tasks); else apply(state.links);
    saveCats(); saveDB(); renderLinks(); renderTasks();
    alert(`已將「${chosen}」改為「${name}」`);
  }else if(action==='2'){
    if(!confirm(`確定刪除分類「${chosen}」？\n（使用此分類的項目將改為未分類）`)) return;
    pool.splice(idx,1);
    const apply = (arr)=> arr.forEach(x=>{ if(x.category===chosen) x.category=''; });
    if(isTask) apply(state.tasks); else apply(state.links);
    saveCats(); saveDB(); renderLinks(); renderTasks();
    alert(`已刪除分類「${chosen}」`);
  }
}

/* ===== Links ===== */
function addLink({url,title,category,tags}){
  if(!url) throw new Error('missing_url');
  const item = { id:uid(), url, title:(title||url), category:(category||''), tags:normTags(tags).join(','), image:'', createdAt:nowISO(), updatedAt:nowISO(), isDeleted:false };
  state.links.push(item); saveDB(); renderLinks();
}
function updateLink(p){
  const i = state.links.findIndex(x=>x.id===p.id); if(i<0) return;
  const it = state.links[i];
  if(p.url!=null) it.url=p.url;
  if(p.title!=null) it.title=p.title || it.url;
  if(p.category!=null) it.category=p.category;
  if(p.tags!=null) it.tags=normTags(p.tags).join(',');
  it.updatedAt=nowISO(); saveDB(); renderLinks();
}
function deleteLink(id){
  const it = state.links.find(x=>x.id===id); if(!it) return;
  it.isDeleted = true; it.updatedAt = nowISO(); saveDB(); renderLinks();
}

/* ===== Tasks ===== */
function addTask({title,dueDate,category,tags}){
  if(!title) throw new Error('missing_title');
  const t = { id:uid(), title, notes:'', createdAt:nowISO(), dueDate:(dueDate||''), status:false, category:(category||''), tags:normTags(tags).join(','), updatedAt:nowISO(), isDeleted:false };
  state.tasks.push(t); saveDB(); renderTasks();
}
function updateTask(p){
  const i = state.tasks.findIndex(x=>x.id===p.id); if(i<0) return;
  const t = state.tasks[i];
  if(p.title!=null) t.title=p.title;
  if(p.dueDate!=null) t.dueDate=p.dueDate;
  if(p.status!=null) t.status=!!p.status;
  if(p.category!=null) t.category=p.category;
  if(p.tags!=null) t.tags=normTags(p.tags).join(',');
  t.updatedAt=nowISO(); saveDB(); renderTasks();
}
function toggleTask(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; t.status=!t.status; t.updatedAt=nowISO(); saveDB(); renderTasks(); }
function deleteTask(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; t.isDeleted=true; t.updatedAt=nowISO(); saveDB(); renderTasks(); }

/* ===== 標籤折疊（保留原有功能） ===== */
const TAG_VISIBLE_MAX = 4;
function makeTagsFrag(tagArr){
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('div'); wrap.className='tags';
  const total = tagArr.length, visible = Math.min(TAG_VISIBLE_MAX, total);
  for(let i=0;i<visible;i++){
    const s=document.createElement('span'); s.className='tag '+tagClassByIndex(i); s.textContent=tagArr[i]; wrap.appendChild(s);
  }
  if(total > TAG_VISIBLE_MAX){
    const hiddenBox=document.createElement('span'); hiddenBox.style.display='none';
    for(let i=TAG_VISIBLE_MAX;i<total;i++){
      const s=document.createElement('span'); s.className='tag '+tagClassByIndex(i); s.textContent=tagArr[i]; hiddenBox.appendChild(s);
    }
    wrap.appendChild(hiddenBox);
    const moreBtn=document.createElement('button'); moreBtn.className='tag-more'; moreBtn.textContent=`展開全部（${total}）`;
    moreBtn.onclick=()=>{ const opened=hiddenBox.style.display==='inline'; hiddenBox.style.display=opened?'none':'inline'; moreBtn.textContent=opened?`展開全部（${total}）`:'收起'; };
    wrap.appendChild(moreBtn);
  }
  frag.appendChild(wrap); return frag;
}

/* ===== 渲染 ===== */
function renderLinks(){
  const q = ($('#q').value||'').toLowerCase();
  const fcat = ($('#filterCategorySelect').value||'').trim();
  const ftag = ($('#filterTag').value||'').toLowerCase();
  const sort = $('#sort').value || 'created_desc';

  let arr = state.links.filter(x=>!x.isDeleted);
  arr = arr.filter(it=>{
    const tagsJoin = (it.tags||'').toLowerCase();
    const hitQ = !q || (it.title.toLowerCase().includes(q) || it.url.toLowerCase().includes(q) || tagsJoin.includes(q));
    const hitCat = !fcat || it.category===fcat;
    const hitTag = !ftag || tagsJoin.includes(ftag);
    return hitQ && hitCat && hitTag;
  });
  switch(sort){
    case 'created_asc': arr.sort((a,b)=> String(a.createdAt).localeCompare(b.createdAt)); break;
    case 'title_asc':  arr.sort((a,b)=> String(a.title).localeCompare(b.title)); break;
    case 'title_desc': arr.sort((a,b)=> String(b.title).localeCompare(a.title)); break;
    default:           arr.sort((a,b)=> String(b.createdAt).localeCompare(a.createdAt));
  }

  const box = $('#list'); box.innerHTML='';
  if(arr.length===0){ box.innerHTML = `<div class="card muted">目前沒有資料。貼上第一個連結開始吧！</div>`; return; }

  for(const it of arr){
    const card = document.createElement('div'); card.className='item'+(isStale(it.createdAt)?' stale':'');
    const head = document.createElement('div'); head.className='item-head';
    const ico = favicon(it.url); if(ico){ const img=document.createElement('img'); img.src=ico; img.className='fav'; head.appendChild(img); }
    const a = document.createElement('a'); a.href=it.url; a.target='_blank'; a.textContent=it.title || it.url; head.appendChild(a);

    const meta = document.createElement('div'); meta.className='meta';
    meta.textContent = `${new Date(it.createdAt).toLocaleString()} · 分類：${it.category || '（未填）'}`;

    const urlLine = document.createElement('div'); urlLine.className='meta'; urlLine.textContent = it.url;

    const tagFrag = makeTagsFrag(normTags(it.tags));

    const actions = document.createElement('div'); actions.className='actions';
    const edit = document.createElement('button'); edit.className='btn ghost'; edit.textContent='編輯';
    edit.onclick=()=>{
      const nt = prompt('標題', it.title); if(nt===null) return;
      const nc = prompt('分類（直接輸入或留空）', it.category||''); if(nc===null) return;
      const tg = prompt('標籤（逗號分隔）', normTags(it.tags).join(', ')); if(tg===null) return;
      updateLink({id:it.id, title:nt||it.url, category:nc||'', tags:tg});
    };
    const del = document.createElement('button'); del.className='btn danger'; del.textContent='刪除';
    del.onclick=()=>{ if(confirm('確定刪除？')) deleteLink(it.id); };

    actions.append(edit, del);
    card.append(head, meta, urlLine, tagFrag, actions);
    box.appendChild(card);
  }
}

function renderTasks(){
  const mode = $('#taskView').value || 'all';
  const sort = $('#taskSort').value || 'due_asc';
  let arr = state.tasks.filter(t=>!t.isDeleted);
  if(mode==='open') arr = arr.filter(t=>!t.status);
  if(mode==='done') arr = arr.filter(t=> t.status);

  const byDue = (a,b,dir=1)=> (String(a.dueDate||'').localeCompare(String(b.dueDate||'')))*dir;
  switch(sort){
    case 'due_desc':      arr.sort((a,b)=> byDue(a,b,-1)); break;
    case 'created_desc':  arr.sort((a,b)=> String(b.createdAt).localeCompare(String(a.createdAt))); break;
    default:              arr.sort((a,b)=> byDue(a,b, 1)); break;
  }

  const wrap = $('#taskList'); wrap.innerHTML='';
  if(arr.length===0){ wrap.innerHTML = `<div class="card muted">目前沒有任務</div>`; return; }

  for(const t of arr){
    const card = document.createElement('div'); card.className='item'+(isOverdue(t.dueDate)?' overdue':'');
    const row = document.createElement('div'); row.className='item-head';
    const chk = document.createElement('input'); chk.type='checkbox'; chk.checked=!!t.status; chk.onchange=()=>toggleTask(t.id);
    const tt = document.createElement('div'); tt.textContent = t.title || '(未填)';
    row.append(chk, tt);

    const meta = document.createElement('div'); meta.className='meta';
    meta.textContent = `建立：${new Date(t.createdAt).toLocaleString()} · 到期：${t.dueDate||'未設定'} · 分類：${t.category||'（未填）'}`;

    const tagFrag = makeTagsFrag(normTags(t.tags));

    const actions = document.createElement('div'); actions.className='actions';
    const edit = document.createElement('button'); edit.className='btn ghost'; edit.textContent='編輯';
    edit.onclick=()=>{
      const nt = prompt('任務', t.title); if(nt===null) return;
      const nd = prompt('到期日（YYYY-MM-DD）', t.dueDate||''); if(nd===null) return;
      const nc = prompt('分類', t.category||''); if(nc===null) return;
      const tg = prompt('標籤（逗號分隔）', normTags(t.tags).join(', ')); if(tg===null) return;
      updateTask({id:t.id, title:nt, dueDate:nd, category:nc, tags:tg});
    };
    const del = document.createElement('button'); del.className='btn danger'; del.textContent='刪除';
    del.onclick=()=>{ if(confirm('確定刪除此任務？')) deleteTask(t.id); };

    actions.append(edit, del);
    card.append(row, meta, tagFrag, actions);
    wrap.appendChild(card);
  }
}

/* ===== 匯出／匯入 ===== */
function exportJSON(){
  const blob = new Blob([JSON.stringify({version:4, ...state, linkCats, taskCats}, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `whitecoating-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}
function importJSON(file){
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const j = JSON.parse(r.result);
      state.links = j.links || state.links;
      state.tasks = j.tasks || state.tasks;
      state.staleDays = Number(j.staleDays ?? state.staleDays);
      state.overdueDays = Number(j.overdueDays ?? state.overdueDays);
      linkCats = Array.isArray(j.linkCats) && j.linkCats.length ? j.linkCats : linkCats;
      taskCats = Array.isArray(j.taskCats) && j.taskCats.length ? j.taskCats : taskCats;
      saveDB(); saveCats(); renderCategorySelectors(); renderLinks(); renderTasks();
      alert('匯入完成');
    }catch(e){ alert('匯入失敗：'+e.message); }
  };
  r.readAsText(file);
}

/* ===== 綁定 ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  loadDB();
  renderCategorySelectors();
  $('#staleDays').value = state.staleDays;
  $('#overdueDays').value = state.overdueDays;

  // 連結
  $('#addLink').onclick = ()=>{
    try{
      addLink({
        url: $('#url').value.trim(),
        title: $('#title').value.trim(),
        category: $('#categorySelect').value,
        tags: $('#tags').value.trim()
      });
      $('#url').value=''; $('#title').value='';
    }catch(e){ alert('新增失敗：'+e.message); }
  };
  $('#addCategoryBtn').onclick = ()=> promptAddCategory('link');

  // 篩選
  ['q','sort','filterCategorySelect','filterTag'].forEach(id=>{
    const el = $('#'+id); el.addEventListener('input', renderLinks); el.addEventListener('change', renderLinks);
  });
  $('#clearFilters').onclick = ()=>{
    $('#q').value=''; $('#sort').value='created_desc'; $('#filterCategorySelect').value=''; $('#filterTag').value='';
    renderLinks();
  };
  $('#applyStale').onclick = ()=>{
    const v = Number($('#staleDays').value);
    if(!Number.isFinite(v) || v<=0) return alert('請輸入有效天數');
    state.staleDays = v; saveDB(); renderLinks();
  };

  // 任務
  $('#addTask').onclick = ()=>{
    try{
      addTask({
        title: $('#taskTitle').value.trim(),
        dueDate: $('#taskDue').value,
        category: $('#taskCategorySelect').value,
        tags: $('#taskTags').value.trim()
      });
      $('#taskTitle').value=''; $('#taskDue').value='';
    }catch(e){ alert('新增失敗：'+e.message); }
  };
  $('#addTaskCategoryBtn').onclick = ()=> promptAddCategory('task');
  $('#taskView').addEventListener('change', renderTasks);
  $('#taskSort').addEventListener('change', renderTasks);
  $('#overdueDays').addEventListener('change', ()=>{
    const v = Number($('#overdueDays').value);
    if(Number.isFinite(v) && v>0){ state.overdueDays=v; saveDB(); renderTasks(); }
  });

  // 匯出／匯入
  $('#exportBtn').onclick = exportJSON;
  $('#importFile').onchange = (e)=>{ const f=e.target.files?.[0]; if(f) importJSON(f); };

  // FAB 快捷新增
  $('#fabAddLink').onclick = async ()=>{
    let clip=''; try{ clip = (await navigator.clipboard.readText()) || ''; }catch{}
    const u = prompt('貼上連結 URL：', clip);
    if(!u) return;
    addLink({url:u, title:'', category:$('#categorySelect').value, tags:''});
  };

  $('#manageCatsBtn').onclick = manageCategories;

  // 🔴 新增：切換清單顯示（避免清單過度堆疊）
  const toggleBox = (btnId, boxId)=>{
    const btn = document.getElementById(btnId);
    const box = document.getElementById(boxId);
    if(!btn || !box) return;
    btn.onclick = ()=>{
      const hidden = box.style.display==='none';
      box.style.display = hidden ? '' : 'none';
      btn.textContent = hidden ? '隱藏' : '顯示';
    };
  };
  toggleBox('toggleLinks','list');
  toggleBox('toggleTasks','taskList');

  renderLinks(); renderTasks();
});
