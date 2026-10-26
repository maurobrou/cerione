/* CERIONE · camada de nuvem (Supabase): login, laboratórios, dados por área com permissão, convites e gestão da plataforma */
(function(){
const CFG=window.CERIONE_CFG||{};
const C={sb:null,user:null,lab:null,role:null,admin:false,st:null,ver:{},sent:{},inflight:false,timer:null,dirty:false,auditSent:0,status:'idle',lastOk:null,members:[]};
window.CERIONE_CLOUD=C;
const $=id=>document.getElementById(id);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LAST='cerione-last-lab';
/* ---------- áreas: quais dados ficam em cada documento e quem grava ---------- */
const AREAS={producao:['orders','seq','services','team','stgV'],clientes:['clients'],mensagens:['msgs'],
  financeiro:['receivables','invoices','invSeq','payables','posted','accounts','cashMoves','bankLines','bankImports','nfse','chart'],
  estoque:['materials','moves','suppliers','nfeIn','nfeMap'],custos:['fixed','equipment','precImport','fichasV','precV','teamCost'],config:['settings','memberTeam','demoAutoV','_rcDismiss']};
const LOCAL=new Set(['users','audit','_imported']);
const WRITE={dono:Object.keys(AREAS),fin:['producao','clientes','mensagens','financeiro','estoque'],rec:['producao','clientes','mensagens','estoque'],tec:['producao']};
const COST=['qtd','sal','semTrib','benef','adic','encPct','prodFlag','auxFlag','costOn','precKey'];
const canW=a=>C.st&&C.st.can_write&&(WRITE[C.role]||[]).includes(a);
function split(){const out={};if(!S)return out;Object.keys(AREAS).forEach(a=>out[a]={});
  Object.keys(S).forEach(k=>{if(LOCAL.has(k))return;const a=Object.keys(AREAS).find(x=>AREAS[x].includes(k))||'config';out[a][k]=S[k]});
  out.producao.team=(S.team||[]).map(t=>{const o={};Object.keys(t).forEach(k=>{if(!COST.includes(k))o[k]=t[k]});return o});
  const tc={};(S.team||[]).forEach(t=>{const o={};COST.forEach(k=>{if(t[k]!==undefined)o[k]=t[k]});tc[t.id]=o});out.custos.teamCost=tc;delete out.producao.teamCost;
  out.config.memberTeam=S.memberTeam||{};return out}
function merge(docs){const base=emptyData();const D={...base};Object.values(docs).forEach(d=>{if(d)Object.assign(D,d)});
  const tc=(docs.custos&&docs.custos.teamCost)||{};D.team=(D.team||[]).map(t=>({...t,...(tc[t.id]||{})}));delete D.teamCost;
  if(!D.settings)D.settings=base.settings;return D}
const J=x=>JSON.stringify(x);
/* ---------- estilos ---------- */
const css=document.createElement('style');css.textContent=`
.auth{position:fixed;inset:0;z-index:80;background:radial-gradient(120% 70% at 0% 0%,rgb(61 217 206/.12),transparent 55%),linear-gradient(180deg,#0B1018,#0A0E14);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:max(40px,env(safe-area-inset-top,0px)) 16px 40px;color:#E7ECF3}
.auth .box{width:100%;max-width:440px;background:#10161E;border:1px solid #212B38;border-radius:18px;padding:28px;display:flex;flex-direction:column;gap:14px;margin-top:6vh;box-shadow:0 30px 80px -30px rgb(0 0 0/.6)}
.auth .box.wide{max-width:1100px;margin-top:2vh}
.auth h2{color:#E7ECF3}.auth .sub,.auth .mut{color:#8B96A8}.auth label{color:#AEB8C8}
.auth input,.auth select,.auth textarea{background:#0A0E14;border:1px solid #2A3544;color:#E7ECF3;border-radius:10px;padding:10px 12px;width:100%}
.auth .logo{font-family:var(--f-display);font-weight:700;font-size:22px;letter-spacing:.22em;color:#E7ECF3;display:flex;align-items:center;gap:10px}
.auth form{display:flex;flex-direction:column;gap:12px}.auth .row{display:flex;gap:8px;flex-wrap:wrap}.auth .row .btn{flex:1;justify-content:center}
.auth .btn{background:#171F29;border-color:#2A3544;color:#E7ECF3}.auth .btn.primary{background:#3DD9CE;border-color:#3DD9CE;color:#03211F}
.auth .msg{font-size:13px;border-radius:10px;padding:9px 12px;background:#171F29}.auth .msg.err{background:#3A1C1A;color:#F28B81}.auth .msg.ok{background:#10301F;color:#5ED6A0}
.auth .opt{display:flex;flex-direction:column;gap:8px}.auth .opt button{justify-content:flex-start;text-align:left;white-space:normal;padding:12px 14px}
.auth table{width:100%;border-collapse:collapse;font-size:13px}.auth th{color:#8B96A8;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:8px;border-bottom:1px solid #212B38}.auth td{padding:9px 8px;border-bottom:1px solid #1A2230;vertical-align:top;color:#E7ECF3}.auth b,.auth h2{color:#E7ECF3}.auth td select{min-width:130px}.auth td input{min-width:120px}
.auth .kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.auth .kp div{background:#0A0E14;border:1px solid #212B38;border-radius:12px;padding:12px}.auth .kp b{display:block;font-family:var(--f-display);font-size:22px}
.st-pill{font-size:11px;border-radius:99px;padding:2px 9px;background:#171F29;color:#AEB8C8}.st-pill.trial{background:#0E2C2C;color:#3DD9CE}.st-pill.ativo{background:#10301F;color:#5ED6A0}.st-pill.atrasado{background:#35281A;color:#EBBC6C}.st-pill.bloqueado,.st-pill.cancelado{background:#3A1C1A;color:#F28B81}
.cloudbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px}.cloudbar .st{display:inline-flex;align-items:center;gap:6px}.cloudbar .st::before{content:"";width:7px;height:7px;border-radius:50%;background:#8B96A8}
.cloudbar .st.ok::before{background:#5ED6A0}.cloudbar .st.saving::before{background:#EBBC6C}.cloudbar .st.err::before{background:#F28B81}
.cloudbar .lk{background:none;border:0;padding:0;text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-size:12px;color:inherit}
.test-pill{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:99px;padding:3px 9px;background:#35281A;color:#EBBC6C}.ro-banner{background:var(--soon-soft);color:var(--soon);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:13px}
@media (min-width:960px){.cloudbar{padding-inline:10px;flex-direction:column;align-items:flex-start;gap:4px}}`;
document.head.appendChild(css);
const MARK=(document.querySelector('.logo .mark')||{}).outerHTML||'';
function screen(html,wide){let el=$('auth');if(!el){el=document.createElement('div');el.id='auth';el.className='auth';document.body.appendChild(el)}el.classList.remove('adm-on');el.innerHTML=`<div class="box ${wide?'wide':''}"><span class="logo">${MARK}CERIONE</span>${html}</div>`;el.hidden=false;return el}
function hideScreen(){const el=$('auth');if(el)el.remove()}
function msg(t,k=''){const m=$('au-msg');if(m){m.className='msg '+k;m.textContent=t;m.hidden=!t}}
const errTxt=e=>{const m=(e&&(e.message||e.error_description||e))+'';
  if(/Invalid login/i.test(m))return'E-mail ou senha incorretos.';if(/Email not confirmed/i.test(m))return'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if(/already registered|already exists/i.test(m))return'Este e-mail já tem conta. Use “Entrar”.';if(/Password should be/i.test(m))return'A senha precisa ter pelo menos 6 caracteres.';
  if(/invalid_code/i.test(m))return'Código de convite não encontrado.';if(/forbidden/i.test(m))return'Seu perfil não permite esta ação.';if(/last_owner/i.test(m))return'O laboratório precisa de pelo menos um Dono.';if(/limit_users/i.test(m))return'O plano do laboratório atingiu o limite de usuários. Fale com o CERIONE para mudar de plano.';
  if(/Failed to fetch|NetworkError/i.test(m))return'Sem conexão com a internet.';return m};
/* ---------- acesso ---------- */
function loginScreen(info=''){
  screen(`<p class="sub" style="margin:0">Gestão para laboratórios de prótese dentária. Entre com seu e-mail.</p><div id="au-msg" class="msg ${info?'ok':''}" ${info?'':'hidden'}>${h(info)}</div>
  <form id="au-form"><div class="field"><label for="au-email">E-mail</label><input type="email" id="au-email" autocomplete="email" required></div>
  <div class="field"><label for="au-pass">Senha</label><input type="password" id="au-pass" autocomplete="current-password" minlength="6" required></div>
  <div class="row"><button class="btn primary" type="submit" data-m="in">Entrar</button><button class="btn" type="submit" data-m="up">Criar conta</button></div></form>
  <button class="lk" id="au-forgot" style="background:none;border:0;color:#8B96A8;text-decoration:underline;cursor:pointer;align-self:flex-start;padding:0">Esqueci minha senha</button>`);
  let mode='in';$('au-form').querySelectorAll('button[type=submit]').forEach(b=>b.addEventListener('click',()=>mode=b.dataset.m));
  $('au-form').addEventListener('submit',async e=>{e.preventDefault();const email=$('au-email').value.trim(),password=$('au-pass').value;msg(mode==='in'?'Entrando…':'Criando conta…');
    try{try{sessionStorage.removeItem('cl-labmode')}catch(e){}if(mode==='in'){const{error}=await C.sb.auth.signInWithPassword({email,password});if(error)throw error;start()}
    else{const{data,error}=await C.sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});if(error)throw error;if(!data.session){msg('Conta criada. Enviamos um link de confirmação para '+email+'. Confirme e entre aqui.','ok');return}start()}}
    catch(err){msg(errTxt(err),'err')}});
  $('au-forgot').addEventListener('click',async()=>{const email=$('au-email').value.trim();if(!email){msg('Digite seu e-mail acima e clique de novo.','err');return}const{error}=await C.sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});msg(error?errTxt(error):'Enviamos um link para criar uma nova senha em '+email+'.',error?'err':'ok')})}
