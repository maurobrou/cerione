/* CERIONE · camada de nuvem (Supabase): login, laboratórios, dados por área com permissão, convites e gestão da plataforma */
(function(){
const CFG=window.CERIONE_CFG||{};
const APPURL=location.origin+location.pathname.replace(/[^/]*$/,'');window.CERIONE_APPURL=APPURL;
const C={sb:null,user:null,lab:null,role:null,admin:false,st:null,ver:{},sent:{},inflight:false,timer:null,dirty:false,auditSent:0,status:'idle',lastOk:null,members:[]};
window.CERIONE_CLOUD=C;
const $=id=>document.getElementById(id);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LAST='cerione-last-lab';
/* ---------- áreas: quais dados ficam em cada documento e quem grava ---------- */
const AREAS={producao:['orders','seq','services','team','stgV','lateAck'],clientes:['clients'],mensagens:['msgs'],
  financeiro:['cfoHist','receivables','invoices','invSeq','payables','posted','accounts','cashMoves','bankLines','bankImports','nfse','chart'],
  estoque:['materials','moves','suppliers','nfeIn','nfeMap'],custos:['fixed','equipment','precImport','fichasV','precV','teamCost'],config:['settings','memberTeam','demoAutoV','_rcDismiss']};
const LOCAL=new Set(['users','audit','_imported','chat']);
const WRITE={dono:Object.keys(AREAS),fin:['producao','clientes','mensagens','financeiro','estoque'],rec:['producao','clientes','mensagens','estoque'],tec:['producao','mensagens']};
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
/* ---------- conta: entrar, cadastro (empresa + responsável), senha provisória e recuperação ---------- */
const dig=s=>String(s||'').replace(/\D/g,'');
const cpfOk=v=>{const c=dig(v);if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(const n of[9,10]){let s=0;for(let i=0;i<n;i++)s+=+c[i]*(n+1-i);if((s*10)%11%10!==+c[n])return false}return true};
const cnpjOk=v=>{const c=dig(v);if(c.length!==14||/^(\d)\1+$/.test(c))return false;const k=n=>{const w=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];const s=w.reduce((a,x,i)=>a+ +c[i]*x,0)%11;return s<2?0:11-s};return k(12)===+c[12]&&k(13)===+c[13]};
const MASK={cnpj:v=>dig(v).slice(0,14).replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2'),
  cpf:v=>dig(v).slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'),
  tel:v=>{const d=dig(v).slice(0,11);return d.length<=10?d.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2'):d.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')},
  cep:v=>dig(v).slice(0,8).replace(/(\d{5})(\d)/,'$1-$2')};
const UFS='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
async function conta(action,body){const{data,error}=await C.sb.functions.invoke('conta',{body:{action,...(body||{})}});
  if(error){let j={};try{j=await error.context.json()}catch(e){}const er=new Error(j.error||error.message||'erro');er.fields=j.fields;er.status=j.status;throw er}return data||{}}
const contaErr=e=>({cnpj_invalid:'CNPJ inválido. Confira os números.',cnpj_used:'Este CNPJ já tem um laboratório no CERIONE. Peça acesso ao dono ou use “Esqueci minha senha”.',cnpj_not_found:'CNPJ não encontrado na Receita Federal.',
  cnpj_inactive:'Este CNPJ está '+String(e.status||'inativo').toLowerCase()+' na Receita Federal.',email_exists:'Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.',rate_limited:'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  mail_not_configured:'O envio de e-mails do CERIONE ainda não foi ativado. Fale com o suporte.',mail_failed:'Não conseguimos enviar o e-mail agora. Tente de novo em instantes.',email_invalid:'E-mail inválido.',
  invalid_fields:'Confira os campos destacados.',server_error:'Erro no servidor. Tente de novo em instantes.'}[e.message]||errTxt(e));
const lk=(id,t)=>`<button type="button" class="lk" id="${id}" style="background:none;border:0;color:#8B96A8;text-decoration:underline;cursor:pointer;padding:0;font-size:13px">${t}</button>`;
const F=(id,lab,attrs='',hint='')=>`<div class="field" data-f="${id}"><label for="${id}">${lab}</label><input id="${id}" ${attrs}>${hint?`<small class="mut" style="font-size:11.5px">${hint}</small>`:''}</div>`;
if(!document.getElementById('au-css2')){const s2=document.createElement('style');s2.id='au-css2';s2.textContent=`.auth .box.mid{max-width:600px}.auth .g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.auth .g3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}
.auth .field{display:flex;flex-direction:column;gap:5px}.auth .field.bad input,.auth .field.bad select{border-color:#F28B81}.auth .field.bad label{color:#F28B81}
.auth .steps{display:flex;gap:6px;font-size:12px;color:#8B96A8}.auth .steps span{flex:1;border-top:3px solid #212B38;padding-top:6px}.auth .steps span.on{border-color:#3DD9CE;color:#E7ECF3}
.auth fieldset{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}.auth legend{font:700 15px var(--f-display);color:#E7ECF3;margin-bottom:4px;padding:0}
.auth .ck{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#AEB8C8}.auth .ck input{width:auto;margin-top:3px}
.auth .rf{font-size:12px;color:#5ED6A0}.auth .pw{position:relative}.auth .pw button{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;color:#8B96A8;cursor:pointer;font-size:12px}
@media (max-width:520px){.auth .g2,.auth .g3{grid-template-columns:1fr}}`;document.head.appendChild(s2)}
function pwToggle(){$('auth').querySelectorAll('.pw button').forEach(b=>b.addEventListener('click',()=>{const i=b.previousElementSibling;i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'Mostrar':'Ocultar'}))}
function loginScreen(info='',kind='ok'){
  screen(`<p class="sub" style="margin:0">Gestão para laboratórios de prótese dentária.</p><div id="au-msg" class="msg ${info?kind:''}" ${info?'':'hidden'}>${h(info)}</div>
  <form id="au-form"><div class="field"><label for="au-email">E-mail</label><input type="email" id="au-email" autocomplete="email" required></div>
  <div class="field"><label for="au-pass">Senha</label><div class="pw"><input type="password" id="au-pass" autocomplete="current-password" required><button type="button">Mostrar</button></div><small class="mut" style="font-size:11.5px">No primeiro acesso, use a senha provisória que chegou no seu e-mail.</small></div>
  <button class="btn primary" type="submit" data-m="in">Entrar</button></form>
  <div class="row" style="justify-content:space-between;align-items:center">${lk('au-forgot','Esqueci minha senha')}${lk('au-invited','Fui convidado por um laboratório')}</div>
  <div style="border-top:1px solid #212B38;padding-top:14px;display:flex;flex-direction:column;gap:8px"><span class="mut" style="font-size:13px">Ainda não usa o CERIONE?</span><button class="btn" type="button" id="au-go-up">Criar conta · 14 dias grátis</button></div>`);
  pwToggle();
  $('au-form').addEventListener('submit',async e=>{e.preventDefault();const email=$('au-email').value.trim(),password=$('au-pass').value;msg('Entrando…');
    try{try{sessionStorage.removeItem('cl-labmode')}catch(e){}const{error}=await C.sb.auth.signInWithPassword({email,password});if(error)throw error;start()}catch(err){msg(errTxt(err),'err')}});
  $('au-forgot').addEventListener('click',()=>forgotScreen($('au-email').value.trim()));
  $('au-invited').addEventListener('click',()=>forgotScreen($('au-email').value.trim(),true));
  $('au-go-up').addEventListener('click',()=>signupScreen());
  if(/criar-conta/.test(location.hash))signupScreen()}
