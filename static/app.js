const CORA_CLASSES = {
  0: "Case_Based", 1: "Genetic_Algorithms", 2: "Neural_Networks",
  3: "Probabilistic_Methods", 4: "Reinforcement_Learning",
  5: "Rule_Learning", 6: "Theory"
};
const CLASS_COLOR_VAR = ['--c0','--c1','--c2','--c3','--c4','--c5','--c6'];
const rootStyles = getComputedStyle(document.documentElement);
const classColor = id => rootStyles.getPropertyValue(CLASS_COLOR_VAR[id]).trim();
const MAX_NODE_INDEX = 2707;
const RING_RADIUS = 31;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

let selected = [];       // node indices the user has picked
let lastResults = null;  // most recent /predict/cora_node response
let activeFilter = null; // class id currently spotlighted via the legend
const sortState = {};    // cardId -> 'default' | 'prob'

// ---------- generic helpers ----------
function showError(msg){
  const b = document.getElementById('error-banner');
  b.textContent = msg;
  b.classList.add('show');
}
function clearError(){
  document.getElementById('error-banner').classList.remove('show');
}
async function api(path, opts){
  const res = await fetch(path, opts);
  let body;
  try{ body = await res.json(); } catch(e){ body = null; }
  if(!res.ok){
    const detail = body && body.detail ? body.detail : res.statusText;
    throw new Error(detail);
  }
  return body;
}

// ---------- legend (clickable filter) ----------
function buildLegend(){
  const el = document.getElementById('legend');
  el.innerHTML = '';
  Object.entries(CORA_CLASSES).forEach(([id, name])=>{
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.dataset.classId = id;
    item.style.color = 'var(' + CLASS_COLOR_VAR[id] + ')';
    item.innerHTML = `<span class="swatch" style="background:${classColor(id)}"></span>${name.replace(/_/g,' ')}`;
    item.addEventListener('click', ()=> toggleFilter(Number(id)));
    el.appendChild(item);
  });
}
function toggleFilter(id){
  activeFilter = (activeFilter === id) ? null : id;
  document.querySelectorAll('.legend-item').forEach(el=>{
    const eid = Number(el.dataset.classId);
    el.classList.toggle('active', activeFilter === eid);
    el.classList.toggle('dimmed', activeFilter !== null && activeFilter !== eid);
  });
  applyFilterToCards();
}
function applyFilterToCards(){
  document.querySelectorAll('.paper-card').forEach(card=>{
    const cid = Number(card.dataset.classId);
    card.classList.toggle('dimmed', activeFilter !== null && activeFilter !== cid);
  });
}

// ---------- status ----------
async function loadStatus(){
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  try{
    const health = await api('/health');
    if(health.status === 'healthy'){
      dot.classList.add('ok');
      text.textContent = 'model online';
    } else {
      dot.classList.add('bad');
      text.textContent = 'model unhealthy';
    }
  }catch(e){
    dot.classList.add('bad');
    text.textContent = 'backend unreachable';
    return;
  }
  try{
    const info = await api('/info');
    const dim = info.feature_dimension ?? '?';
    const nc = info.num_classes ?? '?';
    document.getElementById('foot-stats').textContent =
      `2,708 papers · 5,429 citation edges · ${dim} word features · ${nc} topics`;
  }catch(e){ /* footer keeps its static defaults */ }
}

// ---------- chip input ----------
function renderChips(){
  const wrap = document.getElementById('chips');
  wrap.innerHTML = '';
  selected.forEach(idx=>{
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `#${idx} <button type="button" aria-label="remove">×</button>`;
    chip.querySelector('button').addEventListener('click', ()=>{
      selected = selected.filter(n=>n!==idx);
      renderChips();
    });
    wrap.appendChild(chip);
  });
  document.getElementById('chip-count').textContent = `${selected.length} selected`;
}

function tryAddFromInput(){
  const input = document.getElementById('chip-input');
  const raw = input.value.trim().replace(/,$/, '');
  if(raw === '') return;
  const n = parseInt(raw, 10);
  if(!Number.isInteger(n) || n < 0 || n > MAX_NODE_INDEX){
    showError(`"${raw}" isn't a valid node index — use a whole number between 0 and ${MAX_NODE_INDEX}.`);
    input.value = '';
    return;
  }
  clearError();
  if(!selected.includes(n)) selected.push(n);
  input.value = '';
  renderChips();
}

document.getElementById('chip-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' || e.key === ','){
    e.preventDefault();
    tryAddFromInput();
  } else if(e.key === 'Backspace' && e.target.value === '' && selected.length){
    selected.pop();
    renderChips();
  }
});
document.getElementById('chip-field').addEventListener('click', ()=>{
  document.getElementById('chip-input').focus();
});

document.getElementById('preset-first').addEventListener('click', ()=>{
  selected = Array.from({length:10}, (_,i)=>i);
  renderChips();
});
document.getElementById('preset-random').addEventListener('click', ()=>{
  const set = new Set();
  while(set.size < 5) set.add(Math.floor(Math.random()*(MAX_NODE_INDEX+1)));
  selected = [...set];
  renderChips();
});
document.getElementById('preset-clear').addEventListener('click', ()=>{
  selected = [];
  renderChips();
  lastResults = null;
  document.getElementById('results-section').innerHTML =
    '<div class="empty-state">Select some node indices above and hit "Classify selected" to see predictions.</div>';
});