function newPassScreen(){screen(`<h2 style="margin:0">Criar nova senha</h2><div id="au-msg" class="msg" hidden></div><form id="au-np"><div class="field"><label for="au-np1">Nova senha</label><input type="password" id="au-np1" minlength="6" required autocomplete="new-password"></div><button class="btn primary" type="submit">Salvar senha</button></form>`);
  $('au-np').addEventListener('submit',async e=>{e.preventDefault();const{error}=await C.sb.auth.updateUser({password:$('au-np1').value});if(error){msg(errTxt(error),'err');return}history.replaceState(null,'',location.pathname);start()})}
async function myLabs(){const{data,error}=await C.sb.from('lab_members').select('role,labs(id,name,invite_code,status,plan,trial_end)').eq('user_id',C.user.id);if(error)throw error;return(data||[]).filter(x=>x.labs).map(x=>({...x.labs,role:x.role}))}
function setupScreen(){screen(`<p class="sub" style="margin:0">Conectado como <b>${h(C.user.email)}</b>.</p><div id="au-msg" class="msg" hidden></div>
  <form id="au-new"><h2 style="margin:0">Criar meu laboratório</h2><p class="mut" style="margin:0;font-size:12.5px">Começa com 14 dias de teste grátis.</p><div class="field"><label for="au-lab">Nome do laboratório</label><input type="text" id="au-lab" required></div><button class="btn primary" type="submit">Criar laboratório</button></form>
  <form id="au-join" style="border-top:1px solid #212B38;padding-top:14px"><h2 style="margin:0">Ou entrar na equipe de um laboratório</h2><p class="mut" style="margin:0;font-size:12.5px">Se o laboratório convidou seu e-mail, o acesso aparece sozinho ao entrar. Também dá para usar o código de convite.</p><div class="field"><label for="au-code">Código de convite</label><input type="text" id="au-code" required placeholder="Ex.: 7F3A9C21" style="text-transform:uppercase"></div><button class="btn" type="submit">Entrar com o código</button></form>
  <button class="lk" data-out="1" style="background:none;border:0;color:#8B96A8;text-decoration:underline;cursor:pointer;align-self:flex-start;padding:0">Sair</button>`);
  $('au-new').addEventListener('submit',async e=>{e.preventDefault();msg('Criando…');const{data,error}=await C.sb.rpc('create_lab',{p_name:$('au-lab').value});if(error){msg(errTxt(error),'err');return}localStorage.setItem(LAST,data);start()});
  $('au-join').addEventListener('submit',async e=>{e.preventDefault();msg('Verificando…');const{data,error}=await C.sb.rpc('join_lab',{p_code:$('au-code').value});if(error){msg(errTxt(error),'err');return}localStorage.setItem(LAST,data);start()})}
