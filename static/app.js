const CORA_CLASSES = {
  0: "Case_Based", 1: "Genetic_Algorithms", 2: "Neural_Networks",
  3: "Probabilistic_Methods", 4: "Reinforcement_Learning", 5: "Rule_Learning", 6: "Theory"
};
const CLASS_COLORS = {
  0: "var(--c0)", 1: "var(--c1)", 2: "var(--c2)", 3: "var(--c3)",
  4: "var(--c4)", 5: "var(--c5)", 6: "var(--c6)"
};
const FEATURE_DIM = 1433;

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-"+btn.dataset.tab).classList.add("active");
  });
});

/* ---------- Health check ---------- */
async function checkHealth(){
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  try{
    const res = await fetch("/health");
    if(!res.ok) throw new Error("bad status");
    const data = await res.json();
    dot.className = "dot ok";
    const providers = (data.providers || []).join(", ");
    text.textContent = `backend healthy · ${providers || "onnxruntime"}`;
  }catch(err){
    dot.className = "dot bad";
    text.textContent = "backend unreachable — start the API server to enable predictions";
  }
}
checkHealth();

/* ---------- Model info ---------- */
function renderClassList(){
  const ul = document.getElementById("class-list");
  ul.innerHTML = "";
  for(const [id, name] of Object.entries(CORA_CLASSES)){
    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch" style="background:${CLASS_COLORS[id]}"></span><span class="idx">${id}</span><span class="name">${name.replaceAll("_"," ")}</span>`;
    ul.appendChild(li);
  }
}
renderClassList();

async function loadInfo(){
  const inTable = document.getElementById("inputs-table");
  const outTable = document.getElementById("outputs-table");
  try{
    const res = await fetch("/info");
    if(!res.ok) throw new Error("request failed");
    const data = await res.json();

    inTable.innerHTML = "";
    (data.inputs || []).forEach(inp=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${inp.name}</td><td>${JSON.stringify(inp.shape)}</td><td>${inp.type}</td>`;
      inTable.appendChild(tr);
    });
    if(!(data.inputs||[]).length) inTable.innerHTML = `<tr><td colspan="3" class="hint">none reported</td></tr>`;

    outTable.innerHTML = "";
    (data.outputs || []).forEach(out=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${out.name}</td><td>${JSON.stringify(out.shape)}</td><td>${out.type}</td>`;
      outTable.appendChild(tr);
    });
    if(!(data.outputs||[]).length) outTable.innerHTML = `<tr><td colspan="3" class="hint">none reported</td></tr>`;
  }catch(err){
    inTable.innerHTML = `<tr><td colspan="3" class="hint">could not load — is the backend running?</td></tr>`;
    outTable.innerHTML = `<tr><td colspan="3" class="hint">could not load — is the backend running?</td></tr>`;
  }
}
loadInfo();

/* ---------- Shared result rendering ---------- */
function renderResults(container, predictions){
  container.innerHTML = "";
  predictions.forEach(p=>{
    const card = document.createElement("div");
    card.className = "result-card";
    card.style.borderLeftColor = CLASS_COLORS[p.predicted_class_id];

    const head = document.createElement("div");
    head.className = "result-head";
    head.innerHTML = `
      <span class="node-tag">node ${p.node_index}</span>
      <span class="pred-name" style="color:${CLASS_COLORS[p.predicted_class_id]}">${p.predicted_class_name.replaceAll("_"," ")}</span>
    `;
    card.appendChild(head);

    const probs = p.probabilites || p.probabilities || [];
    const maxIdx = probs.indexOf(Math.max(...probs));
    probs.forEach((prob, idx)=>{
      const row = document.createElement("div");
      row.className = "bar-row" + (idx===maxIdx ? " winner" : "");
      const pct = (prob*100).toFixed(1);
      row.innerHTML = `
        <span class="bname">${CORA_CLASSES[idx].replaceAll("_"," ")}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${CLASS_COLORS[idx]};opacity:${idx===maxIdx?1:0.45}"></span></span>
        <span class="bpct">${pct}%</span>
      `;
      card.appendChild(row);
    });

    container.appendChild(card);
  });
}