function forgotScreen(email='',inv=false){
  screen(`<h2 style="margin:0">${inv?'Primeiro acesso de convidado':'Esqueci minha senha'}</h2><p class="sub" style="margin:0">${inv?'Digite o e-mail que o laboratório cadastrou. Enviamos uma senha provisória para você entrar.':'Digite o e-mail da sua conta. Enviamos um link para criar uma nova senha.'}</p><div id="au-msg" class="msg" hidden></div>
  <form id="au-fg"><div class="field"><label for="au-fe">E-mail</label><input type="email" id="au-fe" autocomplete="email" required value="${h(email)}"></div><button class="btn primary" type="submit">${inv?'Receber senha provisória':'Enviar link'}</button></form>${lk('au-back','← Voltar para entrar')}`);
  $('au-back').addEventListener('click',()=>loginScreen());setTimeout(()=>$('au-fe').focus(),30);
  $('au-fg').addEventListener('submit',async e=>{e.preventDefault();const em=$('au-fe').value.trim(),b=$('au-fg').querySelector('button');b.disabled=true;msg('Enviando…');
    try{await conta('forgot',{email:em});msg(inv?`Se ${em} tiver um convite, a senha provisória chega em instantes. Confira também a caixa de spam.`:`Se ${em} tiver conta no CERIONE, o link chega em instantes. Confira também a caixa de spam. O link vale por 1 hora.`,'ok')}
    catch(err){msg(contaErr(err),'err')}finally{b.disabled=false}})}