function pickScreen(labs){screen(`<h2 style="margin:0">Escolha o laboratório</h2><div class="opt">${C.admin?`<button class="btn primary" data-admin="1"><b>Gestão CERIONE</b>&nbsp;<span style="opacity:.8">· clientes, planos e acessos</span></button>`:''}${labs.map(l=>`<button class="btn" data-lab="${l.id}"><b>${h(l.name)}</b>&nbsp;<span class="mut">· ${h(ROLES[l.role]?.n||l.role)}${l.plan==='teste'?' · ambiente de teste':''}</span></button>`).join('')}</div>${labs.length?'':'<p class="mut" style="margin:0">Você ainda não faz parte de nenhum laboratório.</p>'}<button class="btn" data-newlab="1">+ Criar ou entrar em outro laboratório</button><button class="lk" data-out="1" style="background:none;border:0;color:#8B96A8;text-decoration:underline;cursor:pointer;align-self:flex-start;padding:0">Sair</button>`);
  $('auth').querySelectorAll('[data-lab]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(LAST,b.dataset.lab);try{sessionStorage.setItem(LABMODE,'1')}catch(e){}openLab(labs.find(l=>l.id===b.dataset.lab))}));
  $('auth').querySelector('[data-newlab]').addEventListener('click',setupScreen);const ad=$('auth').querySelector('[data-admin]');if(ad)ad.addEventListener('click',adminScreen)}
/* ---------- primeiro acesso ---------- */
function firstRunScreen(){return new Promise(res=>{let local=null;try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&Array.isArray(d.orders))local=d}catch(e){}
  screen(`<h2 style="margin:0">Primeiro acesso de ${h(C.lab.name)}</h2><p class="sub" style="margin:0">O laboratório ainda não tem dados no servidor. De onde começar?</p><div id="au-msg" class="msg" hidden></div>
  <div class="opt">${local?`<button class="btn primary" data-local="1"><span><b>Enviar os dados deste navegador</b><span style="display:block;font-weight:400;font-size:12.5px;opacity:.9">${h(countsTxt(countsOf(local)))}</span></span></button>`:''}
  <button class="btn" data-paste="1"><span><b>Colar um backup</b><span class="mut" style="display:block;font-weight:400;font-size:12.5px">Copiado em Configurações → Copiar backup, no sistema antigo</span></span></button>
  <button class="btn" data-zero="1"><span><b>Começar do zero</b><span class="mut" style="display:block;font-weight:400;font-size:12.5px">Com as fichas técnicas e a tabela de preços já carregadas</span></span></button></div>
  <div id="au-pastebox" hidden class="field"><label for="au-bk">Cole o backup</label><textarea id="au-bk" style="min-height:120px;font-family:var(--f-mono);font-size:12px"></textarea><button class="btn primary" id="au-bkgo" style="margin-top:8px">Usar este backup</button></div>`);
  const box=$('auth');if(local)box.querySelector('[data-local]').addEventListener('click',()=>res(JSON.parse(JSON.stringify(local))));
  box.querySelector('[data-zero]').addEventListener('click',()=>res(null));box.querySelector('[data-paste]').addEventListener('click',()=>{$('au-pastebox').hidden=false;$('au-bk').focus()});
  $('au-bkgo').addEventListener('click',()=>{let d;try{d=JSON.parse($('au-bk').value)}catch(e){}if(!d||!Array.isArray(d.orders)||!d.settings){msg('O texto colado não é um backup válido.','err');return}res(d)})})}