function showMsg(el, text, type){
  el.innerHTML = `<div class="msg ${type||""}">${text}</div>`;
}
function clearMsg(el){ el.innerHTML = ""; }

/* ---------- Cora node classification ---------- */
document.getElementById("cora-submit").addEventListener("click", async ()=>{
  const msgEl = document.getElementById("cora-msg");
  const resultsEl = document.getElementById("cora-results");
  const raw = document.getElementById("cora-indices").value;

  const node_indices = raw.split(",").map(s=>s.trim()).filter(Boolean).map(Number);
  if(!node_indices.length || node_indices.some(isNaN)){
    showMsg(msgEl, "Enter one or more valid integer node indices, comma-separated.", "error");
    return;
  }

  resultsEl.innerHTML = "";
  showMsg(msgEl, "Loading CORA dataset and running the model — this can take a moment on first call…", "loading");

  try{
    const res = await fetch("/predict/cora_node", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({node_indices})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.detail || "request failed");

    clearMsg(msgEl);
    renderResults(resultsEl, data.predictions);
  }catch(err){
    showMsg(msgEl, "Error: " + err.message, "error");
  }
});

/* ---------- Synthetic graph generator ---------- */
document.getElementById("gen-btn").addEventListener("click", ()=>{
  const n = Math.max(1, Math.min(50, parseInt(document.getElementById("gen-nodes").value) || 1));
  const mode = document.getElementById("gen-mode").value;

  const features = [];
  for(let i=0;i<n;i++){
    const row = new Array(FEATURE_DIM).fill(0);
    if(mode === "sparse"){
      const nnz = 20 + Math.floor(Math.random()*30);
      for(let k=0;k<nnz;k++) row[Math.floor(Math.random()*FEATURE_DIM)] = 1;
    } else {
      for(let k=0;k<FEATURE_DIM;k++) row[k] = Math.round(Math.random()*1000)/1000;
    }
    features.push(row);
  }
  document.getElementById("custom-features").value = JSON.stringify(features);
  document.getElementById("feature-hint").textContent =
    `generated ${n} node(s) × ${FEATURE_DIM} features (${mode}) — edit or replace freely`;
});

/* ---------- Custom graph classification ---------- */
document.getElementById("custom-submit").addEventListener("click", async ()=>{
  const msgEl = document.getElementById("custom-msg");
  const resultsEl = document.getElementById("custom-results");
  const featRaw = document.getElementById("custom-features").value.trim();
  const edgeRaw = document.getElementById("custom-edges").value.trim();

  if(!featRaw){
    showMsg(msgEl, "Provide node_features — use Generate for a quick synthetic graph.", "error");
    return;
  }

  let node_features, edge_indices;
  try{
    node_features = JSON.parse(featRaw);
    if(!Array.isArray(node_features) || !node_features.every(r=>Array.isArray(r) && r.length===FEATURE_DIM)){
      throw new Error(`each row must be an array of exactly ${FEATURE_DIM} numbers`);
    }
  }catch(err){
    showMsg(msgEl, "node_features isn't valid: " + err.message, "error");
    return;
  }

  if(edgeRaw){
    try{
      edge_indices = JSON.parse(edgeRaw);
      if(!Array.isArray(edge_indices) || edge_indices.length !== 2){
        throw new Error("must have shape [2, num_edges]");
      }
    }catch(err){
      showMsg(msgEl, "edge_indices isn't valid: " + err.message, "error");
      return;
    }
  }

  resultsEl.innerHTML = "";
  showMsg(msgEl, "Running inference…", "loading");

  const body = { node_features };
  if(edge_indices) body.edge_indices = edge_indices;

  try{
    const res = await fetch("/predict", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.detail || "request failed");

    clearMsg(msgEl);
    renderResults(resultsEl, data.predictions);

    const strip = document.createElement("div");
    strip.className = "summary-strip";
    strip.innerHTML = `<span>${data.num_nodes} node(s)</span><span>${data.num_edges} edge(s)</span>`;
    resultsEl.prepend(strip);
  }catch(err){
    showMsg(msgEl, "Error: " + err.message, "error");
  }
});