function signupScreen(){let step=1,rf=null;const V={};
  screen(`<h2 style="margin:0">Criar conta · 14 dias grátis</h2><p class="sub" style="margin:0">Com todos os recursos e sem cartão. A senha provisória chega no e-mail do responsável.</p>
  <div class="steps"><span class="on">1. Empresa</span><span>2. Responsável</span></div><div id="au-msg" class="msg" hidden></div>
  <form id="au-up" novalidate><fieldset id="st1"><legend>Dados da empresa</legend>
   ${F('su-cnpj','CNPJ','inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00" required','Buscamos os dados na Receita Federal automaticamente.')}<div id="su-rf" class="rf" hidden></div>
   ${F('su-legal','Razão social','required autocomplete="organization"')}
   ${F('su-trade','Nome do laboratório (nome fantasia)','required','É o nome que aparece no sistema e nos documentos.')}
   <div class="g2">${F('su-cep','CEP','inputmode="numeric" autocomplete="postal-code"')}${F('su-num','Número','autocomplete="address-line2"')}</div>
   ${F('su-street','Endereço','autocomplete="address-line1"')}
   <div class="g3">${F('su-dist','Bairro')}${F('su-city','Cidade','required autocomplete="address-level2"')}<div class="field" data-f="su-uf"><label for="su-uf">UF</label><select id="su-uf" required><option value=""></option>${UFS.map(u=>`<option>${u}</option>`).join('')}</select></div></div>
   <button class="btn primary" type="button" id="su-next">Continuar</button></fieldset>
  <fieldset id="st2" hidden><legend>Responsável pela conta (pessoa física)</legend>
   ${F('su-name','Nome completo','required autocomplete="name"')}
   <div class="g2">${F('su-cpf','CPF','inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" required')}${F('su-tel','Celular / WhatsApp','type="tel" inputmode="tel" autocomplete="tel" placeholder="(43) 99999-9999" required')}</div>
   ${F('su-email','E-mail','type="email" autocomplete="email" required','A senha provisória e os avisos da conta vão para este e-mail.')}
   ${F('su-email2','Confirme o e-mail','type="email" autocomplete="off" required')}
   <label class="ck"><input type="checkbox" id="su-terms"> <span>Li e aceito os termos de uso e autorizo o tratamento destes dados para criar e administrar a conta, conforme a LGPD.</span></label>
   <div class="row"><button class="btn" type="button" id="su-prev">Voltar</button><button class="btn primary" type="submit">Criar conta</button></div></fieldset></form>
  ${lk('au-back','Já tenho conta · Entrar')}`);
  const box=$('auth').querySelector('.box');box.classList.add('mid');
  [['su-cnpj','cnpj'],['su-cpf','cpf'],['su-tel','tel'],['su-cep','cep']].forEach(([i,m])=>$(i).addEventListener('input',e=>{e.target.value=MASK[m](e.target.value)}));
  $('au-back').addEventListener('click',()=>{if(/criar-conta/.test(location.hash))history.replaceState(null,'',location.pathname);loginScreen()});
  const bad=(ids)=>{box.querySelectorAll('.field.bad').forEach(x=>x.classList.remove('bad'));ids.forEach(i=>{const f=box.querySelector(`[data-f="${i}"]`);if(f)f.classList.add('bad')});if(ids.length){const f=$(ids[0]);if(f)f.focus()}};
  const setV=(i,v)=>{if(v&&!$(i).value.trim())$(i).value=v};
  let lastQ='';async function lookup(){const c=dig($('su-cnpj').value);if(c.length!==14||c===lastQ)return;lastQ=c;const out=$('su-rf');
    if(!cnpjOk(c)){bad(['su-cnpj']);msg('CNPJ inválido. Confira os números.','err');return}bad([]);msg('');out.hidden=false;out.style.color='#8B96A8';out.textContent='Consultando a Receita Federal…';
    try{const d=await conta('cnpj',{cnpj:c});if(!d.found){out.textContent='Consulta indisponível agora. Preencha os dados manualmente.';return}rf=d;
      setV('su-legal',d.legal_name);setV('su-trade',d.trade_name?d.trade_name.replace(/\w\S*/g,w=>w[0]+w.slice(1).toLowerCase()):'');setV('su-cep',MASK.cep(d.cep));setV('su-street',[d.street,d.comp].filter(Boolean).join(', '));setV('su-num',d.number);setV('su-dist',d.district);setV('su-city',d.city?d.city.replace(/\w\S*/g,w=>w[0]+w.slice(1).toLowerCase()):'');if(d.uf&&!$('su-uf').value)$('su-uf').value=d.uf;
      out.style.color='';out.textContent='Situação na Receita: '+(d.status||'—')+(d.cnae?' · '+d.cnae:'');if(/BAIXADA|NULA|INAPTA|SUSPENSA/i.test(d.status||'')){out.style.color='#EBBC6C'}}
    catch(err){out.hidden=true;lastQ='';if(err.message==='cnpj_used'||err.message==='cnpj_not_found'||err.message==='cnpj_invalid')bad(['su-cnpj']);msg(contaErr(err),'err')}}
  $('su-cnpj').addEventListener('input',()=>{if(dig($('su-cnpj').value).length===14)lookup()});$('su-cnpj').addEventListener('blur',lookup);
  const go=n=>{step=n;$('st1').hidden=n!==1;$('st2').hidden=n!==2;box.querySelectorAll('.steps span').forEach((s,i)=>s.classList.toggle('on',i<n));msg('');setTimeout(()=>$(n===1?'su-cnpj':'su-name').focus(),30)};
  $('su-next').addEventListener('click',()=>{const b=[];if(!cnpjOk($('su-cnpj').value))b.push('su-cnpj');['su-legal','su-trade','su-city'].forEach(i=>{if(!$(i).value.trim())b.push(i)});if(!$('su-uf').value)b.push('su-uf');
    bad(b);if(b.length){msg(b[0]==='su-cnpj'?'CNPJ inválido. Confira os números.':'Preencha os campos destacados.','err');return}go(2)});
  $('su-prev').addEventListener('click',()=>go(1));
  $('au-up').addEventListener('submit',async e=>{e.preventDefault();if(step===1){$('su-next').click();return}
    const em=$('su-email').value.trim().toLowerCase(),b=[];if($('su-name').value.trim().split(/\s+/).length<2)b.push('su-name');if(!cpfOk($('su-cpf').value))b.push('su-cpf');if(dig($('su-tel').value).length<10)b.push('su-tel');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))b.push('su-email');else if($('su-email2').value.trim().toLowerCase()!==em)b.push('su-email2');bad(b);
    if(b.length){msg({'su-name':'Digite o nome completo do responsável.','su-cpf':'CPF inválido. Confira os números.','su-tel':'Celular incompleto.','su-email':'E-mail inválido.','su-email2':'Os dois e-mails não são iguais.'}[b[0]],'err');return}
    if(!$('su-terms').checked){msg('Para criar a conta, aceite os termos de uso.','err');return}
    const btn=$('au-up').querySelector('button[type=submit]');btn.disabled=true;msg('Criando sua conta…');
    try{await conta('signup',{terms:true,company:{cnpj:dig($('su-cnpj').value),legal_name:$('su-legal').value,trade_name:$('su-trade').value,cep:$('su-cep').value,street:$('su-street').value,number:$('su-num').value,district:$('su-dist').value,city:$('su-city').value,uf:$('su-uf').value},
      owner:{name:$('su-name').value,cpf:dig($('su-cpf').value),phone:dig($('su-tel').value),email:em}});
      if(/criar-conta/.test(location.hash))history.replaceState(null,'',location.pathname);
      screen(`<h2 style="margin:0">Conta criada</h2><div class="msg ok">Enviamos a senha provisória para <b>${h(em)}</b>.</div>
       <ol style="margin:0;padding-left:20px;color:#AEB8C8;font-size:14px;display:flex;flex-direction:column;gap:6px"><li>Abra o e-mail “Sua senha provisória do CERIONE”. Se não aparecer em alguns minutos, olhe o spam.</li><li>Entre aqui com o seu e-mail e a senha provisória.</li><li>Crie a sua senha definitiva. Pronto: 14 dias de teste com tudo liberado.</li></ol>
       <button class="btn primary" id="au-done">Ir para entrar</button>${lk('au-resend','Não chegou? Reenviar')}`);
      $('au-done').addEventListener('click',()=>{loginScreen();$('au-email').value=em;$('au-pass').focus()});$('au-resend').addEventListener('click',()=>forgotScreen(em,true))}
    catch(err){btn.disabled=false;const map={cnpj:'su-cnpj',legal_name:'su-legal',trade_name:'su-trade',city:'su-city',uf:'su-uf',owner_name:'su-name',cpf:'su-cpf',phone:'su-tel',email:'su-email'};
      if(err.fields){const ids=err.fields.map(f=>map[f]).filter(Boolean);if(ids.some(i=>['su-cnpj','su-legal','su-trade','su-city','su-uf'].includes(i)))go(1);bad(ids)}
      if(/cnpj/.test(err.message)){go(1);bad(['su-cnpj'])}if(err.message==='email_exists')bad(['su-email']);msg(contaErr(err),'err')}});
  setTimeout(()=>$('su-cnpj').focus(),50)}