/* ---------- abrir o laboratório ---------- */
async function loadDocs(){const{data,error}=await C.sb.from('lab_docs').select('area,data,version').eq('lab_id',C.lab.id);if(error)throw error;const docs={};(data||[]).forEach(r=>{docs[r.area]=r.data;C.ver[r.area]=r.version});return docs}
async function loadMembers(){const{data}=await C.sb.from('lab_members').select('user_id,role,email,name,created_at').eq('lab_id',C.lab.id);C.members=data||[]}
function applyUsers(){const mt=S.memberTeam||{};S.users=C.members.map(m=>({id:m.user_id,name:m.name||m.email||'Usuário',email:m.email,role:m.role,team:mt[(m.email||'').toLowerCase()]||null,active:true,pin:''}));
  if(!S.users.some(u=>u.id===C.user.id))S.users.push({id:C.user.id,name:'Suporte CERIONE',email:C.user.email,role:'dono',active:true,pin:''});CUR=C.user.id}
async function openLab(lab){C.lab=lab;C.role=lab.role;screen('<p class="sub">Carregando dados do laboratório…</p>');
  try{const{data:st}=await C.sb.rpc('my_lab_status',{p_lab:lab.id});C.st=(Array.isArray(st)?st[0]:st)||{status:lab.status,can_write:true};if(C.role==='dono_suporte')C.st={...C.st,can_write:false,support:true};await loadMembers();
    let docs=await loadDocs();
    if(!Object.keys(docs).length){if(C.role!=='dono'){screen(`<div class="msg">O dono do laboratório ainda não fez o primeiro acesso. Tente de novo mais tarde.</div><button class="btn" data-out="1">Sair</button>`);return}
      const d=await firstRunScreen();S=d||emptyData();if(!S.invoices)S.invoices=[];if(!S.posted)S.posted={fix:[],com:[]};migrate();if(!S.fichasV)importCatalog();if(!d)S.settings.lab=lab.name;delete S.demoAutoV;S.demoAutoV=5;
      Object.keys(AREAS).forEach(a=>C.sent[a]=null);await push(true)}
    else{S=merge(docs);migrate();if(!S.fichasV&&C.role==='dono')importCatalog();Object.keys(AREAS).forEach(a=>C.sent[a]=J(split()[a]))}}
  catch(e){screen(`<div class="msg err">Não foi possível carregar: ${h(errTxt(e))}</div><button class="btn primary" onclick="location.reload()">Tentar de novo</button>`);return}
  applyUsers();if(C.role==='dono')await loadAudit();hideScreen();bar();
  {const hh=decodeURIComponent((location.hash||'').slice(1));if(VIEWS.includes(hh.split(':')[0]))goTarget(hh)}
  scanReminders();audSnap=audTake();C.auditSent=(S.audit||[]).length;render();if(S._imported){toast(S._imported);delete S._imported;save()}}
