/* CERIONE · Gestão › Visão geral (KPIs): quem dá lucro, o que vende e onde agir.
   Arquivo separado (app/painel-kpi.js), carregado depois do sistema. Usa orderCost() — o mesmo cálculo do relatório de Rentabilidade. */
(function(){
if(typeof MODS_ALL==='undefined'||typeof V==='undefined')return;
const G=MODS_ALL.find(m=>m.id==='gestao');if(G&&!G.items.some(([t])=>t==='kpis'))G.items.unshift(['kpis','Visão geral (KPIs)']);
if(typeof VIEW_PERM!=='undefined')VIEW_PERM.kpis='fin';
const css=document.createElement('style');css.textContent=`
.kp-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.kp-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px}
@media(max-width:1100px){.kp-g3{grid-template-columns:1fr 1fr}}@media(max-width:760px){.kp-g2,.kp-g3{grid-template-columns:1fr}}
.kp-g2>.panel,.kp-g3>.panel{margin:0}.kp-t{width:100%;border-collapse:collapse;font-size:13px}.kp-t td{padding:7px 4px;border-top:1px solid var(--line);vertical-align:middle}.kp-t tr:first-child td{border-top:0}
.kp-t tr.click{cursor:pointer}.kp-t tr.click:hover td{background:var(--bg)}.kp-t td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.kp-bar{height:5px;border-radius:3px;background:var(--line);margin-top:4px;max-width:260px}.kp-bar i{display:block;height:5px;border-radius:3px;background:var(--accent)}.kp-bar.r i{background:var(--late)}
.kp-tag{font-size:11.5px;color:var(--muted,#64748B);margin-left:6px}.kp-al{display:flex;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:13.5px;line-height:1.4}.kp-al:first-child{border-top:0}
.kp-al.click{cursor:pointer}.kp-dot{width:9px;height:9px;border-radius:50%;margin-top:6px;flex:none;background:var(--accent)}.kp-dot.b{background:var(--late)}.kp-dot.w{background:var(--soon)}
.kp-empty{color:var(--muted,#64748B);font-size:13px;padding:8px 0}`;document.head.appendChild(css);
const per=()=>{const n=+(UI.kpiRange||3),k=monthKey(0),from=addMonths(k+'-01',-(n-1)),pf=addMonths(k+'-01',-(2*n-1)),pt=addFrom(from,-1);return{n,from,to:addDays(0),pf,pt}};
const inR=(d,a,b)=>d&&d.slice(0,10)>=a&&d.slice(0,10)<=b;
function agg(a,b){const del=S.orders.filter(o=>o.status==='entregue'&&inR(o.delivered,a,b));const T={rev:0,var:0,mar:0,n:0,el:0},C={},Sv={};
  del.forEach(o=>{const c=orderCost(o),el=q(o),v=(c.m||0)+(c.l||0)+(c.t||0);T.rev+=c.rev;T.var+=v;T.mar+=c.margin;T.n++;T.el+=el;
    const x=C[o.client]=C[o.client]||{rev:0,mar:0,n:0,el:0,rmk:0,disc:0};x.rev+=c.rev;x.mar+=c.margin;x.n++;x.el+=el;if(o.remake)x.rmk++;x.disc+=+o.discAmt||0;
    const s=(svcOf(o)._b||svcOf(o)),sid=s.id||o.service,y=Sv[sid]=Sv[sid]||{rev:0,mar:0,n:0,el:0,name:s.name};if(!o.remake){y.rev+=c.rev;y.mar+=c.margin;y.n++;y.el+=el}});
  return{del,T,C,Sv}}
const pc=(a,b)=>b?a/b*100:0,fmtK=v=>Math.abs(v)>=1e4?(v<0?'−':'')+'R$ '+(Math.abs(v)/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':(v<0?'−':'')+'R$ '+Math.round(Math.abs(v)).toLocaleString('pt-BR');
V.kpis=()=>{const P=per(),A=agg(P.from,P.to),B=agg(P.pf,P.pt),T=A.T;
  const tgt=+S.settings.margin||25,minM=+S.settings.marginMin||12;
  const grow=B.T.rev?pc(T.rev-B.T.rev,B.T.rev):null;
  const act=Object.keys(A.C).length,tk=act?T.rev/act/P.n:0;
  const dd=A.del.filter(o=>o.due&&!o.parent),ontime=dd.length?pc(dd.filter(o=>o.delivered.slice(0,10)<=o.due.slice(0,10)).length,dd.length):null;
  const mc=pc(T.rev-T.var,T.rev),lucro=T.mar;
  const cl=Object.entries(A.C).map(([id,x])=>({id,c:cliOf(id),...x,mp:pc(x.mar,x.rev)})).filter(x=>x.c&&x.c.id);
  const top=[...cl].sort((a,b)=>b.mar-a.mar).slice(0,5),bottom=[...cl].filter(x=>x.n>=2&&!top.some(t=>t.id===x.id)).sort((a,b)=>a.mp-b.mp).slice(0,5);
  const maxM=Math.max(1,...top.map(x=>x.mar));
  const sv=Object.entries(A.Sv).map(([id,x])=>({id,...x,mp:pc(x.mar,x.rev)})).filter(x=>x.rev>0&&x.n>=2);
  const sTop=[...sv].sort((a,b)=>b.mp-a.mp).slice(0,5),sBot=[...sv].filter(x=>!sTop.some(t=>t.id===x.id)).sort((a,b)=>a.mp-b.mp).slice(0,5);
  const why=x=>{const t=[];if(+x.c.discount)t.push('desconto '+pct(x.c.discount));else if(x.c.prices&&Object.keys(x.c.prices).length)t.push('tabela própria');if(x.rmk)t.push(x.rmk+' retrabalho'+(x.rmk>1?'s':''));if(x.disc>0)t.push('descontos na OS '+fmtK(x.disc));return t.length?`<span class="kp-tag">· ${esc(t.join(' · '))}</span>`:''};
  const cRow=(x,red)=>`<tr class="click" data-act="cli-open" data-id="${esc(x.id)}"><td>${esc(x.c.name)}${red?why(x):''}<div class="kp-bar${red?' r':''}"><i style="width:${red?Math.max(4,Math.min(100,x.mp/Math.max(tgt*2,1)*100)):Math.max(4,x.mar/maxM*100)}%"></i></div></td><td class="n">${fmtK(x.rev)}</td><td class="n ${x.mar<0?'neg':red?'':'pos'}">${fmtK(x.mar)}</td><td class="n ${x.mp<minM?'neg':''}">${pct(x.mp)}</td></tr>`;
  const sRow=x=>`<tr class="click" data-act="svc-open" data-id="${esc(x.id)}"><td>${esc(x.name)}<span class="kp-tag">· ${x.el} ${x.el===1?'un.':'un.'}</span></td><td class="n">${fmtK(x.rev)}</td><td class="n ${x.mp<0?'neg':x.mp>=tgt?'pos':''}">${pct(x.mp)}</td></tr>`;
  const tbl=(rows,empty)=>rows.length?`<table class="kp-t"><tbody>${rows.join('')}</tbody></table>`:`<p class="kp-empty">${empty}</p>`;
  // onde agir agora
  const AL=[];
  sv.filter(x=>x.mp<0).sort((a,b)=>a.mp-b.mp).slice(0,2).forEach(x=>{const s=find('services',x.id);AL.push(['b',`<b>${esc(x.name)} dá prejuízo</b> (margem ${pct(x.mp)}). Revise o preço${s&&+s.price?` de ${fmt(s.price)}`:''} ou o processo.`,`data-act="svc-open" data-id="${esc(x.id)}"`])});
  cl.filter(x=>x.mp<minM&&x.rev>0).sort((a,b)=>a.mp-b.mp).slice(0,2).forEach(x=>AL.push(['w',`<b>${esc(x.c.name)}:</b> margem de ${pct(x.mp)}${+x.c.discount?` com ${pct(x.c.discount)} de desconto`:''}. Rever o acordo.`,`data-act="cli-open" data-id="${esc(x.id)}"`]));
  if(typeof cliStats==='function'){const st=cliStats();if(st.inat.length){const lim=addDays(-240),avg=st.inat.reduce((a,c)=>a+S.orders.filter(o=>o.client===c.id&&o.status==='entregue'&&o.delivered>=lim).reduce((s,o)=>s+total(o),0),0)/6;
    AL.push(['w',`<b>${st.inat.length} dentista${st.inat.length>1?'s':''} sem pedir há mais de 60 dias</b>${avg>0?`, que faturavam cerca de ${fmtK(avg)} por mês`:''}. Veja em Clientes.`,`data-goto="clientes"`])}}
  if(ontime!=null&&ontime<85)AL.push(['w',`<b>Só ${pct(ontime)} das entregas no prazo.</b> Confira atrasos no quadro de produção.`,`data-goto="producao"`]);
  const byEl=[...cl].sort((a,b)=>b.el-a.el);if(byEl.length>1)AL.push(['i',`<b>Quem mais pede:</b> ${esc(byEl[0].c.name)} (${byEl[0].el} un.) · <b>quem menos:</b> ${esc(byEl[byEl.length-1].c.name)} (${byEl[byEl.length-1].el} un.).`,'']);
  if(!AL.length)AL.push(['i','Nada urgente: serviços e dentistas dentro da margem.','']);
  const lab=P.n===1?'neste mês':`nos últimos ${P.n} meses`;
  return head('Visão geral','Quem dá lucro, o que vende e onde agir. Lucro = receita − material − mão de obra − impostos − rateio do custo fixo (o mesmo cálculo da Rentabilidade).',seg('kpiRange',[['1','Mês atual'],['3','3 meses'],['12','12 meses']]))+
  (!T.n?`<section class="panel"><p class="kp-empty">Nenhum trabalho entregue ${lab}. Os indicadores aparecem conforme as OS forem entregues.</p></section>`:
  `<div class="kpis">${kpi('Faturamento',fmtK(T.rev),grow==null?lab:`<span class="${grow>=0?'pos':'neg'}">${grow>=0?'▲':'▼'} ${pct(Math.abs(grow))}</span> vs. período anterior`)}${kpi('Lucro',fmtK(lucro),`${pct(pc(lucro,T.rev))} do faturamento`,lucro<0?'bad':'')}${kpi('Margem de contribuição',pct(mc),`sem o custo fixo · meta de lucro ${pct(tgt)}`)}${kpi('Ticket médio por dentista',fmtK(tk),`por mês · ${act} dentista${act>1?'s':''} com entregas`)}${kpi('Entregas no prazo',ontime==null?'—':pct(ontime),ontime==null?'sem prazos':ontime<85?'abaixo de 85%':'no prazo',ontime!=null&&ontime<85?'warn':'')}</div>
  <div class="kp-g2"><section class="panel"><h2 style="margin:0">Dentistas que mais dão lucro</h2><p class="sub" style="margin:2px 0 8px">faturado · lucro · margem ${lab}</p>${tbl(top.map(x=>cRow(x,false)),'Sem dados.')}</section>
  <section class="panel"><h2 style="margin:0">Dentistas que menos dão lucro</h2><p class="sub" style="margin:2px 0 8px">em geral por desconto, retrabalho ou serviço de margem baixa</p>${tbl(bottom.map(x=>cRow(x,true)),'Poucos dentistas no período para comparar.')}</section></div>
  <div class="kp-g3"><section class="panel"><h2 style="margin:0">Serviços mais rentáveis</h2><p class="sub" style="margin:2px 0 8px">margem líquida no período</p>${tbl(sTop.map(sRow),'Sem dados.')}</section>
  <section class="panel"><h2 style="margin:0">Serviços menos rentáveis</h2><p class="sub" style="margin:2px 0 8px">revisar preço ou processo</p>${tbl(sBot.map(sRow),'Poucos serviços no período para comparar.')}</section>
  <section class="panel"><h2 style="margin:0">Onde agir agora</h2><p class="sub" style="margin:2px 0 8px">gerado a partir dos números ao lado</p><div>${AL.map(([k,t,a])=>`<div class="kp-al${a?' click':''}" ${a}><span class="kp-dot ${k}"></span><span>${t}</span></div>`).join('')}</div></section></div>
  <p class="mut" style="font-size:12px;margin:0">Clique em um dentista ou serviço para abrir a ficha. Detalhe completo em Gestão › Rentabilidade.</p>`)};
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-goto]');if(!t||!document.getElementById('main').contains(t))return;e.preventDefault();goTarget(t.dataset.goto);render()});
})();