function newPassScreen(forced){const em=(C.user&&C.user.email)||'';
  screen(`<h2 style="margin:0">${forced?'Crie sua senha definitiva':'Criar nova senha'}</h2><p class="sub" style="margin:0">${forced?'Você entrou com a senha provisória. Escolha agora a senha que vai usar daqui para frente.':'Escolha uma nova senha para '+h(em)+'.'}</p><div id="au-msg" class="msg" hidden></div>
  <form id="au-np" novalidate><div class="field"><label for="au-np1">Nova senha</label><div class="pw"><input type="password" id="au-np1" minlength="8" required autocomplete="new-password"><button type="button">Mostrar</button></div><small class="mut" style="font-size:11.5px">Mínimo de 8 caracteres, com letras e números.</small></div>
  <div class="field"><label for="au-np2">Repita a nova senha</label><input type="password" id="au-np2" minlength="8" required autocomplete="new-password"></div><button class="btn primary" type="submit">Salvar senha e entrar</button></form>${lk('au-np-out','Sair')}`);
  pwToggle();$('au-np-out').addEventListener('click',async()=>{await C.sb.auth.signOut();loginScreen()});setTimeout(()=>$('au-np1').focus(),30);
  $('au-np').addEventListener('submit',async e=>{e.preventDefault();const p=$('au-np1').value;
    if(p.length<8||!/[A-Za-z]/.test(p)||!/\d/.test(p)){msg('Use pelo menos 8 caracteres, com letras e números.','err');return}if(p!==$('au-np2').value){msg('As duas senhas não são iguais.','err');return}
    msg('Salvando…');const{error}=await C.sb.auth.updateUser({password:p,data:{must_change_password:false}});
    if(error){msg(/different from the old|same_password/i.test(error.message||error.code||'')?'A nova senha precisa ser diferente da provisória.':errTxt(error),'err');return}
    if(C.user)C.user.user_metadata={...(C.user.user_metadata||{}),must_change_password:false};history.replaceState(null,'',location.pathname);start()})}
async function recoverFromLink(){const m=(location.hash||'').match(/rec=([^&]+)/);if(!m)return false;history.replaceState(null,'',location.pathname);screen('<p class="sub">Validando o link…</p>');
  const{data,error}=await C.sb.auth.verifyOtp({token_hash:decodeURIComponent(m[1]),type:'recovery'});
  if(error||!data||!data.session){loginScreen('Este link de redefinição expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.','err');return true}
  C.user=data.session.user;newPassScreen(false);return true}
async function myLabs(){const{data,error}=await C.sb.from('lab_members').select('role,labs(id,name,invite_code,status,plan,trial_end,cnpj,city,uf,phone,legal_name,address)').eq('user_id',C.user.id);if(error)throw error;return(data||[]).filter(x=>x.labs).map(x=>({...x.labs,role:x.role}))}
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
  try{const{data:st}=await C.sb.rpc('my_lab_status',{p_lab:lab.id});C.st=(Array.isArray(st)?st[0]:st)||{status:lab.status,can_write:true};if(C.role==='dono_suporte')C.st={...C.st,can_write:false,support:true};await loadMembers();await loadBill();try{const{data:fe}=await C.sb.rpc('my_lab_features',{p_lab:lab.id});if(fe){window.CERIONE_FEATURES=Array.isArray(fe.modules)?fe.modules:null;window.CERIONE_PLAN=fe}}catch(e){}try{if(window.waReset)waReset()}catch(e){}
    let docs=await loadDocs();
    if(!Object.keys(docs).length){if(C.role!=='dono'){screen(`<div class="msg">O dono do laboratório ainda não fez o primeiro acesso. Tente de novo mais tarde.</div><button class="btn" data-out="1">Sair</button>`);return}
      const d=await firstRunScreen();S=d||emptyData();if(!S.invoices)S.invoices=[];if(!S.posted)S.posted={fix:[],com:[]};migrate();if(!S.fichasV)importCatalog();if(!d)S.settings.lab=lab.name;{const st=S.settings,fmtD=c=>(c=String(c||'').replace(/\D/g,''),c.length===14?c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):c),A=lab.address||{};if(!st.doc&&lab.cnpj)st.doc=fmtD(lab.cnpj);if(!st.city&&lab.city)st.city=lab.city;if(!st.uf&&lab.uf)st.uf=lab.uf;if(!st.phone&&lab.phone)st.phone=MASK.tel(lab.phone);if(!st.legalName&&lab.legal_name)st.legalName=lab.legal_name;if(!st.address&&A.street)st.address=[A.street,A.number].filter(Boolean).join(', ')+(A.district?' - '+A.district:'')+(A.cep?' · CEP '+MASK.cep(A.cep):'')}delete S.demoAutoV;S.demoAutoV=5;
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
  <p class="mut" style="font-size:12.5px;margin:0">Envie à pessoa o endereço ${h(APPURL)}: ela cria a conta com este e-mail e já entra no laboratório.</p><div class="sheet-foot"><span class="err" id="ci-err"></span><div style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" type="submit">Convidar</button></div></div></form>`,true);
  $('cl-inv').addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('ci-email').value.trim().toLowerCase(),role=$('ci-role').value,team=$('ci-team').value;const{error}=await C.sb.rpc('invite_member',{p_lab:C.lab.id,p_email:email,p_role:role});
    if(error){$('ci-err').textContent=errTxt(error);return}if(team){S.memberTeam={...(S.memberTeam||{}),[email]:team};save()}closeModal();render();toast('Convite criado · enviando o acesso por e-mail…');conta('invite_mail',{lab:C.lab.id,email}).then(()=>toast('Acesso enviado por e-mail para '+email)).catch(err=>copyText(`Você foi convidado para o CERIONE (${C.lab.name}).\nAcesse ${APPURL}, clique em "Fui convidado por um laboratório" e use o e-mail ${email}.`,'Não deu para enviar o e-mail ('+contaErr(err)+'). Mensagem copiada para você mandar.'))},true)}