async function loadAudit(){const{data}=await C.sb.from('audit_log').select('at,email,kind,area,entry').eq('lab_id',C.lab.id).order('at',{ascending:false}).limit(1500);
  S.audit=(data||[]).reverse().map(r=>({...(r.entry||{}),id:'srv'+r.at,at:r.at,uname:(r.entry&&r.entry.uname)||r.email,kind:(r.entry&&r.entry.kind)||r.kind}))}
/* ---------- salvamento por área ---------- */
function setStatus(s){C.status=s;const el=$('cl-st');if(!el)return;const t={ok:'Salvo no servidor'+(C.lastOk?' · '+C.lastOk.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''),saving:'Salvando…',err:'Sem conexão · tentando de novo',conflict:'Atualizado por outra pessoa',ro:'Somente leitura',idle:'Conectado'}[s]||'';el.className='st '+({ok:'ok',saving:'saving',err:'err',conflict:'err',ro:'err'}[s]||'');el.textContent=t}
function schedule(ms=1200){clearTimeout(C.timer);C.timer=setTimeout(()=>push(),ms)}
async function push(force){if(!C.lab||!S)return;if(C.inflight){C.again=true;return}C.inflight=true;
  try{const parts=split();let any=false;
    for(const a of Object.keys(AREAS)){const j=J(parts[a]);if(!force&&j===C.sent[a])continue;if(!canW(a)){C.sent[a]=j;continue}any=true;setStatus('saving');
      const{data,error}=await C.sb.rpc('save_doc',{p_lab:C.lab.id,p_area:a,p_data:parts[a],p_expected:C.ver[a]??null});if(error)throw error;const r=Array.isArray(data)?data[0]:data;
      if(r&&r.ok){C.ver[a]=r.version;C.sent[a]=j}else{await conflict(a);break}}
    const pend=(S.audit||[]).slice(C.auditSent).filter(e=>!String(e.id||'').startsWith('srv'));if(pend.length){const{error}=await C.sb.rpc('append_audit',{p_lab:C.lab.id,p_entries:pend.slice(0,500)});if(!error)C.auditSent=S.audit.length}
    if(any||force){C.lastOk=new Date();setStatus(C.st&&!C.st.can_write?'ro':'ok')}}
  catch(e){console.error(e);setStatus('err');C.inflight=false;schedule(10000);return}
  C.inflight=false;if(C.again){C.again=false;schedule(300)}}