// ---------- confidence ring ----------
function ringSVG(pct, color){
  const offset = RING_CIRC * (1 - pct / 100);
  return `<div class="ring-wrap">
    <svg viewBox="0 0 76 76">
      <circle class="ring-track" cx="38" cy="38" r="${RING_RADIUS}"></circle>
      <circle class="ring-fill" cx="38" cy="38" r="${RING_RADIUS}"
        stroke="${color}"
        stroke-dasharray="${RING_CIRC}"
        stroke-dashoffset="${RING_CIRC}"
        data-target-offset="${offset}"></circle>
    </svg>
    <div class="ring-label">${pct.toFixed(0)}%</div>
  </div>`;
}

// ---------- results rendering ----------
function orderedEntries(probs, mode){
  const entries = Object.entries(CORA_CLASSES).map(([id, name])=>({
    id: Number(id), name, p: probs[id] || 0
  }));
  if(mode === 'prob') entries.sort((a,b)=> b.p - a.p);
  return entries;
}

function probRowsHTML(probs, topId, mode){
  return orderedEntries(probs, mode).map(({id, name, p})=>{
    const pct = (p*100).toFixed(1);
    const topClass = id === topId ? ' top' : '';
    return `<div class="prob-row${topClass}" data-class-id="${id}">
      <span class="pb-label">${name.replace(/_/g,' ')}</span>
      <span class="prob-track"><span class="prob-fill" data-target-width="${pct}" style="background:${classColor(id)}"></span></span>
      <span class="pb-val">${pct}%</span>
    </div>`;
  }).join('');
}

function paperCardHTML(r, cardId){
  const conf = Math.max(...r.probabilites) * 100;
  const color = classColor(r.predicted_class_id);
  const logitsText = r.logits.map((v,i)=>`${CORA_CLASSES[i].padEnd(22)} ${v.toFixed(4)}`).join('\n');
  sortState[cardId] = sortState[cardId] || 'default';
  return `<div class="paper-card" style="border-left-color:${color}" data-class-id="${r.predicted_class_id}" id="${cardId}">
    ${ringSVG(conf, color)}
    <div class="paper-body">
      <div class="paper-top">
        <span class="paper-idx">paper #${r.node_index}</span>
        <button class="sort-toggle" data-card="${cardId}">sort by probability</button>
      </div>
      <div class="paper-class">${r.predicted_class_name.replace(/_/g,' ')}</div>
      <div class="prob-rows" id="${cardId}-rows">${probRowsHTML(r.probabilites, r.predicted_class_id, sortState[cardId])}</div>
      <button class="logit-toggle" data-target="${cardId}-logits">show raw logits</button>
      <pre class="logit-box" id="${cardId}-logits">${logitsText}</pre>
    </div>
  </div>`;
}

function animateInsertedBars(container){
  requestAnimationFrame(()=>{
    container.querySelectorAll('.prob-fill').forEach(el=>{
      el.style.width = el.dataset.targetWidth + '%';
    });
    container.querySelectorAll('.ring-fill').forEach(el=>{
      el.style.strokeDashoffset = el.dataset.targetOffset;
    });
  });
}

function wireCardInteractions(section){
  section.querySelectorAll('.logit-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const box = document.getElementById(btn.dataset.target);
      box.classList.toggle('show');
      btn.textContent = box.classList.contains('show') ? 'hide raw logits' : 'show raw logits';
    });
  });
  section.querySelectorAll('.sort-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cardId = btn.dataset.card;
      sortState[cardId] = sortState[cardId] === 'prob' ? 'default' : 'prob';
      btn.textContent = sortState[cardId] === 'prob' ? 'sort by topic' : 'sort by probability';
      const r = lastResults.predictions.find(p => `card-${p.node_index}` === cardId);
      const rowsWrap = document.getElementById(cardId + '-rows');
      rowsWrap.innerHTML = probRowsHTML(r.probabilites, r.predicted_class_id, sortState[cardId]);
      animateInsertedBars(rowsWrap);
    });
  });
}

function renderResults(data){
  clearError();
  lastResults = data;
  activeFilter = null;
  document.querySelectorAll('.legend-item').forEach(el=>{
    el.classList.remove('active','dimmed');
  });
  const section = document.getElementById('results-section');
  const meta = `<div class="results-meta">
    <span><b>${data.num_nodes}</b> papers in this call</span>
    <span><b>${data.num_edges}</b> citation edges used</span>
    <span><b>${data.predictions.length}</b> classified</span>
  </div>`;
  const cards = data.predictions
    .map(r => paperCardHTML(r, `card-${r.node_index}`))
    .join('');
  section.innerHTML = meta + cards;
  wireCardInteractions(section);
  animateInsertedBars(section);
}

// ---------- classify ----------
document.getElementById('classify-btn').addEventListener('click', async ()=>{
  clearError();
  tryAddFromInput(); // catch anything still sitting in the text box
  if(selected.length === 0){
    showError('Add at least one node index first.');
    return;
  }
  const btn = document.getElementById('classify-btn');
  btn.disabled = true;
  btn.textContent = 'Classifying…';
  try{
    const data = await api('/predict/cora_node', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ node_indices: selected })
    });
    renderResults(data);
  }catch(e){
    showError('Could not classify these papers: ' + e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = 'Classify selected';
  }
});

// ---------- init ----------
buildLegend();
loadStatus();
renderChips();
document.getElementById('results-section').innerHTML =
  '<div class="empty-state">Select some node indices above and hit "Classify selected" to see predictions.</div>';