/* ---------- histórico ---------- */
async function histModal(){const{data,error}=await C.sb.rpc('list_history',{p_lab:C.lab.id});const A={producao:'Produção',clientes:'Clientes',mensagens:'Mensagens',financeiro:'Financeiro',estoque:'Estoque',custos:'Custos',config:'Configurações'};
  openModal(mhead('Histórico no servidor')+`<p class="sub" style="margin:0">Cópia automática de cada área a cada hora de uso, por 90 dias. Voltar a uma cópia substitui aquela área para toda a equipe.</p>
  ${error?`<p class="err">${h(errTxt(error))}</p>`:(data||[]).length?`<div class="alerts">${data.map(x=>`<div class="alert-i" style="cursor:default"><span><b>${new Date(x.saved_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</b> <span class="mut">· ${h(A[x.area]||x.area)} · versão ${x.version}</span></span><button class="btn sm" data-cl="restore" data-h="${x.id}" data-confirm="Confirmar">Voltar a esta cópia</button></div>`).join('')}</div>`:'<p class="mut">Ainda não há cópias. A primeira é feita após uma hora de uso.</p>'}
  <div class="sheet-foot"><span></span><button class="btn" data-act="close">Fechar</button></div>`,true)}
/* ---------- GESTÃO CERIONE: painel em admin.js ---------- */
const LABMODE='cl-labmode';
function adminScreen(){try{sessionStorage.removeItem(LABMODE)}catch(e){}return window.CERIONE_ADMIN.open()}
/* ---------- plano, assinatura e faturas (cobrança automática pelo Asaas) ---------- */
const BRL=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dBR=d=>d?String(d).slice(8,10)+'/'+String(d).slice(5,7)+'/'+String(d).slice(0,4):'—';
const canBill=()=>['dono','fin'].includes(C.role);
async function cob(action,body){const{data,error}=await C.sb.functions.invoke('cobranca',{body:{action,lab:C.lab&&C.lab.id,...(body||{})}});
  if(error){let j={};try{j=await error.context.json()}catch(e){}const er=new Error(j.error||error.message||'erro');Object.assign(er,{detail:j.detail,max:j.max,members:j.members});throw er}return data||{}}
window.CERIONE_COB=cob;
const cobErr=e=>({asaas_not_configured:'A cobrança automática ainda não foi ativada pelo CERIONE. Fale com o suporte.',asaas_error:'O Asaas recusou a operação: '+(e.detail||'erro'),
  too_many_users:`Este plano permite até ${e.max} usuários e o laboratório tem ${e.members}. Escolha um plano maior ou remova acessos.`,missing_cnpj:'Cadastre o CNPJ do laboratório antes de assinar (fale com o suporte).',
  invalid_plan:'Plano inválido.',forbidden:'Só o dono do laboratório pode assinar.',lab_unavailable:'Este laboratório está cancelado.',no_subscription:'Este laboratório ainda não tem assinatura.'}[e.message]||errTxt(e));
async function loadBill(){C.bill=null;if(!C.lab||!canBill())return;try{const{data}=await C.sb.rpc('my_billing',{p_lab:C.lab.id});C.bill=data||null}catch(e){}}
async function reloadLabState(){try{const{data:st}=await C.sb.rpc('my_lab_status',{p_lab:C.lab.id});const s=(Array.isArray(st)?st[0]:st);if(s)C.st={...C.st,...s}}catch(e){}
  try{const{data:fe}=await C.sb.rpc('my_lab_features',{p_lab:C.lab.id});if(fe){window.CERIONE_FEATURES=Array.isArray(fe.modules)?fe.modules:null;window.CERIONE_PLAN=fe}}catch(e){}await loadBill()}
const trialLeft=B=>B&&B.status==='trial'&&B.trial_end?Math.round((Date.parse(B.trial_end)-Date.parse(new Date(Date.now()-3*36e5).toISOString().slice(0,10)))/864e5):null;
const openInv=B=>((B&&B.payments)||[]).filter(p=>p.status==='aberto'&&p.invoice_url).sort((a,b)=>a.due_date.localeCompare(b.due_date))[0]||null;
function billBanner(){const B=C.bill,ro=C.st&&!C.st.can_write,dono=C.role==='dono',inv=openInv(B);
  const btn=inv&&inv.invoice_url?` <a class="btn sm primary" href="${h(inv.invoice_url)}" target="_blank" rel="noopener" data-inv-open="1">Pagar a fatura de ${BRL(inv.amount)}</a>`:'';
  const sub=dono&&B&&!B.subscribed?` <button class="btn sm primary" data-cl="sub">Assinar agora</button>`:'';
  if(ro){if(C.st.support)return'<div class="ro-banner"><b>Modo suporte:</b> você está vendo os dados deste laboratório somente para consulta.</div>';const tl=trialLeft(B);
    const why=C.st.status==='trial'||(tl!==null&&tl<0)?'<b>Período de teste encerrado:</b> seus dados estão guardados e você pode consultar tudo, mas para lançar e editar é preciso assinar.':C.st.status==='bloqueado'||inv&&inv.overdue?'<b>Acesso limitado por falta de pagamento:</b> o laboratório está em modo somente leitura até a fatura ser paga. Pix e cartão liberam na hora.':'<b>Acesso limitado:</b> o laboratório está em modo somente leitura.';
    const act=dono||C.role==='fin'?(btn||sub||(dono?' Fale com o CERIONE para ativar o plano.':' Fale com o dono do laboratório.')):' Fale com o dono do laboratório.';return`<div class="ro-banner">${why}${act}</div>`}
  if(!B)return'';const tl=trialLeft(B);
  if(inv&&inv.overdue)return`<div class="ro-banner"><b>Fatura vencida em ${dBR(inv.due_date)}.</b> Para não ficar em modo somente leitura, pague em até ${B.grace_days} dias do vencimento.${btn}</div>`;
  if(tl!==null&&tl<=5&&dono&&!B.subscribed)return`<div class="ro-banner"><b>Seu teste grátis termina ${tl<=0?'hoje':tl===1?'amanhã':'em '+tl+' dias'}.</b> Assine agora para continuar sem interrupção: a primeira fatura só vence no fim do teste.${sub}</div>`;
  return''}