async function conflict(a){const{data}=await C.sb.from('lab_docs').select('data,version').eq('lab_id',C.lab.id).eq('area',a).single();if(!data)return;
  snapshot('Alteração não salva (conflito com outra pessoa)');const docs=split();docs[a]=data.data;S=merge(docs);migrate();applyUsers();C.ver[a]=data.version;C.sent[a]=J(split()[a]);setStatus('conflict');
  if(typeof closeModal==='function')closeModal();render();toast('Outra pessoa salvou ao mesmo tempo. A tela foi atualizada; confira e refaça a última alteração.')}
async function refreshIfNewer(){if(!S||!C.lab||C.inflight||!$('modal').hidden)return;const parts=split();if(Object.keys(AREAS).some(a=>J(parts[a])!==C.sent[a]&&canW(a)))return;
  const{data,error}=await C.sb.from('lab_docs').select('area,version').eq('lab_id',C.lab.id);if(error||!data)return;const newer=data.filter(r=>r.version>(C.ver[r.area]||0)).map(r=>r.area);if(!newer.length)return;
  const docs=split();for(const a of newer){const{data:d}=await C.sb.from('lab_docs').select('data,version').eq('lab_id',C.lab.id).eq('area',a).single();if(d){docs[a]=d.data;C.ver[a]=d.version}}
  S=merge(docs);migrate();applyUsers();Object.keys(AREAS).forEach(a=>C.sent[a]=J(split()[a]));audSnap=audTake();render();setStatus('ok')}
/* ---------- barra lateral, equipe e acessos ---------- */
function bar(){const side=document.querySelector('.side');let el=$('cloudbar');if(!el){el=document.createElement('div');el.id='cloudbar';el.className='cloudbar';side.insertBefore(el,side.querySelector('.nav'))}
  el.innerHTML=`${C.lab.plan==='teste'?'<span class="test-pill">Ambiente de teste</span>':''}<span class="st" id="cl-st"></span><span>${h(C.lab.name)} · ${h(C.user.email)}</span><span style="display:flex;gap:10px;flex-wrap:wrap">${C.role==='dono'?'<button class="lk" data-cl="hist">Histórico</button>':''}<button class="lk" data-cl="labs">${C.admin?'Gestão CERIONE':'Trocar'}</button><button class="lk" data-cl="out">Sair</button></span>`;
  setStatus(C.st&&!C.st.can_write?'ro':C.lastOk?'ok':'idle')}
