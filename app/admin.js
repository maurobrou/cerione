/* CERIONE · Gestão da plataforma (dono do software): clientes, planos, cobranças, acessos e métricas de SaaS */
(function(){
const C=window.CERIONE_CLOUD;
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dmy=d=>d?new Date(String(d).length<=10?d+'T12:00:00':d).toLocaleDateString('pt-BR'):'—';
const dtm=d=>d?new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'nunca';
const ago=d=>{if(!d)return null;return Math.floor((Date.now()-new Date(d))/864e5)};
const today=()=>new Date().toISOString().slice(0,10);
const monthStr=d=>(d||today()).slice(0,7);
const monName=ym=>{const[y,m]=ym.split('-');return['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+m-1]+'/'+y.slice(2)};
const STS={trial:['Em teste','trial'],ativo:['Ativo','ativo'],atrasado:['Pagamento atrasado','atrasado'],bloqueado:['Bloqueado','bloqueado'],cancelado:['Cancelado','cancelado']};
const RL=()=>(typeof ROLES!=='undefined'&&ROLES)||{dono:{n:'Dono'},fin:{n:'Financeiro'},rec:{n:'Recepção'},tec:{n:'Técnico'}};
const METH=[['pix','Pix'],['boleto','Boleto'],['cartao','Cartão'],['transferencia','Transferência'],['dinheiro','Dinheiro']];
const A={tab:'geral',q:'',filter:'todos',pf:'todos',month:monthStr(),labs:[],plans:[],pays:[],m:null,open:null,acc:[]};
const ERR=e=>{const m=(e&&(e.message||e))+'';if(/forbidden/.test(m))return'Sem permissão.';if(/limit_users/.test(m))return'O plano deste laboratório já atingiu o limite de usuários.';if(/missing_fields/.test(m))return'Preencha os campos obrigatórios.';if(/duplicate|unique/i.test(m))return'Já existe uma cobrança deste laboratório para esse mês.';if(/Failed to fetch/.test(m))return'Sem conexão com a internet.';return m};
/* ---------- estilos ---------- */
const css=document.createElement('style');css.textContent=`
#auth.adm-on{display:block;padding:0;background:#0A0E14}
.adm{color:#E7ECF3;font-size:14px;min-height:100vh}
.adm-top{position:sticky;top:0;z-index:5;background:rgb(10 14 20/.92);backdrop-filter:blur(10px);border-bottom:1px solid #1A2230}
.adm-top .a-in{max-width:1280px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.adm-top .logo{font-size:17px}.adm-top .a-tag{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#3DD9CE;border:1px solid #1F4A49;border-radius:99px;padding:2px 9px}
.adm-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-left:8px}.adm-tabs button{white-space:nowrap;background:none;border:0;color:#8B96A8;padding:8px 12px;border-radius:9px;font:inherit;font-weight:600;cursor:pointer}
.adm-tabs button[aria-current=page]{background:#141B25;color:#E7ECF3;box-shadow:inset 0 0 0 1px #243042}.adm-tabs button:hover{color:#E7ECF3}
.adm-top .a-sp{flex:1}.adm-top .a-who{color:#8B96A8;font-size:12px}
.adm-main{max-width:1280px;margin:0 auto;padding:22px 16px 60px;display:flex;flex-direction:column;gap:18px}
.adm h2{margin:0;font-size:20px;color:#E7ECF3}.adm h3{margin:0 0 10px;font-size:14px;color:#E7ECF3}.adm .a-mut{color:#8B96A8}.adm .a-sub{color:#8B96A8;margin:2px 0 0}
.adm .a-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.adm .a-between{justify-content:space-between}
.adm .a-card{background:#10161E;border:1px solid #1E2733;border-radius:16px;padding:16px}
.adm .a-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.adm .a-kpi{background:#10161E;border:1px solid #1E2733;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:4px;min-width:0}
.adm .a-kpi span{color:#8B96A8;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.adm .a-kpi b{font-family:var(--f-display);font-size:24px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adm .a-kpi small{color:#8B96A8;font-size:12px}
.adm .a-kpi.a-hi{background:linear-gradient(135deg,#0F2A2A,#10161E 70%);border-color:#1F4A49}.adm .a-kpi.a-hi b{color:#3DD9CE}.adm .a-kpi.a-warn b{color:#EBBC6C}.adm .a-kpi.a-bad b{color:#F28B81}
.adm .a-grid2{display:grid;grid-template-columns:2fr 1fr;gap:14px}@media(max-width:900px){.adm .a-grid2{grid-template-columns:1fr}}
.adm table{width:100%;border-collapse:collapse}.adm th{color:#8B96A8;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:9px 8px;border-bottom:1px solid #1E2733;white-space:nowrap}
.adm td{padding:10px 8px;border-bottom:1px solid #161E29;vertical-align:middle;color:#E7ECF3}.adm td.a-n,.adm th.a-n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.adm tr.a-click{cursor:pointer}.adm tr.a-click:hover td{background:#131B26}.adm .a-tw{overflow-x:auto}
.adm .a-pill{display:inline-block;font-size:11px;font-weight:600;border-radius:99px;padding:3px 9px;background:#171F29;color:#AEB8C8;white-space:nowrap}
.adm .a-pill.trial{background:#0E2C2C;color:#3DD9CE}.adm .a-pill.ativo,.adm .a-pill.pago{background:#10301F;color:#5ED6A0}.adm .a-pill.atrasado,.adm .a-pill.aberto{background:#35281A;color:#EBBC6C}.adm .a-pill.bloqueado,.adm .a-pill.cancelado,.adm .a-pill.vencido{background:#3A1C1A;color:#F28B81}.adm .a-pill.interno{background:#26203A;color:#B9A6F5}
.adm .btn{background:#171F29;border:1px solid #2A3544;color:#E7ECF3;border-radius:10px;padding:8px 13px;font:inherit;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.adm .btn:hover{border-color:#3B4A5E}
.adm .btn.primary{background:#3DD9CE;border-color:#3DD9CE;color:#03211F}.adm .btn.sm{padding:5px 10px;font-size:12.5px}.adm .btn.danger{color:#F28B81}.adm .btn.ghost{background:none}
.adm input,.adm select,.adm textarea{background:#0A0E14;border:1px solid #2A3544;color:#E7ECF3;border-radius:10px;padding:9px 11px;font:inherit;width:100%;min-width:0}
.adm input:focus,.adm select:focus,.adm textarea:focus{outline:2px solid #3DD9CE55;border-color:#3DD9CE}
.adm label{display:flex;flex-direction:column;gap:5px;color:#AEB8C8;font-size:12.5px}
.adm .a-fg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.adm .a-chips{display:flex;gap:6px;flex-wrap:wrap}.adm .a-chips button{background:#10161E;border:1px solid #1E2733;color:#AEB8C8;border-radius:99px;padding:6px 12px;font:inherit;font-size:12.5px;cursor:pointer}.adm .a-chips button[aria-pressed=true]{background:#0F2A2A;border-color:#1F4A49;color:#3DD9CE}
.adm .a-alerts{display:flex;flex-direction:column;gap:6px}.adm .a-alert{display:flex;gap:10px;align-items:center;justify-content:space-between;background:#0D131B;border:1px solid #1A2230;border-radius:11px;padding:9px 12px;cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%}
.adm .a-alert:hover{border-color:#2A3544}.adm .a-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}.adm .a-dot.a-w{background:#EBBC6C}.adm .a-dot.a-b{background:#F28B81}.adm .a-dot.a-i{background:#3DD9CE}
.adm .a-msg{font-size:13px;border-radius:10px;padding:9px 12px;background:#171F29}.adm .a-msg.a-err{background:#3A1C1A;color:#F28B81}.adm .a-msg.a-ok{background:#10301F;color:#5ED6A0}
.adm-mod{position:fixed;inset:0;z-index:20;background:rgb(3 6 10/.66);display:flex;justify-content:flex-end}
.adm-mod .pane{width:min(760px,100%);height:100%;overflow-y:auto;background:#0D131B;border-left:1px solid #1E2733;padding:20px 18px 40px;display:flex;flex-direction:column;gap:14px}
.adm-mod.center{justify-content:center;align-items:flex-start;padding:6vh 16px}.adm-mod.center .pane{height:auto;max-height:88vh;border:1px solid #1E2733;border-radius:16px;width:min(560px,100%)}
.adm .a-bars{display:flex;align-items:flex-end;gap:6px;height:170px;padding-top:8px}.adm .a-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;height:100%;justify-content:flex-end}
.adm .a-bar .a-st{width:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px;flex:1}.adm .a-bar i{display:block;width:42%;border-radius:4px 4px 0 0;min-height:2px}.adm .a-bar i.a-f{background:#243042}.adm .a-bar i.a-r{background:#3DD9CE}.adm .a-bar small{color:#8B96A8;font-size:10.5px;white-space:nowrap}
.adm .a-legend{display:flex;gap:14px;font-size:12px;color:#8B96A8}.adm .a-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.adm .a-modbox{display:flex;flex-direction:column;gap:8px;margin-top:6px}.adm .a-mods{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.adm .a-modk{font-size:11px;text-transform:uppercase;letter-spacing:.08em;width:100%}
.adm .a-mod{flex-direction:row!important;align-items:center;gap:8px!important;background:#0A0E14;border:1px solid #243042;border-radius:10px;padding:7px 10px;color:#AEB8C8!important;font-size:12.5px!important;cursor:pointer}
.adm .a-mod input{width:auto}.adm .a-mod small{color:#8B96A8;font-size:11px;white-space:nowrap}.adm .a-mod.on{border-color:#1F4A49;background:#0F2A2A;color:#E7ECF3!important}.adm .a-mod.on small{color:#3DD9CE}
.adm .a-empty{color:#8B96A8;padding:18px;text-align:center}
@media(max-width:640px){.adm-tabs{margin-left:0;width:100%;overflow-x:auto;flex-wrap:nowrap}.adm .a-kpi b{font-size:20px}}`;
document.head.appendChild(css);
/* ---------- dados ---------- */
const rpc=async(fn,args)=>{const{data,error}=await C.sb.rpc(fn,args||{});if(error)throw error;return data};
async function load(){const from=new Date();from.setMonth(from.getMonth()-12);const f=from.toISOString().slice(0,8)+'01';
  const[m,labs,plans,pays,feats,lm,pm]=await Promise.all([rpc('admin_metrics'),rpc('admin_labs'),rpc('admin_plans'),rpc('admin_payments',{p_from:f,p_to:null}),rpc('admin_features'),rpc('admin_labs_mod'),rpc('admin_plans_mod')]);
  A.m=m||{};A.feats=feats||[];const LM=Object.fromEntries((lm||[]).map(x=>[x.id,x])),PM=Object.fromEntries((pm||[]).map(x=>[x.id,x.modules]));
  A.plans=(plans||[]).map(p=>({...p,modules:PM[p.id]||null}));A.labs=(labs||[]).map(l=>({...l,modules:(LM[l.id]||{}).modules||[],custom_price:null}));A.pays=pays||[]}
/* ---------- módulos e adicionais ---------- */
const KIND={base:'Sempre incluído',modulo:'Módulos',adicional:'Adicionais'};
const planOf=id=>A.plans.find(p=>p.id===id)||{price:0,modules:[]};
const allIds=()=>A.feats.map(f=>f.id);
const planMods=pl=>pl.modules||allIds();
const calcPrice=(planId,mods)=>{const pl=planOf(planId),inc=planMods(pl);return +pl.price+A.feats.filter(f=>mods.includes(f.id)&&!inc.includes(f.id)).reduce((a,f)=>a+ +f.price,0)};
const extrasOf=(planId,mods)=>{const inc=planMods(planOf(planId));return A.feats.filter(f=>mods.includes(f.id)&&!inc.includes(f.id))};
function modsBox(sel,planId,opts={}){const inc=planId?planMods(planOf(planId)):[];return['base','modulo','adicional'].map(k=>{const L=A.feats.filter(f=>f.kind===k&&(f.active||sel.includes(f.id)));if(!L.length)return'';
  return`<div class="a-mods"><span class="a-mut a-modk">${KIND[k]}</span>${L.map(f=>{const isInc=inc.includes(f.id),base=k==='base';return`<label class="a-mod ${sel.includes(f.id)||base?'on':''}"><input type="checkbox" data-mod="${h(f.id)}" ${sel.includes(f.id)||base?'checked':''} ${base?'disabled':''}><span>${h(f.name)}</span><small>${base?'incluído':opts.plan?brl(f.price)+' avulso':isInc?'no plano':'+ '+brl(f.price)}</small></label>`}).join('')}</div>`}).join('')}
const modsRead=box=>[...box.querySelectorAll('[data-mod]')].filter(x=>x.checked).map(x=>x.dataset.mod);
const root=()=>{let el=document.getElementById('auth');if(!el){el=document.createElement('div');el.id='auth';el.className='auth';document.body.appendChild(el)}el.hidden=false;el.classList.add('adm-on');return el};
const isInt=l=>l.plan==='teste';
const statusPill=l=>isInt(l)?'<span class="a-pill interno">Teste interno</span>':`<span class="a-pill ${STS[l.status]?.[1]||''}">${h(STS[l.status]?.[0]||l.status)}${l.status==='trial'&&l.trial_end&&l.trial_end<today()?' · vencido':''}</span>`;
const planName=id=>(A.plans.find(p=>p.id===id)||{}).name||id;
let flash=null;
/* ---------- telas ---------- */
function page(){const el=root();const T=[['geral','Visão geral'],['clientes','Clientes'],['cobrancas','Cobranças'],['planos','Planos']];
  el.innerHTML=`<div class="adm"><header class="adm-top"><div class="a-in"><span class="logo">${C.ui.MARK}CERIONE</span><span class="a-tag">Gestão</span>
  <nav class="adm-tabs" aria-label="Seções">${T.map(([k,n])=>`<button data-tab="${k}" ${A.tab===k?'aria-current="page"':''}>${n}</button>`).join('')}</nav><span class="a-sp"></span>
  <span class="a-who">${h(C.user.email)}</span><button class="btn sm" data-a="labs">Abrir laboratório</button><button class="btn sm ghost" data-out="1">Sair</button></div></header>
  <main class="adm-main">${flash?`<div class="a-msg a-${flash[1]}">${h(flash[0])}</div>`:''}${({geral,clientes,cobrancas,planos})[A.tab]()}</main>${A.open?ficha():''}${A.modal?A.modal():''}</div>`;flash=null;if(A.modal&&A.merr){const f=el.querySelector('.adm-mod.center form');if(f)f.insertAdjacentHTML('afterbegin',`<div class="a-msg a-err" role="alert">${h(A.merr)}</div>`)}bind()}
function geral(){const m=A.m||{},s=m.serie||[],mx=Math.max(1,...s.map(x=>Math.max(+x.recebido,+x.faturado)));
  const L=A.labs.filter(l=>!isInt(l)),t=today(),in7=new Date(Date.now()+7*864e5).toISOString().slice(0,10),cm=monthStr();
  const al=[];
  L.filter(l=>l.status==='trial'&&l.trial_end&&l.trial_end<t).forEach(l=>al.push(['b',`${l.name}: teste grátis venceu em ${dmy(l.trial_end)}`,'Ativar ou bloquear',l.id]));
  L.filter(l=>l.status==='trial'&&l.trial_end&&l.trial_end>=t&&l.trial_end<=in7).forEach(l=>al.push(['w',`${l.name}: teste termina em ${dmy(l.trial_end)}`,'Hora de oferecer o plano',l.id]));
  L.filter(l=>+l.open_overdue>0).forEach(l=>al.push(['b',`${l.name}: ${brl(l.open_overdue)} em atraso`,l.status==='atrasado'?'Cobrar':'Marcar como atrasado?',l.id]));
  L.filter(l=>['ativo','atrasado'].includes(l.status)&&+l.price>0&&!A.pays.some(p=>p.lab_id===l.id&&p.ref_month.slice(0,7)===cm&&p.status!=='cancelado')).forEach(l=>al.push(['i',`${l.name}: sem cobrança de ${monName(cm)}`,'Gerar cobrança',l.id]));
  L.filter(l=>['ativo','atrasado','trial'].includes(l.status)&&(ago(l.last_seen)??ago(l.created_at))>=14).forEach(l=>al.push(['w',`${l.name}: sem uso há ${ago(l.last_seen)??ago(l.created_at)} dias`,'Risco de cancelamento',l.id]));
  L.filter(l=>+l.pending_invites>0&&+l.members===0).forEach(l=>al.push(['i',`${l.name}: dono ainda não criou a conta (${l.owner_email})`,'Reenviar instruções',l.id]));
  return`<div class="a-row a-between"><div><h2>Visão geral</h2><p class="a-sub">Seus laboratórios clientes, receita recorrente e o que precisa de atenção. Os dados internos de cada laboratório não aparecem aqui (LGPD).</p></div><button class="btn primary" data-a="new">+ Novo laboratório</button></div>
  <div class="a-kpis">
   <div class="a-kpi a-hi"><span>Receita mensal (MRR)</span><b>${brl(m.mrr)}</b><small>${brl((+m.mrr||0)*12)} por ano</small></div>
   <div class="a-kpi"><span>Clientes pagantes</span><b>${m.clientes_pagantes||0}</b><small>${m.novos_mes||0} novo(s) no mês · ${m.ativados_mes||0} ativado(s)</small></div>
   <div class="a-kpi"><span>Ticket médio</span><b>${brl(m.arpa)}</b><small>por laboratório</small></div>
   <div class="a-kpi"><span>Em teste grátis</span><b>${m.em_teste||0}</b><small>${m.teste_vencendo_7d||0} vence(m) em 7 dias${m.teste_vencido?` · ${m.teste_vencido} vencido(s)`:''}</small></div>
   <div class="a-kpi"><span>Conversão de teste</span><b>${m.conversao_teste==null?'—':String(m.conversao_teste).replace('.',',')+'%'}</b><small>testes que viraram clientes</small></div>
   <div class="a-kpi ${+m.cancelados_mes?'a-bad':''}"><span>Cancelamento no mês</span><b>${String(m.churn_mes||0).replace('.',',')}%</b><small>${m.cancelados_mes||0} cancelado(s) · ${m.cancelados_total||0} no total</small></div>
   <div class="a-kpi ${+m.inadimplencia_valor?'a-bad':''}"><span>Inadimplência</span><b>${brl(m.inadimplencia_valor)}</b><small>${m.inadimplencia_clientes||0} cliente(s) com atraso</small></div>
   <div class="a-kpi"><span>Recebido no mês</span><b>${brl(m.recebido_mes)}</b><small>${brl(m.a_receber_mes)} ainda a receber</small></div>
  </div>
  <div class="a-grid2"><section class="a-card"><div class="a-row a-between"><h3 style="margin:0">Receita dos últimos 12 meses</h3><span class="a-legend"><span><i style="background:#3DD9CE"></i>Recebido</span><span><i style="background:#243042"></i>Faturado</span></span></div>
   <div class="a-bars">${s.map(x=>`<div class="a-bar" title="${monName(x.mes)}: recebido ${brl(x.recebido)} · faturado ${brl(x.faturado)}"><div class="a-st"><i class="a-f" style="height:${(+x.faturado/mx*100).toFixed(1)}%"></i><i class="a-r" style="height:${(+x.recebido/mx*100).toFixed(1)}%"></i></div><small>${monName(x.mes)}</small></div>`).join('')}</div></section>
   <section class="a-card"><h3>Clientes por plano</h3>${(m.adicionais||[]).length?`<p class="a-mut" style="font-size:12.5px;margin:-4px 0 8px">Adicionais avulsos: ${m.adicionais.map(x=>`${h(x.nome.split(' (')[0])} (${x.clientes} · ${brl(x.mrr)})`).join(', ')}</p>`:''}${(m.por_plano||[]).length?`<table><thead><tr><th>Plano</th><th class="a-n">Clientes</th><th class="a-n">MRR</th></tr></thead><tbody>${m.por_plano.map(p=>`<tr><td>${h(p.plano)}</td><td class="a-n">${p.clientes}</td><td class="a-n">${brl(p.mrr)}</td></tr>`).join('')}</tbody></table>`:'<p class="a-mut" style="margin:0">Nenhum cliente pagante ainda.</p>'}</section></div>
  <section class="a-card"><h3>Precisa de atenção${al.length?` · ${al.length}`:''}</h3>${al.length?`<div class="a-alerts">${al.map(([k,t,a,id])=>`<button class="a-alert" data-lab="${id}"><span class="a-row" style="gap:10px;flex-wrap:nowrap"><span class="a-dot a-${k}"></span><span>${h(t)}</span></span><span class="a-mut" style="font-size:12px;white-space:nowrap">${h(a)} ›</span></button>`).join('')}</div>`:'<p class="a-mut" style="margin:0">Tudo em dia. 🎉</p>'}</section>`}
function clientes(){const F=[['todos','Todos'],['ativo','Ativos'],['trial','Em teste'],['atrasado','Atrasados'],['bloqueado','Bloqueados'],['cancelado','Cancelados'],['interno','Teste interno']];
  const q=A.q.toLowerCase(),rows=A.labs.filter(l=>(A.filter==='todos'?!isInt(l)||true:A.filter==='interno'?isInt(l):!isInt(l)&&l.status===A.filter)&&(!q||[l.name,l.owner_email,l.contact_name,l.city,l.cnpj,l.phone].join(' ').toLowerCase().includes(q)));
  const cnt=k=>k==='todos'?A.labs.length:k==='interno'?A.labs.filter(isInt).length:A.labs.filter(l=>!isInt(l)&&l.status===k).length;
  return`<div class="a-row a-between"><div><h2>Clientes</h2><p class="a-sub">Cada laboratório que usa o CERIONE: contrato, situação e acessos.</p></div><button class="btn primary" data-a="new">+ Novo laboratório</button></div>
  <div class="a-row a-between"><div class="a-chips">${F.map(([k,n])=>`<button data-f="${k}" aria-pressed="${A.filter===k}">${n} · ${cnt(k)}</button>`).join('')}</div><input id="ad-q" placeholder="Buscar nome, e-mail, cidade, CNPJ…" value="${h(A.q)}" style="max-width:300px"></div>
  <section class="a-card" style="padding:6px 8px"><div class="a-tw"><table><thead><tr><th>Laboratório</th><th>Responsável</th><th>Plano</th><th class="a-n">Valor/mês</th><th>Situação</th><th class="a-n">Usuários</th><th>Último acesso</th><th class="a-n">Em atraso</th></tr></thead><tbody>
  ${rows.map(l=>`<tr class="a-click" data-lab="${l.id}"><td><b>${h(l.name)}</b><div class="a-mut" style="font-size:12px">${h(l.city||'')}${l.city?' · ':''}desde ${dmy(l.created_at)}</div></td><td>${h(l.contact_name||'')}<div class="a-mut" style="font-size:12px">${h(l.owner_email||'—')}</div></td><td>${h(l.plan_name)}${(()=>{const ex=extrasOf(l.plan,l.modules||[]);return ex.length?`<div class="a-mut" style="font-size:11.5px">+ ${ex.map(f=>h(f.name.split(' (')[0])).join(', ')}</div>`:''})()}</td><td class="a-n">${brl(l.price)}</td><td>${statusPill(l)}</td><td class="a-n">${l.members}${l.max_users?'/'+l.max_users:''}${+l.pending_invites?`<div class="a-mut" style="font-size:11px">+${l.pending_invites} convite</div>`:''}</td><td>${l.last_login?dtm(l.last_login):'<span class="a-mut">nunca</span>'}</td><td class="a-n">${+l.open_overdue?`<span style="color:#F28B81">${brl(l.open_overdue)}</span>`:'<span class="a-mut">—</span>'}</td></tr>`).join('')||'<tr><td colspan="8" class="a-empty">Nenhum laboratório neste filtro.</td></tr>'}
  </tbody></table></div></section>`}
function cobrancas(){const ym=A.month,P=A.pays.filter(p=>p.ref_month.slice(0,7)===ym),t=today();
  const st=p=>p.status==='pago'?'pago':p.status==='cancelado'?'cancelado':p.due_date<t?'vencido':'aberto';
  const vis=P.filter(p=>A.pf==='todos'||st(p)===A.pf),sum=f=>P.filter(f).reduce((a,p)=>a+ +p.amount,0);
  const F=[['todos','Todas'],['aberto','Em aberto'],['vencido','Atrasadas'],['pago','Pagas'],['cancelado','Canceladas']];
  return`<div class="a-row a-between"><div><h2>Cobranças</h2><p class="a-sub">Mensalidades dos laboratórios. Registre aqui o que entrou por Pix, boleto ou cartão.</p></div>
  <div class="a-row"><input type="month" id="ad-month" value="${ym}" style="width:auto"><button class="btn" data-a="gen">Gerar cobranças de ${monName(ym)}</button><button class="btn primary" data-a="newpay">+ Cobrança avulsa</button></div></div>
  <div class="a-kpis"><div class="a-kpi"><span>Faturado</span><b>${brl(sum(p=>p.status!=='cancelado'))}</b><small>${P.filter(p=>p.status!=='cancelado').length} cobrança(s)</small></div>
   <div class="a-kpi a-hi"><span>Recebido</span><b>${brl(sum(p=>p.status==='pago'))}</b></div><div class="a-kpi a-warn"><span>Em aberto</span><b>${brl(sum(p=>st(p)==='aberto'))}</b></div><div class="a-kpi a-bad"><span>Atrasado</span><b>${brl(sum(p=>st(p)==='vencido'))}</b></div></div>
  <div class="a-chips">${F.map(([k,n])=>`<button data-pf="${k}" aria-pressed="${A.pf===k}">${n}</button>`).join('')}</div>
  <section class="a-card" style="padding:6px 8px"><div class="a-tw"><table><thead><tr><th>Laboratório</th><th>Referência</th><th>Vencimento</th><th class="a-n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
  ${vis.map(p=>{const s=st(p);return`<tr><td><button class="btn ghost sm" data-lab="${p.lab_id}" style="padding:0;border:0">${h(p.lab_name)}</button></td><td>${monName(p.ref_month.slice(0,7))}</td><td>${dmy(p.due_date)}</td><td class="a-n">${brl(p.amount)}</td>
   <td><span class="a-pill ${s}">${s==='pago'?'Pago '+dmy(p.paid_at)+(p.method?' · '+h((METH.find(x=>x[0]===p.method)||[0,p.method])[1]):''):s==='vencido'?'Atrasado':s==='aberto'?'Em aberto':'Cancelado'}</span>${p.notes?`<div class="a-mut" style="font-size:11.5px">${h(p.notes)}</div>`:''}</td>
   <td class="a-n">${p.status==='aberto'?`<button class="btn sm primary" data-pay="${p.id}">Registrar pagamento</button> <button class="btn sm ghost danger" data-pst="${p.id}:cancelado" data-confirm="Confirmar">Cancelar</button>`:`<button class="btn sm ghost" data-pst="${p.id}:aberto">Reabrir</button>`}</td></tr>`}).join('')||`<tr><td colspan="6" class="a-empty">Nenhuma cobrança em ${monName(ym)}. Use “Gerar cobranças” para criar as mensalidades dos clientes ativos.</td></tr>`}
  </tbody></table></div></section>`}
function planos(){return`<div class="a-row a-between"><div><h2>Planos</h2><p class="a-sub">Preço e limite de usuários de cada plano. Um laboratório pode ter um valor especial na ficha dele; sem valor especial, vale o preço do plano.</p></div><button class="btn primary" data-a="newplan">+ Novo plano</button></div>
  <div class="a-kpis" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${A.plans.map(p=>{const n=A.labs.filter(l=>l.plan===p.id&&['ativo','atrasado'].includes(l.status)).length;return`<form class="a-card" data-plan="${h(p.id)}" style="display:flex;flex-direction:column;gap:10px">
   <div class="a-row a-between"><b style="font-size:15px">${h(p.name)}</b><span class="a-pill ${p.active?'ativo':'cancelado'}">${p.active?'Ativo':'Inativo'}</span></div>
   <label>Nome<input name="name" value="${h(p.name)}" required></label><div class="a-fg" style="grid-template-columns:1fr 1fr"><label>Preço por mês (R$)<input name="price" type="number" step="0.01" min="0" value="${p.price}"></label><label>Máx. de usuários<input name="max_users" type="number" min="1" value="${p.max_users??''}" placeholder="ilimitado"></label></div>
   <label>Descrição<input name="description" value="${h(p.description||'')}"></label><label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="active" ${p.active?'checked':''} style="width:auto"> Disponível para novos clientes</label>
   <div><span class="a-mut" style="font-size:12px">Módulos incluídos no plano</span><div class="a-modbox">${modsBox(planMods(p),null,{plan:true})}</div></div>
   <div class="a-row a-between"><span class="a-mut" style="font-size:12px">${n} cliente(s) pagante(s)</span><button class="btn sm primary" type="submit">Salvar</button></div></form>`}).join('')}</div>
  <section class="a-card"><h3>Módulos e adicionais avulsos</h3><p class="a-sub" style="margin:-4px 0 10px">Preço mensal cobrado quando o cliente contrata um módulo que não está no plano dele.</p><div class="a-tw"><table><thead><tr><th>Item</th><th>Tipo</th><th class="a-n">Preço por mês (R$)</th><th class="a-n">Clientes usando</th><th></th></tr></thead><tbody>
  ${A.feats.map(f=>`<tr><td><input data-fname="${h(f.id)}" value="${h(f.name)}" ${f.kind==='base'?'disabled':''}></td><td>${f.kind==='base'?'Sempre incluído':f.kind==='modulo'?'Módulo':'Adicional'}</td><td class="a-n">${f.kind==='base'?'—':`<input data-fprice="${h(f.id)}" type="number" step="0.01" min="0" value="${f.price}" style="max-width:120px;text-align:right">`}</td><td class="a-n">${A.labs.filter(l=>l.plan!=='teste'&&['ativo','atrasado','trial'].includes(l.status)&&(l.modules||[]).includes(f.id)).length}</td><td class="a-n">${f.kind==='base'?'':`<button class="btn sm" data-fsave="${h(f.id)}">Salvar</button>`}</td></tr>`).join('')}</tbody></table></div></section>`}
/* ---------- ficha do laboratório ---------- */
function ficha(){const l=A.labs.find(x=>x.id===A.open);if(!l)return'';const P=A.pays.filter(p=>p.lab_id===l.id),t=today();
  const act=(s,n,cls='')=>l.status===s?'':`<button class="btn sm ${cls}" data-st="${s}" ${s==='cancelado'?'data-confirm="Confirmar cancelamento"':''}>${n}</button>`;
  return`<div class="adm-mod" data-close="1"><div class="pane" role="dialog" aria-label="Ficha do laboratório">
  <div class="a-row a-between"><div><h2>${h(l.name)}</h2><p class="a-sub">${statusPill(l)} · cliente desde ${dmy(l.created_at)}${l.activated_at?' · ativado em '+dmy(l.activated_at):''}${l.canceled_at?' · cancelado em '+dmy(l.canceled_at):''}</p></div><button class="btn sm ghost" data-a="close" aria-label="Fechar">✕</button></div>
  <div class="a-row">${act('ativo',l.status==='bloqueado'||l.status==='atrasado'?'Desbloquear / ativar':'Ativar plano','primary')}${act('atrasado','Marcar atrasado')}${act('bloqueado','Bloquear (só leitura)')}${act('cancelado','Cancelar','danger')}${l.support_access?`<button class="btn sm" data-ad-open="${l.id}">Abrir (suporte)</button>`:''}</div>
  <form id="lf" class="a-card" style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0">Dados e contrato</h3>
   <div class="a-fg"><label>Laboratório<input name="name" value="${h(l.name)}" required></label><label>Responsável<input name="contact_name" value="${h(l.contact_name||'')}"></label>
   <label>E-mail do dono<input name="owner_email" type="email" value="${h(l.owner_email||'')}"></label><label>Telefone / WhatsApp<input name="phone" value="${h(l.phone||'')}"></label>
   <label>CNPJ / CPF<input name="cnpj" value="${h(l.cnpj||'')}"></label><label>Cidade<input name="city" value="${h(l.city||'')}"></label>
   <label>Plano<select name="plan">${A.plans.map(p=>`<option value="${h(p.id)}" ${p.id===l.plan?'selected':''}>${h(p.name)} · ${brl(p.price)}</option>`).join('')}</select></label>
   <label>Valor especial por mês (R$)<input name="price" type="number" step="0.01" min="0" value="${l.price!=null&&+l.price!==+(A.plans.find(p=>p.id===l.plan)||{}).price?l.price:''}" placeholder="preço do plano"></label>
   <label>Dia de vencimento<input name="due_day" type="number" min="1" max="28" value="${l.due_day||10}"></label><label>Teste grátis até<input name="trial_end" type="date" value="${l.trial_end||''}"></label></div>
   ${l.status==='cancelado'?`<label>Motivo do cancelamento<input name="cancel_reason" value="${h(l.cancel_reason||'')}"></label>`:''}
   <label>Observações internas<textarea name="notes" rows="2">${h(l.notes||'')}</textarea></label>
   <div class="a-row a-between"><span class="a-mut" style="font-size:12px">Valor cobrado: <b style="color:#E7ECF3">${brl(l.price)}</b>/mês${(()=>{const ex=extrasOf(l.plan,l.modules);return ex.length?` · plano ${brl(planOf(l.plan).price)} + ${ex.map(f=>h(f.name.split(' (')[0])).join(', ')}`:''})()}</span><button class="btn primary" type="submit">Salvar alterações</button></div></form>
  <form id="lm" class="a-card" style="display:flex;flex-direction:column;gap:10px"><div class="a-row a-between"><h3 style="margin:0">Módulos contratados</h3><span class="a-mut" style="font-size:12px">Plano ${h(l.plan_name)}</span></div>
   <div class="a-modbox" id="lm-box">${modsBox(l.modules,l.plan)}</div>
   <div class="a-row a-between"><span style="font-size:13px">Mensalidade com estes módulos: <b id="lm-price">${brl(calcPrice(l.plan,l.modules))}</b>${l.custom_price!=null?'':''}</span><div class="a-row"><button class="btn sm ghost" type="button" data-a="lm-plan">Usar os do plano</button><button class="btn primary" type="submit">Salvar módulos</button></div></div>
   <p class="a-mut" style="font-size:12px;margin:0">O laboratório só vê os módulos marcados. Chat e CFO também são bloqueados no servidor para quem não contratou. Se a ficha tiver valor especial, ele continua valendo.</p></form>
  <section class="a-card"><div class="a-row a-between"><h3 style="margin:0">Acessos · ${l.members}${l.max_users?' de '+l.max_users:''} usuário(s)</h3><button class="btn sm" data-a="invite">+ Convidar</button></div>
   <div class="a-tw"><table><thead><tr><th>E-mail</th><th>Perfil</th><th>Último login</th></tr></thead><tbody>${A.acc.length?A.acc.map(a=>`<tr><td>${h(a.email)}${a.kind==='convite'?' <span class="a-pill aberto">convite pendente</span>':''}</td><td>${h(RL()[a.role]?.n||a.role)}</td><td>${a.kind==='convite'?'<span class="a-mut">ainda não criou a conta</span>':dtm(a.last_sign_in)}</td></tr>`).join(''):`<tr><td colspan="3" class="a-empty">${A.accOk?'Nenhum usuário ainda.':'Carregando…'}</td></tr>`}</tbody></table></div>
   <p class="a-mut" style="font-size:12px;margin:8px 0 0">Para entrar, a pessoa abre ${h((window.CERIONE_APPURL||location.origin))}, recebe a senha provisória por e-mail (ou clica em “Fui convidado por um laboratório”) e entra com o e-mail convidado. ${l.support_access?'O laboratório liberou o acesso do suporte.':'O suporte CERIONE só vê os dados internos se o laboratório liberar, em Configurações.'}</p></section>
  <section class="a-card"><div class="a-row a-between"><h3 style="margin:0">Cobranças</h3><button class="btn sm" data-a="newpay" data-l="${l.id}">+ Nova cobrança</button></div>
   <div class="a-tw"><table><thead><tr><th>Referência</th><th>Vencimento</th><th class="a-n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${P.map(p=>{const s=p.status==='pago'?'pago':p.status==='cancelado'?'cancelado':p.due_date<t?'vencido':'aberto';return`<tr><td>${monName(p.ref_month.slice(0,7))}</td><td>${dmy(p.due_date)}</td><td class="a-n">${brl(p.amount)}</td><td><span class="a-pill ${s}">${s==='pago'?'Pago '+dmy(p.paid_at):s==='vencido'?'Atrasado':s==='aberto'?'Em aberto':'Cancelado'}</span></td><td class="a-n">${p.status==='aberto'?`<button class="btn sm primary" data-pay="${p.id}">Registrar pagamento</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="5" class="a-empty">Nenhuma cobrança.</td></tr>'}</tbody></table></div></section>
  <p class="a-mut" style="font-size:12px;margin:0">Bloqueado: o laboratório entra mas só consulta, sem gravar. Cancelado: perde o acesso. Teste vencido: fica em só leitura até ativar o plano.</p>
  </div></div>`}
/* ---------- janelas ---------- */
function modalNew(){return`<div class="adm-mod center" data-close="1"><div class="pane"><div class="a-row a-between"><h2>Novo laboratório</h2><button class="btn sm ghost" data-a="mclose">✕</button></div>
  <form id="an-form" style="display:flex;flex-direction:column;gap:12px"><div class="a-fg"><label>Nome do laboratório *<input id="an-name" name="name" required></label><label>Responsável<input name="contact_name"></label>
  <label>E-mail do dono *<input id="an-email" name="owner_email" type="email" required></label><label>Telefone / WhatsApp<input name="phone"></label><label>Cidade<input name="city"></label><label>CNPJ / CPF<input name="cnpj"></label>
  <label>Plano<select id="an-plan" name="plan">${A.plans.filter(p=>p.active&&p.id!=='teste').map(p=>`<option value="${h(p.id)}">${h(p.name)} · ${brl(p.price)}</option>`).join('')}</select></label>
  <label>Começa como<select id="an-status" name="status"><option value="trial">Teste grátis</option><option value="ativo">Cliente ativo (pagante)</option></select></label>
  <label>Dias de teste<input id="an-days" name="trial_days" type="number" min="1" value="14"></label><label>Dia de vencimento<input name="due_day" type="number" min="1" max="28" value="10"></label></div>
  <div><span class="a-mut" style="font-size:12.5px">Módulos que o laboratório vai acessar (já vêm marcados os do plano)</span><div class="a-modbox" id="an-mods">${(()=>{const p0=A.plans.filter(p=>p.active&&p.id!=='teste')[0];return p0?modsBox(planMods(p0),p0.id):''})()}</div>
  <p style="margin:8px 0 0;font-size:13px">Mensalidade: <b id="an-price">${(()=>{const p0=A.plans.filter(p=>p.active&&p.id!=='teste')[0];return p0?brl(calcPrice(p0.id,planMods(p0))):'—'})()}</b></p></div>
  <div class="a-msg" id="an-msg" hidden></div><div class="a-row" style="justify-content:flex-end"><button class="btn" type="button" data-a="mclose">Cancelar</button><button class="btn primary" type="submit">Criar e convidar o dono</button></div></form></div></div>`}
function modalPay(id){const p=A.pays.find(x=>x.id==id);return()=>`<div class="adm-mod center" data-close="1"><div class="pane"><div class="a-row a-between"><h2>Registrar pagamento</h2><button class="btn sm ghost" data-a="mclose">✕</button></div>
  <p class="a-sub" style="margin:0">${h(p.lab_name)} · ${monName(p.ref_month.slice(0,7))} · ${brl(p.amount)}</p><form id="pp-form" data-id="${p.id}" style="display:flex;flex-direction:column;gap:12px"><div class="a-fg">
  <label>Data do pagamento<input name="paid_at" type="date" value="${today()}" required></label><label>Forma<select name="method">${METH.map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select></label><label>Valor recebido (R$)<input name="amount" type="number" step="0.01" value="${p.amount}"></label></div>
  <label>Observação<input name="notes" value="${h(p.notes||'')}"></label><div class="a-row" style="justify-content:flex-end"><button class="btn" type="button" data-a="mclose">Cancelar</button><button class="btn primary" type="submit">Confirmar pagamento</button></div></form></div></div>`}
function modalNewPay(lab){return()=>`<div class="adm-mod center" data-close="1"><div class="pane"><div class="a-row a-between"><h2>Nova cobrança</h2><button class="btn sm ghost" data-a="mclose">✕</button></div>
  <form id="np-form" style="display:flex;flex-direction:column;gap:12px"><div class="a-fg"><label>Laboratório<select name="lab_id" required>${A.labs.filter(l=>!isInt(l)).map(l=>`<option value="${l.id}" ${l.id===lab?'selected':''}>${h(l.name)} · ${brl(l.price)}</option>`).join('')}</select></label>
  <label>Mês de referência<input name="ref_month" type="month" value="${A.month}" required></label><label>Valor (R$)<input name="amount" type="number" step="0.01" placeholder="valor do contrato"></label><label>Vencimento<input name="due_date" type="date" placeholder="dia do contrato"></label></div>
  <label>Descrição<input name="notes" placeholder="Ex.: mensalidade, implantação, treinamento"></label><div class="a-row" style="justify-content:flex-end"><button class="btn" type="button" data-a="mclose">Cancelar</button><button class="btn primary" type="submit">Criar cobrança</button></div></form></div></div>`}
function modalInvite(){return`<div class="adm-mod center" data-close="1"><div class="pane"><div class="a-row a-between"><h2>Convidar para ${h((A.labs.find(l=>l.id===A.open)||{}).name)}</h2><button class="btn sm ghost" data-a="mclose">✕</button></div>
  <form id="iv-form" style="display:flex;flex-direction:column;gap:12px"><div class="a-fg"><label>E-mail<input name="email" type="email" required></label><label>Perfil<select name="role">${Object.entries(RL()).map(([k,r])=>`<option value="${k}">${h(r.n)}</option>`).join('')}</select></label></div>
  <div class="a-msg" id="iv-msg" hidden></div><div class="a-row" style="justify-content:flex-end"><button class="btn" type="button" data-a="mclose">Cancelar</button><button class="btn primary" type="submit">Convidar</button></div></form></div></div>`}
function modalPlan(){return`<div class="adm-mod center" data-close="1"><div class="pane"><div class="a-row a-between"><h2>Novo plano</h2><button class="btn sm ghost" data-a="mclose">✕</button></div>
  <form id="pl-form" style="display:flex;flex-direction:column;gap:12px"><div class="a-fg"><label>Código (sem espaços)<input name="id" pattern="[a-z0-9_-]+" required placeholder="ex.: anual"></label><label>Nome<input name="name" required></label><label>Preço por mês (R$)<input name="price" type="number" step="0.01" min="0" required></label><label>Máx. de usuários<input name="max_users" type="number" min="1" placeholder="ilimitado"></label></div>
  <label>Descrição<input name="description"></label><div class="a-row" style="justify-content:flex-end"><button class="btn" type="button" data-a="mclose">Cancelar</button><button class="btn primary" type="submit">Criar plano</button></div></form></div></div>`}
/* ---------- ações ---------- */
const formObj=f=>{const o={};new FormData(f).forEach((v,k)=>o[k]=v);f.querySelectorAll('input[type=checkbox]').forEach(c=>o[c.name]=c.checked);return o};
async function refresh(msgTxt,kind='ok'){try{await load()}catch(e){flash=[ERR(e),'err']}if(msgTxt)flash=[msgTxt,kind];page();if(A.open)loadAcc()}
async function loadAcc(){A.accOk=false;try{A.acc=await rpc('admin_lab_access',{p_lab:A.open})||[]}catch(e){A.acc=[]}A.accOk=true;if(A.open&&!A.modal){const y=(document.querySelector('.adm-mod .pane')||{}).scrollTop;page();const p=document.querySelector('.adm-mod .pane');if(p&&y)p.scrollTop=y}}
async function mailInv(lab,email){try{await window.CERIONE_CONTA('invite_mail',{lab,email});return`Acesso com senha provisória enviado para ${email}.`}catch(e){return`Não deu para enviar o e-mail (${e.message}). Peça à pessoa para abrir ${(window.CERIONE_APPURL||location.origin)} e clicar em “Fui convidado por um laboratório”.`}}
async function doit(fn,okMsg){try{await fn();A.modal=null;A.merr=null;await refresh(typeof okMsg==='function'?okMsg():okMsg)}catch(e){if(A.modal){A.merr=ERR(e);page()}else{flash=[ERR(e),'err'];page()}}}
function bind(){const el=root();
  el.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{A.tab=b.dataset.tab;A.open=null;page();window.scrollTo(0,0)});
  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{A.filter=b.dataset.f;page()});
  el.querySelectorAll('[data-pf]').forEach(b=>b.onclick=()=>{A.pf=b.dataset.pf;page()});
  const q=el.querySelector('#ad-q');if(q)q.oninput=()=>{A.q=q.value;clearTimeout(A.qt);A.qt=setTimeout(()=>{page();const i=root().querySelector('#ad-q');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};
  const mo=el.querySelector('#ad-month');if(mo)mo.onchange=()=>{A.month=mo.value||monthStr();page()};
  el.querySelectorAll('[data-lab]').forEach(b=>b.onclick=e=>{e.stopPropagation();A.open=b.dataset.lab;A.acc=[];A.accOk=false;page();loadAcc()});
  el.querySelectorAll('[data-close]').forEach(m=>m.onclick=e=>{if(e.target!==m)return;if(A.modal){A.modal=null;A.merr=null}else A.open=null;page()});
  el.querySelectorAll('[data-a]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const a=b.dataset.a;
    if(a==='close'){A.open=null;page()}else if(a==='mclose'){A.modal=null;A.merr=null;page()}
    else if(a==='new'){A.modal=modalNew;page();setTimeout(()=>{const i=document.getElementById('an-name');if(i)i.focus()},30)}
    else if(a==='newpay'){A.modal=modalNewPay(b.dataset.l||A.open);page()}else if(a==='newplan'){A.modal=modalPlan;page()}else if(a==='invite'){A.modal=modalInvite;page()}
    else if(a==='labs'){C.ui.labsFromAdmin()}
    else if(a==='gen'){b.disabled=true;await doit(async()=>{const n=await rpc('admin_gen_month',{p_month:A.month+'-01'});flash=null;A._n=n},null);flash=[A._n?`${A._n} cobrança(s) criada(s) para ${monName(A.month)}.`:`Nenhuma cobrança nova: todos os clientes ativos já têm cobrança em ${monName(A.month)}.`,'ok'];page()}});
  el.querySelectorAll('[data-confirm]').forEach(b=>{b.addEventListener('click',e=>{if(b.dataset.armed!=='1'){e.stopImmediatePropagation();b.dataset.armed='1';const o=b.textContent;b.textContent=b.dataset.confirm;setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent=o}},3500)}},true)});
  el.querySelectorAll('[data-st]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.confirm&&b.dataset.armed!=='1')return;const s=b.dataset.st;doit(()=>rpc('admin_save_lab',{p_lab:A.open,p:{status:s}}),`Situação alterada para “${STS[s][0]}”.`)}));
  el.querySelectorAll('[data-pay]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();A.modal=modalPay(b.dataset.pay);page()}));
  el.querySelectorAll('[data-pst]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();if(b.dataset.confirm&&b.dataset.armed!=='1')return;const[id,s]=b.dataset.pst.split(':');doit(()=>rpc('admin_save_payment',{p:{id,status:s}}),s==='cancelado'?'Cobrança cancelada.':'Cobrança reaberta.')}));
  el.querySelectorAll('[data-ad-open]').forEach(b=>b.addEventListener('click',()=>{const l=A.labs.find(x=>x.id===b.dataset.adOpen);el.classList.remove('adm-on');C.ui.openLab({...l,role:'dono_suporte'})}));
  const lf=el.querySelector('#lf');if(lf)lf.onsubmit=e=>{e.preventDefault();const o=formObj(lf);doit(()=>rpc('admin_save_lab',{p_lab:A.open,p:o}),'Ficha salva.')};
  const lm=el.querySelector('#lm');if(lm){const box=lm.querySelector('#lm-box'),l0=A.labs.find(x=>x.id===A.open);box.onchange=()=>{box.querySelectorAll('.a-mod').forEach(x=>x.classList.toggle('on',x.querySelector('input').checked));lm.querySelector('#lm-price').textContent=brl(calcPrice(l0.plan,modsRead(box)))};
    lm.onsubmit=e=>{e.preventDefault();doit(()=>rpc('admin_set_modules',{p_kind:'lab',p_id:A.open,p_modules:modsRead(box)}),'Módulos do laboratório salvos.')};
    lm.querySelector('[data-a=lm-plan]').onclick=e=>{e.stopPropagation();box.innerHTML=modsBox(planMods(planOf(l0.plan)),l0.plan);box.onchange()}}
  const anp=el.querySelector('#an-plan');if(anp){const box=el.querySelector('#an-mods'),upd=()=>{el.querySelector('#an-price').textContent=brl(calcPrice(anp.value,modsRead(box)));box.querySelectorAll('.a-mod').forEach(x=>x.classList.toggle('on',x.querySelector('input').checked))};
    anp.onchange=()=>{box.innerHTML=modsBox(planMods(planOf(anp.value)),anp.value);upd()};box.onchange=upd}
  el.querySelectorAll('[data-fsave]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=b.dataset.fsave;const nm=el.querySelector(`[data-fname="${id}"]`).value,pr=el.querySelector(`[data-fprice="${id}"]`).value;doit(()=>rpc('admin_save_feature',{p:{id,name:nm,price:pr}}),'Preço do módulo salvo.')}));
  const an=el.querySelector('#an-form');if(an)an.onsubmit=e=>{e.preventDefault();const o=formObj(an);o.modules=modsRead(el.querySelector('#an-mods'));let sent='';doit(async()=>{const id=await rpc('admin_create_lab2',{p:o});A.open=id;A.tab='clientes';sent=await mailInv(id,o.owner_email)},()=>`Laboratório criado. ${sent}`)};
  const pp=el.querySelector('#pp-form');if(pp)pp.onsubmit=e=>{e.preventDefault();const o=formObj(pp);doit(()=>rpc('admin_save_payment',{p:{id:pp.dataset.id,status:'pago',...o}}),'Pagamento registrado.')};
  const np=el.querySelector('#np-form');if(np)np.onsubmit=e=>{e.preventDefault();const o=formObj(np);o.ref_month=o.ref_month+'-01';doit(()=>rpc('admin_save_payment',{p:o}),'Cobrança criada.')};
  const iv=el.querySelector('#iv-form');if(iv)iv.onsubmit=e=>{e.preventDefault();const o=formObj(iv);let sent='';doit(async()=>{await rpc('invite_member',{p_lab:A.open,p_email:o.email,p_role:o.role});sent=await mailInv(A.open,o.email)},()=>`Convite criado. ${sent}`)};
  const pl=el.querySelector('#pl-form');if(pl)pl.onsubmit=e=>{e.preventDefault();const o=formObj(pl);doit(()=>rpc('admin_save_plan',{p:{...o,active:true}}),'Plano criado.')};
  el.querySelectorAll('form[data-plan]').forEach(f=>{f.onchange=()=>f.querySelectorAll('.a-mod').forEach(x=>x.classList.toggle('on',x.querySelector('input').checked));f.onsubmit=e=>{e.preventDefault();const o=formObj(f);const p=A.plans.find(x=>x.id===f.dataset.plan);const mods=modsRead(f);doit(async()=>{await rpc('admin_save_plan',{p:{...o,id:p.id,sort:p.sort}});await rpc('admin_set_modules',{p_kind:'plan',p_id:p.id,p_modules:mods})},`Plano ${o.name} salvo.`)}});
  document.onkeydown=e=>{if(e.key==='Escape'&&root().classList.contains('adm-on')){if(A.modal){A.modal=null;A.merr=null}else if(A.open)A.open=null;else return;page()}}}
window.CERIONE_ADMIN={async open(){const el=root();el.innerHTML='<div class="adm"><main class="adm-main"><p class="a-mut">Carregando a gestão…</p></main></div>';
  try{await load()}catch(e){el.innerHTML=`<div class="adm"><main class="adm-main"><div class="a-msg a-err">${h(ERR(e))}</div><button class="btn primary" onclick="location.reload()">Tentar de novo</button></main></div>`;return}page()},state:A};
})();