function billPanel(){const B=C.bill;if(!B)return'';const tl=trialLeft(B),dono=C.role==='dono';
  const stTxt={trial:tl!==null&&tl>=0?`Teste grátis · ${tl} dia(s)`:'Teste encerrado',ativo:'Ativo',atrasado:'Pagamento atrasado',bloqueado:'Bloqueado (só leitura)',cancelado:'Cancelado'}[B.status]||B.status;
  const rows=(B.payments||[]).map(p=>{const s=p.status==='pago'?['done','Pago '+dBR(p.paid_at)]:p.overdue?['late','Vencida']:['soon','Em aberto'];
    return`<tr><td>${dBR(p.due_date)}</td><td class="n">${BRL(p.amount)}</td><td><span class="pill ${s[0]}">${s[1]}</span></td><td class="n">${p.invoice_url?`<a class="btn sm ${p.status==='pago'?'ghost':'primary'}" href="${h(p.invoice_url)}" target="_blank" rel="noopener">${p.status==='pago'?'Ver recibo':'Pagar'}</a>`:''}</td></tr>`});
  return`<section class="panel" id="cl-bill"><div class="sec-h"><h2 style="margin:0">Plano e assinatura</h2><div style="display:flex;gap:8px">${B.subscribed?'<button class="btn sm ghost" data-cl="bill-ref">Atualizar</button>':''}${dono&&B.status!=='cancelado'?`<button class="btn sm primary" data-cl="sub">${B.subscribed?'Mudar plano':'Assinar agora'}</button>`:''}</div></div>
  <div class="costbox" style="margin:8px 0 12px"><div><span class="k">Plano</span><span class="v">${h(B.plan_name||'—')}</span></div><div><span class="k">Situação</span><span class="v">${h(stTxt)}</span></div>
   <div><span class="k">Valor</span><span class="v">${B.subscribed||B.status!=='trial'?BRL(B.charge)+(B.cycle==='YEARLY'?' por ano':' por mês'):'—'}</span></div><div><span class="k">Usuários</span><span class="v">${B.members}${B.max_users?' de '+B.max_users:''}</span></div></div>
  ${B.subscribed?tbl(['Vencimento','#Valor','Situação',''],rows,'Nenhuma fatura ainda.'):`<p class="sub" style="margin:0">${B.status==='trial'?'Durante o teste tudo fica liberado. Ao assinar, a primeira fatura só vence no fim do teste.':'Este laboratório ainda não tem assinatura automática.'}</p>`}
  <p class="mut" style="font-size:12px;margin:10px 0 0">Pagamento por Pix, boleto ou cartão, pelo Asaas. Pix e cartão confirmam na hora; boleto em até 3 dias úteis. Fatura vencida há mais de ${B.grace_days} dias deixa o sistema só para consulta até o pagamento.</p></section>`}