const roleSel=(id,v)=>`<select id="${id}">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}" ${k===v?'selected':''}>${h(r.n)}</option>`).join('')}</select>`;
/* substitui a gestão local de usuários (PIN) pela equipe do servidor */
const _cfgAccess=window.cfgAccess;
function cloudAccess(){const inv=C.invites||[];return`<section class="panel"><div class="sec-h"><h2 style="margin:0">Equipe e acessos</h2><button class="btn sm primary" data-cl="inv-new">+ Convidar pessoa</button></div>
  <p class="sub" style="margin:4px 0 12px">Cada pessoa entra com o próprio e-mail e senha. O convite chega ao e-mail; quem criar a conta com esse e-mail entra direto no laboratório, com o perfil escolhido. Código de convite (entra como Técnico): <b class="mono">${h(C.lab.invite_code||'')}</b></p>
  ${tbl(['E-mail','Perfil','Profissional da equipe',''],C.members.map(m=>`<tr><td>${h(m.email||m.user_id)}${m.user_id===C.user.id?' <span class="chip">você</span>':''}</td><td>${m.user_id===C.user.id?h(ROLES[m.role]?.n):`<select data-cl-role="${m.user_id}">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}" ${k===m.role?'selected':''}>${h(r.n)}</option>`).join('')}</select>`}</td><td>${m.role==='tec'?`<select data-cl-team="${h((m.email||'').toLowerCase())}"><option value="">— nenhum —</option>${(S.team||[]).filter(t=>t.active!==false).map(t=>`<option value="${t.id}" ${(S.memberTeam||{})[(m.email||'').toLowerCase()]===t.id?'selected':''}>${h(t.name)}</option>`).join('')}</select>`:'<span class="mut">—</span>'}</td><td class="n">${m.user_id===C.user.id?'':`<button class="btn sm ghost" data-cl="rm" data-u="${m.user_id}" data-confirm="Confirmar remoção">Remover</button>`}</td></tr>`))}
  </section><section class="panel"><h2>Suporte CERIONE</h2><label class="checks"><input type="checkbox" data-cl-support="1" ${C.st&&C.st.support_access?'checked':''}> Permitir que o suporte CERIONE veja os dados deste laboratório para ajudar (pode desligar a qualquer momento; fica registrado na auditoria)</label></section>`}
async function invite(){openModal(mhead('Convidar pessoa')+`<form id="cl-inv" class="grid"><div class="form-grid">${fld('ci-email','E-mail da pessoa',inp('ci-email','','email','required'))}${fld('ci-role','Perfil',roleSel('ci-role','tec'))}${fld('ci-team','Profissional da equipe (técnicos)',`<select id="ci-team"><option value="">— nenhum —</option>${(S.team||[]).filter(t=>t.active!==false).map(t=>`<option value="${t.id}">${h(t.name)}</option>`).join('')}</select>`)}</div>
  <p class="mut" style="font-size:12.5px;margin:0">Envie à pessoa o endereço ${h(location.origin)}: ela cria a conta com este e-mail e já entra no laboratório.</p><div class="sheet-foot"><span class="err" id="ci-err"></span><div style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" type="submit">Convidar</button></div></div></form>`,true);
  $('cl-inv').addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('ci-email').value.trim().toLowerCase(),role=$('ci-role').value,team=$('ci-team').value;const{error}=await C.sb.rpc('invite_member',{p_lab:C.lab.id,p_email:email,p_role:role});
    if(error){$('ci-err').textContent=errTxt(error);return}if(team){S.memberTeam={...(S.memberTeam||{}),[email]:team};save()}closeModal();render();copyText(`Você foi convidado para o CERIONE (${C.lab.name}).\nAcesse ${location.origin}, clique em "Criar conta" e use o e-mail ${email}.`,'Convite criado · mensagem copiada para enviar')},true)}
/* ---------- histórico ---------- */
async function histModal(){const{data,error}=await C.sb.rpc('list_history',{p_lab:C.lab.id});const A={producao:'Produção',clientes:'Clientes',mensagens:'Mensagens',financeiro:'Financeiro',estoque:'Estoque',custos:'Custos',config:'Configurações'};
  openModal(mhead('Histórico no servidor')+`<p class="sub" style="margin:0">Cópia automática de cada área a cada hora de uso, por 90 dias. Voltar a uma cópia substitui aquela área para toda a equipe.</p>
  ${error?`<p class="err">${h(errTxt(error))}</p>`:(data||[]).length?`<div class="alerts">${data.map(x=>`<div class="alert-i" style="cursor:default"><span><b>${new Date(x.saved_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</b> <span class="mut">· ${h(A[x.area]||x.area)} · versão ${x.version}</span></span><button class="btn sm" data-cl="restore" data-h="${x.id}" data-confirm="Confirmar">Voltar a esta cópia</button></div>`).join('')}</div>`:'<p class="mut">Ainda não há cópias. A primeira é feita após uma hora de uso.</p>'}
  <div class="sheet-foot"><span></span><button class="btn" data-act="close">Fechar</button></div>`,true)}
