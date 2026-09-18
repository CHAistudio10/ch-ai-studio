const KEY='ch_ai_studio_state_v1';

let state=JSON.parse(localStorage.getItem(KEY)||'null')||{
  credits:20,
  assets:[],
  projects:[],
  mode:'image'
};

function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  renderCredits();
  renderRecent();
  renderAssets();
  renderProjects();
}

function renderCredits(){
  const a=document.getElementById('topCredits');
  const b=document.getElementById('sideCredits');
  if(a)a.textContent=state.credits;
  if(b)b.textContent=state.credits;
}

function go(page){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  const el=document.getElementById('page-'+page);
  if(el)el.classList.add('active');
}

function toggleSidebar(){
  const el=document.getElementById('sidebar');
  if(el)el.classList.toggle('open');
}

function showToast(msg){
  const t=document.getElementById('toast');
  if(!t)return;
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}

function setMode(mode){
  state.mode=mode;
  const a=document.getElementById('tabImage');
  const b=document.getElementById('tabVideo');
  const c=document.getElementById('cost');

  if(a)a.classList.toggle('active',mode==='image');
  if(b)b.classList.toggle('active',mode==='video');
  if(c)c.textContent=mode==='image'?2:4;

  save();
}

function previewRef(e){
  const f=e.target.files[0];
  if(!f)return;

  const url=URL.createObjectURL(f);
  const img=document.getElementById('refImg');
  const box=document.getElementById('refPreview');

  if(img)img.src=url;
  if(box)box.classList.remove('hidden');
}

function clearRef(){
  const f=document.getElementById('refFile');
  const box=document.getElementById('refPreview');

  if(f)f.value='';
  if(box)box.classList.add('hidden');
}

async function generate(){
  const prompt=document.getElementById('prompt').value.trim();

  if(!prompt){
    showToast('Tulis prompt dulu.');
    return;
  }

  if(state.mode==='video'){
    showToast('Saat ini baru bisa membuat gambar.');
    return;
  }

  const cost=2;

  if(state.credits<cost){
    showToast('Kredit tidak cukup.');
    go('pricing');
    return;
  }

  const btn=document.querySelector('.generate-btn');
  const oldText=btn?btn.textContent:'Generate';

  if(btn){
    btn.disabled=true;
    btn.textContent='⏳ Membuat AI...';
  }

  try{
    const ratioEl=document.getElementById('ratio');
    const ratio=ratioEl?ratioEl.value:'9:16';

    const response=await fetch('/api/generate',{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        prompt:prompt,
        ratio:ratio
      })
    });

    const data=await response.json();

    if(!response.ok){
      throw new Error(data.error||'Generate gagal.');
    }

    if(!data.image){
      throw new Error('Server tidak mengirim gambar.');
    }

    const item={
      id:Date.now(),
      prompt:prompt,
      mode:'image',
      ratio:ratio,
      model:data.model||'Pollinations AI',
      date:new Date().toLocaleString('id-ID'),
      image:data.image
    };

    state.credits-=cost;
    state.assets.unshift(item);

    state.projects.unshift({
      id:Date.now(),
      name:prompt.slice(0,38)+(prompt.length>38?'…':''),
      date:item.date,
      type:'image'
    });

    state.projects=state.projects.slice(0,20);

    save();
    renderResults([item]);

    showToast('🎉 Gambar AI berhasil dibuat!');
  }catch(err){
    console.error(err);
    showToast(err.message||'Generate gagal.');
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent=oldText;
    }
  }
}

function renderResults(items){
  const box=document.getElementById('results');
  if(!box)return;

  box.innerHTML=items.map(card).join('');
}

function card(x){
  const visual=x.image
    ? '<img src="'+x.image+'" alt="AI Result" style="width:100%;height:100%;object-fit:cover">'
    : '<div class="fake-image"><b>✦ CH AI STUDIO</b></div>';

  return '<article class="result-card">'+
    '<div style="aspect-ratio:16/10;overflow:hidden">'+
    visual+
    '</div>'+
    '<div class="result-info">'+
    '<b>'+escapeHtml(x.prompt.slice(0,55))+'</b>'+
    '<small>'+escapeHtml(x.model)+' · '+escapeHtml(x.date)+'</small>'+
    '</div>'+
    '</article>';
}

function escapeHtml(text){
  return String(text)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function renderRecent(){
  const box=document.getElementById('recentGrid');
  if(!box)return;

  if(!state.assets.length){
    box.className='result-grid empty-state';
    box.innerHTML='<p>Belum ada hasil. Coba buat gambar pertama kamu.</p>';
    return;
  }

  box.className='result-grid';
  box.innerHTML=state.assets.slice(0,3).map(card).join('');
}

function renderAssets(){
  const box=document.getElementById('assetGrid');
  if(!box)return;

  if(!state.assets.length){
    box.className='result-grid empty-state';
    box.innerHTML='<p>Belum ada asset.</p>';
    return;
  }

  box.className='result-grid';
  box.innerHTML=state.assets.map(card).join('');
}

function renderProjects(){
  const box=document.getElementById('projectList');
  if(!box)return;

  if(!state.projects.length){
    box.innerHTML='<div class="empty-state">Belum ada project.</div>';
    return;
  }

  box.innerHTML=state.projects.map(p=>
    '<div class="card-item"><div><b>'+
    escapeHtml(p.name)+
    '</b><small style="display:block;color:#777;margin-top:5px">'+
    escapeHtml(p.type)+' · '+escapeHtml(p.date)+
    '</small></div></div>'
  ).join('');
}

function useTemplate(p){
  go('generate');
  const el=document.getElementById('prompt');
  if(el)el.value=p;
  showToast('Template dimasukkan ke prompt');
}

function instantIdeas(){
  const ideas=[
    'Model memakai kaos C.H di jalan Jakarta saat malam',
    'Behind the scenes proses desain kaos C.H',
    'POV driver ojol menemukan fashion brand lokal',
    'Street interview tentang arti tulisan di kaos C.H',
    'Cinematic product reveal kaos dengan lampu neon'
  ];

  const box=document.getElementById('ideas');
  if(box){
    box.innerHTML=ideas.map((x,i)=>
      '<div class="idea">'+(i+1)+'. '+escapeHtml(x)+'</div>'
    ).join('');
  }
}

function buyCredits(n){
  state.credits+=n;
  save();
  showToast('Demo: +'+n+' kredit ditambahkan');
}

document.addEventListener('DOMContentLoaded',()=>{
  renderCredits();
  renderRecent();
  renderAssets();
  renderProjects();
});