async function subModal(){let pr=null;try{const{data}=await C.sb.rpc('public_pricing');pr=data}catch(e){}if(!pr||!pr.plans){toast('Não foi possível carregar os planos');return}
  await loadBill();const B=C.bill||{},plans=pr.plans.filter(p=>+p.price>0),feats=(pr.features||[]).filter(f=>f.kind!=='base');
  let sel=(plans.find(p=>p.id===B.plan)||plans[1]||plans[0]).id,cyc=B.cycle||'MONTHLY',pay='UNDEFINED';const mine=new Set(B.modules||[]),add=new Set();
  {const P0=plans.find(p=>p.id===sel);if(B.subscribed&&P0)feats.forEach(f=>{if(mine.has(f.id)&&!(P0.modules||[]).includes(f.id))add.add(f.id)})}
  openModal(mhead(B.subscribed?'Mudar plano':'Assinar o CERIONE')+'<div id="sb-box" class="grid"></div>',false);
  const draw=()=>{const P=plans.find(p=>p.id===sel),inc=P.modules||feats.map(f=>f.id),extra=feats.filter(f=>!inc.includes(f.id));[...add].forEach(id=>{if(inc.includes(id))add.delete(id)});
    const base=+P.price+extra.filter(f=>add.has(f.id)).reduce((a,f)=>a+ +f.price,0),disc=+B.discount_pct||0,mon=base*(1-disc/100),charge=cyc==='YEARLY'?mon*10:mon,tl=trialLeft(B);
    $('sb-box').innerHTML=`<div class="field"><label>Plano</label><div style="display:grid;gap:8px">${plans.map(p=>{const over=p.max_users&&B.members>p.max_users;return`<label class="checks" style="display:flex;flex-wrap:nowrap;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;${p.id===sel?'border-color:var(--zir,#0B7A75);box-shadow:0 0 0 1px var(--zir,#0B7A75)':''};${over?'opacity:.55':''}"><input type="radio" name="sb-plan" value="${h(p.id)}" ${p.id===sel?'checked':''} ${over?'disabled':''} style="flex:none;margin-top:3px"><span style="flex:1;min-width:0"><b>${h(p.name)}</b> · ${BRL(p.price)}/mês · ${p.max_users?'até '+p.max_users+' usuários':'usuários ilimitados'}<span class="mut" style="display:block;font-size:12.5px">${h(p.description||'')}${over?` · seu laboratório tem ${B.members} usuários`:''}</span></span></label>`}).join('')}</div></div>
     ${extra.length?`<div class="field"><label>Adicionais (opcional)</label><div style="display:grid;gap:6px">${extra.map(f=>`<label class="checks"><input type="checkbox" data-sb-add="${h(f.id)}" ${add.has(f.id)?'checked':''}> ${h(f.name)} · +${BRL(f.price)}/mês</label>`).join('')}</div></div>`:''}
     <div class="form-grid"><div class="field"><label for="sb-cyc">Ciclo</label><select id="sb-cyc"><option value="MONTHLY" ${cyc==='MONTHLY'?'selected':''}>Mensal</option><option value="YEARLY" ${cyc==='YEARLY'?'selected':''}>Anual · 2 meses grátis</option></select></div>
      <div class="field"><label for="sb-pay">Forma de pagamento</label><select id="sb-pay">${[['UNDEFINED','Escolher na hora (Pix, boleto ou cartão)'],['PIX','Pix'],['BOLETO','Boleto'],['CREDIT_CARD','Cartão de crédito']].map(([k,n])=>`<option value="${k}" ${k===pay?'selected':''}>${n}</option>`).join('')}</select></div></div>
     <div class="costbox"><div><span class="k">${cyc==='YEARLY'?'Valor por ano':'Valor por mês'}</span><span class="v" id="sb-total">${B.custom_price?BRL(B.charge):BRL(charge)}</span></div>${disc&&!B.custom_price?`<div><span class="k">Desconto</span><span class="v">${disc}% aplicado</span></div>`:''}${cyc==='YEARLY'&&!B.custom_price?`<div><span class="k">Equivale a</span><span class="v">${BRL(charge/12)}/mês</span></div>`:''}</div>
     ${B.custom_price?'<p class="mut" style="font-size:12.5px;margin:0">Seu laboratório tem um valor especial combinado com o CERIONE; a fatura usa esse valor.</p>':''}
     <p class="sub" style="margin:0;font-size:13px">${B.subscribed?'O novo valor vale a partir da próxima fatura em aberto.':tl!==null&&tl>0?`A primeira fatura vence em ${dBR(B.trial_end)}, no fim do teste. Até lá tudo continua liberado.`:'A primeira fatura vence hoje. O acesso completo volta assim que o pagamento for confirmado.'}</p>
     <div class="sheet-foot"><span class="err" id="sb-err"></span><div style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="sb-go" type="button">${B.subscribed?'Salvar mudança':'Assinar'}</button></div></div>`;
    $('sb-box').querySelectorAll('[name=sb-plan]').forEach(i=>i.addEventListener('change',()=>{sel=i.value;draw()}));
    $('sb-box').querySelectorAll('[data-sb-add]').forEach(i=>i.addEventListener('change',()=>{i.checked?add.add(i.dataset.sbAdd):add.delete(i.dataset.sbAdd);draw()}));
    $('sb-cyc').addEventListener('change',e=>{cyc=e.target.value;draw()});$('sb-pay').addEventListener('change',e=>{pay=e.target.value});
    $('sb-go').addEventListener('click',async()=>{const b=$('sb-go');b.disabled=true;$('sb-err').textContent='';b.textContent='Criando no Asaas…';
      try{const r=await cob('subscribe',{plan:sel,addons:[...add],cycle:cyc,billing:pay});await reloadLabState();render();
        openModal(mhead(B.subscribed?'Plano alterado':'Assinatura criada')+`<div class="grid"><p style="margin:0">Valor: <b>${BRL(r.value)}</b> ${r.cycle==='YEARLY'?'por ano':'por mês'}. ${r.invoice_url?`Próxima fatura: vencimento em <b>${dBR(r.due_date)}</b>.`:''}</p>
          ${r.invoice_url?`<a class="btn primary" href="${h(r.invoice_url)}" target="_blank" rel="noopener" style="justify-content:center">Abrir a fatura (Pix, boleto ou cartão)</a>`:''}<p class="mut" style="font-size:12.5px;margin:0">As faturas também ficam em Configurações → Plano e assinatura, e o Asaas envia cada uma por e-mail.</p>
          <div class="sheet-foot"><span></span><button class="btn" data-act="close">Fechar</button></div></div>`,true)}
      catch(err){b.disabled=false;b.textContent=B.subscribed?'Salvar mudança':'Assinar';$('sb-err').textContent=cobErr(err)}})};
  draw()}