/* ---------- GESTÃO CERIONE: painel em admin.js ---------- */
const LABMODE='cl-labmode';
function adminScreen(){try{sessionStorage.removeItem(LABMODE)}catch(e){}return window.CERIONE_ADMIN.open()}
C.ui={MARK,openLab:l=>{try{sessionStorage.setItem(LABMODE,'1')}catch(e){}return openLab(l)},labsFromAdmin:async()=>{const labs=await myLabs();pickScreen(labs)}};
/* ---------- eventos ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-cl],[data-out]');if(!b)return;
  if(b.dataset.confirm&&b.dataset.armed!=='1'){b.dataset.armed='1';const o=b.innerHTML;b.innerHTML=h(b.dataset.confirm);setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.innerHTML=o}},3500);e.stopPropagation();return}
  const a=b.dataset.cl||'out';e.stopPropagation();
  if(a==='out'){await push(true);await C.sb.auth.signOut();localStorage.removeItem(LAST);try{sessionStorage.removeItem('cl-labmode')}catch(e){}location.reload()}
  else if(a==='labs'){await push(true);localStorage.removeItem(LAST);try{sessionStorage.removeItem(LABMODE)}catch(e){}location.reload()}
  else if(a==='hist')histModal();else if(a==='inv-new')invite();
  else if(a==='restore'){const{error}=await C.sb.rpc('restore_history',{p_lab:C.lab.id,p_id:+b.dataset.h});if(error){toast(errTxt(error));return}const docs=await loadDocs();S=merge(docs);migrate();applyUsers();Object.keys(AREAS).forEach(x=>C.sent[x]=J(split()[x]));closeModal();render();toast('Área restaurada da cópia escolhida')}
  else if(a==='rm'){const{error}=await C.sb.rpc('remove_member',{p_lab:C.lab.id,p_user:b.dataset.u});toast(error?errTxt(error):'Pessoa removida do laboratório');await loadMembers();applyUsers();render()}
},true);
document.addEventListener('change',async e=>{const t=e.target;
  if(t.dataset.clRole){const{error}=await C.sb.rpc('set_member_role',{p_lab:C.lab.id,p_user:t.dataset.clRole,p_role:t.value});toast(error?errTxt(error):'Perfil alterado');await loadMembers();applyUsers();render();e.stopPropagation()}
  else if(t.dataset.clTeam!=null){S.memberTeam={...(S.memberTeam||{}),[t.dataset.clTeam]:t.value||null};applyUsers();save();toast('Profissional ligado ao login');e.stopPropagation()}
  else if(t.dataset.clSupport){const{error}=await C.sb.rpc('set_support_access',{p_lab:C.lab.id,p_on:t.checked});if(error){toast(errTxt(error));t.checked=!t.checked}else{C.st.support_access=t.checked;toast(t.checked?'Suporte CERIONE liberado':'Acesso do suporte desligado')}e.stopPropagation()}
},true);
/* ---------- início ---------- */
async function start(){if(/type=recovery/.test(location.hash))return;const{data:{session}}=await C.sb.auth.getSession();if(!session){loginScreen();return}C.user=session.user;
  try{await C.sb.rpc('claim_invites')}catch(e){}
  try{const{data:adm}=await C.sb.rpc('is_platform_admin');C.admin=!!adm}catch(e){C.admin=false}
  let labs;try{labs=await myLabs()}catch(e){screen(`<div class="msg err">${h(errTxt(e))}</div><button class="btn primary" onclick="location.reload()">Tentar de novo</button>`);return}
  if(C.admin){let lm=null;try{lm=sessionStorage.getItem(LABMODE)}catch(e){}if(lm!=='1'){adminScreen();return}}
  if(!labs.length&&!C.admin){setupScreen();return}
  const last=localStorage.getItem(LAST),pick=labs.find(l=>l.id===last)||(labs.length===1&&!C.admin?labs[0]:null);if(pick)openLab(pick);else pickScreen(labs)}
C.boot=function(){if(!window.supabase||!CFG.url){screen('<div class="msg err">Configuração do servidor ausente.</div>');return}
  C.sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.save=save=function(){try{auditDiff()}catch(e){}if(C.lab){if(C.st&&!C.st.can_write){setStatus('ro');return}setStatus('saving');schedule()}};
  window.cfgAccess=cfgAccess=function(){return cloudAccess()};
  window.teamLoginCell=teamLoginCell=function(t){if(!can('admin'))return'';const em=Object.entries(S.memberTeam||{}).find(([e,id])=>id===t.id);return em?`<span class="pill ok">login: ${h(em[0])}</span>`:`<button class="btn sm" data-cl="inv-new">Convidar por e-mail</button>`};
  const _render=render;window.render=render=function(){if(!C.lab)return;_render();if(C.st&&!C.st.can_write&&$('main')){$('main').insertAdjacentHTML('afterbegin',`<div class="ro-banner"><b>${C.st.status==='trial'?'Período de teste encerrado':'Acesso limitado'}:</b> o laboratório está em modo somente leitura. ${C.role==='dono'?'Fale com o CERIONE para ativar o plano.':'Fale com o dono do laboratório.'}</div>`)}};
  C.sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY')newPassScreen()});
  window.addEventListener('beforeunload',e=>{if(C.lab&&C.timer){push(true)}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')push(true);else refreshIfNewer()});
  window.addEventListener('online',()=>push(true));setInterval(refreshIfNewer,30000);start()};
})();