window.CERIONE_CONTA=conta;
C.ui={MARK,openLab:l=>{try{sessionStorage.setItem(LABMODE,'1')}catch(e){}return openLab(l)},labsFromAdmin:async()=>{const labs=await myLabs();pickScreen(labs)}};
/* ---------- eventos ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-cl],[data-out]');if(!b)return;
  if(b.dataset.confirm&&b.dataset.armed!=='1'){b.dataset.armed='1';const o=b.innerHTML;b.innerHTML=h(b.dataset.confirm);setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.innerHTML=o}},3500);e.stopPropagation();return}
  const a=b.dataset.cl||'out';e.stopPropagation();
  if(a==='out'){await push(true);await C.sb.auth.signOut();localStorage.removeItem(LAST);try{sessionStorage.removeItem('cl-labmode')}catch(e){}location.reload()}
  else if(a==='labs'){await push(true);localStorage.removeItem(LAST);try{sessionStorage.removeItem(LABMODE)}catch(e){}location.reload()}
  else if(a==='hist')histModal();else if(a==='sub')subModal();else if(a==='bill-ref'){b.disabled=true;try{await cob('refresh');await reloadLabState();render();toast('Faturas atualizadas')}catch(err){toast(cobErr(err))}b.disabled=false}else if(a==='inv-new')invite();
  else if(a==='restore'){const{error}=await C.sb.rpc('restore_history',{p_lab:C.lab.id,p_id:+b.dataset.h});if(error){toast(errTxt(error));return}const docs=await loadDocs();S=merge(docs);migrate();applyUsers();Object.keys(AREAS).forEach(x=>C.sent[x]=J(split()[x]));closeModal();render();toast('Área restaurada da cópia escolhida')}
  else if(a==='rm'){const{error}=await C.sb.rpc('remove_member',{p_lab:C.lab.id,p_user:b.dataset.u});toast(error?errTxt(error):'Pessoa removida do laboratório');await loadMembers();applyUsers();render()}
},true);
document.addEventListener('change',async e=>{const t=e.target;
  if(t.dataset.clRole){const{error}=await C.sb.rpc('set_member_role',{p_lab:C.lab.id,p_user:t.dataset.clRole,p_role:t.value});toast(error?errTxt(error):'Perfil alterado');await loadMembers();applyUsers();render();e.stopPropagation()}
  else if(t.dataset.clTeam!=null){S.memberTeam={...(S.memberTeam||{}),[t.dataset.clTeam]:t.value||null};applyUsers();save();toast('Profissional ligado ao login');e.stopPropagation()}
  else if(t.dataset.clSupport){const{error}=await C.sb.rpc('set_support_access',{p_lab:C.lab.id,p_on:t.checked});if(error){toast(errTxt(error));t.checked=!t.checked}else{C.st.support_access=t.checked;toast(t.checked?'Suporte CERIONE liberado':'Acesso do suporte desligado')}e.stopPropagation()}
},true);
/* ---------- início ---------- */
async function start(){if(/type=recovery/.test(location.hash))return;if(await recoverFromLink())return;const{data:{session}}=await C.sb.auth.getSession();if(!session){loginScreen();return}C.user=session.user;
  if(C.user.user_metadata&&C.user.user_metadata.must_change_password){newPassScreen(true);return}
  try{await C.sb.rpc('claim_invites')}catch(e){}
  try{const{data:adm}=await C.sb.rpc('is_platform_admin');C.admin=!!adm}catch(e){C.admin=false}
  let labs;try{labs=await myLabs()}catch(e){screen(`<div class="msg err">${h(errTxt(e))}</div><button class="btn primary" onclick="location.reload()">Tentar de novo</button>`);return}
  if(C.admin){let lm=null;try{lm=sessionStorage.getItem(LABMODE)}catch(e){}if(lm!=='1'){adminScreen();return}}
  if(!labs.length&&!C.admin){setupScreen();return}
  const last=localStorage.getItem(LAST),pick=labs.find(l=>l.id===last)||(labs.length===1&&!C.admin?labs[0]:null);if(pick)openLab(pick);else pickScreen(labs)}
C.boot=function(){if(!window.supabase||!CFG.url){screen('<div class="msg err">Configuração do servidor ausente.</div>');return}
  window.CHAT={remote:true,async list(after){if(!C.lab)return[];const{data,error}=await C.sb.rpc('chat_list',{p_lab:C.lab.id,p_after:after||0});if(error)throw error;return(data||[]).map(m=>({id:+m.id,at:m.at,uid:m.user_id,uname:m.name||(m.email||'').split('@')[0]||'Usuário',text:m.text}))},
    async send(text){const{error}=await C.sb.rpc('chat_post',{p_lab:C.lab.id,p_text:text});if(error)throw error}};
  window.CFO_API={online:true,async analyze(snapshot,question){const{data,error}=await C.sb.functions.invoke('cfo',{body:{lab:C.lab.id,snapshot,question}});
    if(error){let m=error.message||'erro';try{const j=await error.context.json();m=j.error||m}catch(e){}throw new Error(m)}if(!data||!data.text)throw new Error('ai_error');return data.text}};
  const waCall=async(action,extra)=>{const{data,error}=await C.sb.functions.invoke('whatsapp',{body:{lab:C.lab.id,action,...(extra||{})}});
    if(error){let m=error.message||'erro',d=null;try{const j=await error.context.json();m=j.error||m;d=j.detail||null}catch(e){}const er=new Error(m);if(d)er.detail=d;throw er}return data||{}};
  window.WA_API={online:true,
    async cfg(){const{data,error}=await C.sb.rpc('wa_get',{p_lab:C.lab.id});if(error)throw error;return data||{status:'desconectado'}},
    status:()=>waCall('status'),connect:()=>waCall('connect'),logout:()=>waCall('logout'),
    send:m=>waCall('send',m),
    async setAuto(auto){const{error}=await C.sb.rpc('wa_set_auto',{p_lab:C.lab.id,p_auto:auto});if(error)throw error},
    async log(){const{data,error}=await C.sb.rpc('wa_log_list',{p_lab:C.lab.id});if(error)throw error;return data||[]}};
  C.sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.save=save=function(){try{auditDiff()}catch(e){}if(C.lab){if(C.st&&!C.st.can_write){setStatus('ro');return}setStatus('saving');schedule()}};
  window.cfgAccess=cfgAccess=function(){return cloudAccess()};
  if(typeof cfgPlan==='function'){const _cp=cfgPlan;window.cfgPlan=cfgPlan=function(){const base=_cp();return C.bill?billPanel()+(C.role==='dono'?base.replace('Para contratar outros, fale com o CERIONE.','Para contratar outros, use “Mudar plano” acima.'):base):base}}
  window.teamLoginCell=teamLoginCell=function(t){if(!can('admin'))return'';const em=Object.entries(S.memberTeam||{}).find(([e,id])=>id===t.id);return em?`<span class="pill ok">login: ${h(em[0])}</span>`:`<button class="btn sm" data-cl="inv-new">Convidar por e-mail</button>`};
  const _render=render;window.render=render=function(){if(!C.lab)return;_render();{const bn=billBanner();if(bn&&$('main'))$('main').insertAdjacentHTML('afterbegin',bn)}};
  C.sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY')newPassScreen()});
  window.addEventListener('beforeunload',e=>{if(C.lab&&C.timer){push(true)}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')push(true);else refreshIfNewer()});
  window.addEventListener('online',()=>push(true));setInterval(refreshIfNewer,30000);start()};
})();
