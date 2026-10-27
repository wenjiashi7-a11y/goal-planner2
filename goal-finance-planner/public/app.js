// <calc>
function factors(annual,n,due){
  const r=annual/12;
  const g=Math.pow(1+r,n);
  let f=(r===0)?n:(g-1)/r;
  if(due) f*=(1+r);
  return {r,g,f};
}
function solve(mode,annual,n,due,T,pv0,pmt0){
  const {r,g,f}=factors(annual,n,due);
  let pv=pv0,pmt=pmt0;
  if(mode==='pmt') pmt=Math.max(0,(T-pv0*g)/f);
  else if(mode==='pv') pv=Math.max(0,(T-pmt0*f)/g);
  return {pv,pmt,fv:pv*g+pmt*f,r,g,f};
}
function path(pv,pmt,annual,n,due){
  const r=annual/12; let b=pv; const out=[{m:0,bal:pv,inv:pv}];
  for(let m=1;m<=n;m++){
    b=due?(b+pmt)*(1+r):b*(1+r)+pmt;
    out.push({m,bal:b,inv:pv+pmt*m});
  }
  return out;
}
function retireTarget(spendToday,inf,rpost,yearsTo,yearsIn){
  const spendFut=spendToday*Math.pow(1+inf,yearsTo);
  const rReal=(1+rpost)/(1+inf)-1;
  const rm=Math.pow(1+rReal,1/12)-1;
  const months=Math.round(yearsIn*12);
  const factor=Math.abs(rm)<1e-12?months:(1-Math.pow(1+rm,-months))/rm;
  return {spendFut,rReal,rm,months,target:spendFut*factor*(1+rm)};
}
// </calc>

const $=s=>document.querySelector(s);
const nf=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:1});
const yuan=x=>'NT$ '+nf.format(Math.round(x));
const money=x=>{
  const a=Math.abs(x);
  if(a>=1e8) return 'NT$ '+(+(x/1e8).toFixed(2))+' 億';
  if(a>=1e6) return 'NT$ '+nf.format(Math.round(x/1e4))+' 萬';
  return yuan(x);
};
const pct=(x,d=1)=>(+x.toFixed(d))+'%';
const short=v=>{
  if(v>=1e8) return (+(v/1e8).toFixed(2))+'億';
  if(v>=1e4) return nf1.format(v/1e4)+'萬';
  return nf.format(Math.round(v));
};

const commonFields=[
  {id:'pv0',label:'目前已準備的本金',unit:'萬元',min:0,max:100000,step:1,modes:['pmt','fv']},
  {id:'pmt0',label:'每月可存入金額',unit:'元',min:0,max:10000000,step:1000,modes:['pv','fv']},
  {id:'rate',label:'預期年報酬率(存款期間)',unit:'%',min:0,max:20,step:0.1,modes:['pmt','pv','fv']}
];

const GOALS={
  retire:{
    label:'退休',
    desc:'先算出退休時需要累積多少退休金(這一步本身就是一次 PV 計算),再回推每月要存多少。',
    fields:[
      {id:'age',label:'目前年齡',unit:'歲',v:35,min:18,max:80,step:1},
      {id:'rage',label:'預計退休年齡',unit:'歲',v:60,min:19,max:90,step:1},
      {id:'life',label:'預期壽命',unit:'歲',v:90,min:50,max:110,step:1},
      {id:'spend',label:'退休後每月花費(今日幣值)',unit:'萬元',v:5,min:0.5,max:100,step:0.5},
      {id:'inf',label:'通貨膨脹率',unit:'%',v:2,min:0,max:10,step:0.1},
      {id:'rpost',label:'退休後投資報酬率',unit:'%',v:3,min:0,max:12,step:0.1}
    ],
    common:{pv0:100,pmt0:20000,rate:5,due:0},
    calc(V){
      const yrs=V.rage-V.age, yin=V.life-V.rage;
      if(yrs<1) return {error:'預計退休年齡要比目前年齡大。'};
      if(yin<1) return {error:'預期壽命要比預計退休年齡大。'};
      const r=retireTarget(V.spend*1e4,V.inf/100,V.rpost/100,yrs,yin);
      return {
        years:yrs, target:r.target,
        todayVal:r.target/Math.pow(1+V.inf/100,yrs), todayLabel:'相當於今日購買力',
        notes:[
          ['退休時每月花費(含通膨)',yuan(r.spendFut)],
          ['退休後需支應',yin+' 年(共 '+r.months+' 個月)'],
          ['退休後實質報酬率(扣除通膨)',pct(r.rReal*100,2)]
        ],
        formulaNote:'退休金目標是對「退休後每月提領」做一次 PV 計算(月初提領,用實質報酬率):\n=PV('+(r.rm*100).toFixed(4)+'%, '+r.months+', -'+Math.round(r.spendFut)+', 0, 1)'
      };
    }
  },
  house:{
    label:'購屋頭期款',
    desc:'考慮房價每年上漲,算出屆時的頭期款,再看每月要存多少。',
    fields:[
      {id:'price',label:'目標房屋總價(今日)',unit:'萬元',v:1500,min:100,max:100000,step:50},
      {id:'down',label:'頭期款成數',unit:'%',v:20,min:5,max:100,step:1},
      {id:'years',label:'幾年後購屋',unit:'年',v:8,min:1,max:40,step:1},
      {id:'growth',label:'房價年漲幅',unit:'%',v:2,min:0,max:15,step:0.1}
    ],
    common:{pv0:50,pmt0:15000,rate:3,due:0},
    calc(V){
      const today=V.price*1e4*V.down/100, k=Math.pow(1+V.growth/100,V.years);
      return {
        years:V.years, target:today*k, todayVal:today, todayLabel:'以今日房價計的頭期款',
        notes:[['購屋時預估總價',money(V.price*1e4*k)],['頭期款成數',pct(V.down,0)]]
      };
    }
  },
  edu:{
    label:'子女教育',
    desc:'教育費用通常漲得比物價快,先把學費上漲算進目標,再看每月存款。',
    fields:[
      {id:'cost',label:'預計總花費(今日幣值)',unit:'萬元',v:200,min:10,max:10000,step:10},
      {id:'years',label:'幾年後開始使用',unit:'年',v:12,min:1,max:25,step:1},
      {id:'infl',label:'教育費用年漲幅',unit:'%',v:3,min:0,max:15,step:0.1}
    ],
    common:{pv0:20,pmt0:8000,rate:4,due:0},
    calc(V){
      const today=V.cost*1e4;
      return {
        years:V.years, target:today*Math.pow(1+V.infl/100,V.years),
        todayVal:today, todayLabel:'以今日費用計',
        notes:[['教育費用年漲幅',pct(V.infl)]]
      };
    }
  },
  emergency:{
    label:'緊急預備金',
    desc:'通常準備 3 到 6 個月的必要支出。這筆錢偏重安全,報酬率可以設得保守。',
    fields:[
      {id:'exp',label:'每月必要支出(今日)',unit:'元',v:40000,min:5000,max:1000000,step:1000},
      {id:'months',label:'準備幾個月的支出',unit:'個月',v:6,min:1,max:24,step:1},
      {id:'years',label:'幾年內存滿',unit:'年',v:2,min:1,max:20,step:1},
      {id:'infl',label:'物價年漲幅',unit:'%',v:2,min:0,max:10,step:0.1}
    ],
    common:{pv0:5,pmt0:10000,rate:1.5,due:0},
    calc(V){
      const today=V.exp*V.months;
      return {
        years:V.years, target:today*Math.pow(1+V.infl/100,V.years),
        todayVal:today, todayLabel:'以今日物價計',
        notes:[['每月必要支出(今日)',yuan(V.exp)],['備用金月數',V.months+' 個月']]
      };
    }
  },
  custom:{
    label:'自訂目標',
    desc:'旅行、創業、換車都可以。輸入想要的金額與年數,通膨設為 0 就是不調整。',
    fields:[
      {id:'target',label:'目標金額(今日幣值)',unit:'萬元',v:500,min:1,max:100000,step:10},
      {id:'years',label:'幾年後需要',unit:'年',v:10,min:1,max:50,step:1},
      {id:'infl',label:'物價年漲幅',unit:'%',v:2,min:0,max:10,step:0.1}
    ],
    common:{pv0:50,pmt0:20000,rate:4,due:0},
    calc(V){
      const today=V.target*1e4;
      return {
        years:V.years, target:today*Math.pow(1+V.infl/100,V.years),
        todayVal:today, todayLabel:'以今日幣值計',
        notes:[]
      };
    }
  }
};

const MODES={
  pmt:{name:'每月要存多少',fn:'PMT',desc:'已知目標,算每月存款',eyebrow:'每月需存入',col:'每月需存'},
  pv:{name:'現在要準備多少',fn:'PV',desc:'已知每月存款,算起始本金',eyebrow:'現在需準備一筆',col:'現在需準備'},
  fv:{name:'照計畫能存到多少',fn:'FV',desc:'已知本金與存款,算到期金額',eyebrow:'預計可累積',col:'預計累積'}
};

const state={goal:'retire',mode:'pmt',vals:{}};
for(const k in GOALS){
  const g=GOALS[k]; state.vals[k]={};
  g.fields.forEach(f=>state.vals[k][f.id]=f.v);
  Object.assign(state.vals[k],g.common);
}

function buildStatic(){
  $('#goalTabs').innerHTML=Object.keys(GOALS).map(k=>
    `<button type="button" class="tab" data-goal="${k}" aria-pressed="false">${GOALS[k].label}</button>`).join('');
  $('#modeBtns').innerHTML=Object.keys(MODES).map(k=>{
    const m=MODES[k];
    return `<button type="button" class="mode" data-mode="${k}" aria-pressed="false"><span class="fn">${m.fn}</span><span class="nm">${m.name}</span><span class="ds">${m.desc}</span></button>`;
  }).join('');
}

function fieldHtml(f,v){
  return `<div class="field"><label for="f-${f.id}">${f.label}</label><div class="ctl"><input id="f-${f.id}" data-id="${f.id}" type="number" inputmode="decimal" min="${f.min}" max="${f.max}" step="${f.step}" value="${v[f.id]}"><span class="unit">${f.unit}</span></div></div>`;
}

function renderInputs(){
  const g=GOALS[state.goal], v=state.vals[state.goal];
  const cf=commonFields.filter(f=>f.modes.includes(state.mode));
  const dueSel=`<div class="field"><label for="f-due">每月存入時間</label><div class="ctl"><select id="f-due" data-id="due"><option value="0"${+v.due===0?' selected':''}>月底(期末)</option><option value="1"${+v.due===1?' selected':''}>月初(期初)</option></select></div></div>`;
  $('#inputs').innerHTML=
    `<div class="group"><h3>目標條件</h3><div class="fields">${g.fields.map(f=>fieldHtml(f,v)).join('')}</div></div>`+
    `<div class="group"><h3>你的資金條件</h3><div class="fields">${cf.map(f=>fieldHtml(f,v)).join('')}${dueSel}</div></div>`;
}

function getV(){
  const g=GOALS[state.goal], raw=state.vals[state.goal];
  const V={due:+raw.due===1?1:0};
  for(const f of [...g.fields,...commonFields]){
    let x=parseFloat(raw[f.id]); if(!isFinite(x)) x=0;
    V[f.id]=Math.min(f.max,Math.max(f.min,x));
  }
  return V;
}

let lastChart=null;

function update(){
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.goal===state.goal)));
  document.querySelectorAll('.mode').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
  const g=GOALS[state.goal]; $('#goalDesc').textContent=g.desc;
  const V=getV(), b=g.calc(V), mode=state.mode, M=MODES[mode];
  if(b.error){
    $('#headline').innerHTML=`<p class="err">${b.error}</p>`;
    ['#strip','#notes','#scen','#sched','#formula'].forEach(s=>$(s).innerHTML='');
    $('#chart').innerHTML=''; lastChart=null; return;
  }
  const years=b.years, n=Math.round(years*12), due=V.due, T=b.target;
  const pv0=V.pv0*1e4, pmt0=V.pmt0, ann=V.rate/100;
  const S=solve(mode,ann,n,due,T,pv0,pmt0);
  const totalIn=S.pv+S.pmt*n, gain=S.fv-totalIn;

  // headline
  let big,sub,pill='';
  if(mode==='pmt'){
    big=yuan(S.pmt);
    sub=S.pmt>0
      ? `未來 ${years} 年(${n} 個月)每月存入此金額,加上現有本金 ${money(pv0)},預計累積到 ${money(T)}。總投入約 ${money(totalIn)},其中投資收益約 ${money(gain)}(占 ${pct(gain/S.fv*100,0)})。`
      : `現有本金 ${money(pv0)} 以 ${pct(V.rate)} 年化成長,${years} 年後就會超過目標,不需要再每月存入。`;
  }else if(mode==='pv'){
    big=money(S.pv);
    sub=S.pv>0
      ? `之後每月固定存入 ${yuan(pmt0)},現在需要先準備約 ${yuan(S.pv)} 當起始本金,${years} 年後就能達到 ${money(T)}。`
      : `每月存入 ${yuan(pmt0)} 已足以達成目標,不需要起始本金。`;
  }else{
    big=money(S.fv);
    const rate=S.fv/T*100, need=solve('pmt',ann,n,due,T,pv0,pmt0).pmt;
    if(S.fv>=T){
      pill=`<span class="pill ok">達標 ${pct(rate,0)}</span>`;
      sub=`以本金 ${money(pv0)} 加每月 ${yuan(pmt0)} 計算,${years} 年後預計累積 ${money(S.fv)},比目標多 ${money(S.fv-T)}。`;
    }else{
      pill=`<span class="pill bad">達成率 ${pct(rate,0)}</span>`;
      sub=`以本金 ${money(pv0)} 加每月 ${yuan(pmt0)} 計算,${years} 年後預計累積 ${money(S.fv)},缺口 ${money(T-S.fv)}。每月多存 ${yuan(need-pmt0)}(合計 ${yuan(need)})可以補足。`;
    }
  }
  $('#headline').innerHTML=`<p class="eyebrow">${M.eyebrow}<code>${M.fn}</code></p><p class="big">${big}</p><p class="sub">${pill}${sub}</p>`;

  $('#strip').innerHTML=
    `<div><dt>目標金額(${years} 年後)</dt><dd>${money(T)}</dd></div>`+
    `<div><dt>${b.todayLabel}</dt><dd>${money(b.todayVal)}</dd></div>`+
    `<div><dt>存款期間</dt><dd>${years} 年 / ${n} 個月</dd></div>`;
  $('#notes').innerHTML=b.notes.map(x=>`<li><span>${x[0]}</span><span>${x[1]}</span></li>`).join('');

  // chart + schedule
  const pts=path(S.pv,S.pmt,ann,n,due);
  lastChart={pts,T,years,n};
  drawChart();
  const rows=pts.filter(p=>p.m>0&&p.m%12===0);
  $('#sched').innerHTML=`<table><thead><tr><th>年</th><th>年底資產</th><th>累計投入</th><th>累計收益</th><th>達成率</th></tr></thead><tbody>`+
    rows.map(p=>`<tr><td>第 ${p.m/12} 年</td><td>${yuan(p.bal)}</td><td>${yuan(p.inv)}</td><td>${yuan(p.bal-p.inv)}</td><td>${pct(p.bal/T*100,0)}</td></tr>`).join('')+`</tbody></table>`;

  // scenarios
  const set=[...new Set([Math.max(0,V.rate-2),V.rate,V.rate+2].map(x=>+x.toFixed(2)))].sort((a,b)=>a-b);
  const val=r=>{const s=solve(mode,r/100,n,due,T,pv0,pmt0); return mode==='pmt'?s.pmt:mode==='pv'?s.pv:s.fv;};
  const baseVal=val(V.rate), fmtV=x=>mode==='pmt'?yuan(x):money(x);
  const diffTxt=d=>Math.abs(d)<0.5?'—':(d>0?'+ ':'− ')+(mode==='pmt'?yuan(Math.abs(d)):money(Math.abs(d)));
  $('#scen').innerHTML=`<table><thead><tr><th>年報酬率</th><th>${M.col}</th><th>與你設定的差</th>${mode==='fv'?'<th>達成率</th>':''}</tr></thead><tbody>`+
    set.map(r=>{
      const x=val(r), isBase=Math.abs(r-V.rate)<1e-9;
      return `<tr class="${isBase?'base':''}"><td>${pct(r)}${isBase?'(你設定的)':''}</td><td>${fmtV(x)}</td><td>${isBase?'—':diffTxt(x-baseVal)}</td>${mode==='fv'?`<td>${pct(x/T*100,0)}</td>`:''}</tr>`;
    }).join('')+`</tbody></table>`;

  // formulas
  const type=due, neg=x=>x===0?'0':'-'+x, rt=V.rate;
  const xl={
    pmt:`=PMT(${rt}%/12, ${n}, ${Math.round(pv0)}, ${neg(Math.round(T))}, ${type})`,
    pv:`=PV(${rt}%/12, ${n}, ${Math.round(pmt0)}, ${neg(Math.round(T))}, ${type})`,
    fv:`=FV(${rt}%/12, ${n}, ${neg(Math.round(pmt0))}, ${neg(Math.round(pv0))}, ${type})`
  }[mode];
  const math={
    pmt:'每月存款 = (目標 − 本金 × (1+r)ⁿ) × r ÷ ((1+r)ⁿ − 1)',
    pv:'起始本金 = (目標 − 每月存款 × ((1+r)ⁿ − 1) ÷ r) ÷ (1+r)ⁿ',
    fv:'未來值 = 本金 × (1+r)ⁿ + 每月存款 × ((1+r)ⁿ − 1) ÷ r'
  }[mode];
  const res=mode==='pmt'?yuan(S.pmt):yuan(mode==='pv'?S.pv:S.fv);
  $('#formula').innerHTML=
    `<p style="margin:0 0 4px;color:var(--muted);font-size:14px">貼到 Excel 或 Google 試算表,結果會和上方一致。</p>`+
    `<div class="code" id="xl">${xl}</div>`+
    `<p style="margin:0 0 8px;font-size:14px">結果 ${res}　<button type="button" class="copy" id="copyXl">複製公式</button> <span id="copyMsg" style="font-size:13px;color:var(--muted)"></span></p>`+
    `<div class="code">${math}\nr = ${rt}% ÷ 12 = ${(ann/12*100).toFixed(4)}%(月利率)\nn = ${years} 年 × 12 = ${n} 期${due?'\n每月月初存入:再乘以 (1+r)':''}</div>`+
    (b.formulaNote?`<div class="code">${b.formulaNote}</div>`:'');
}

function niceStep(raw){
  const p=Math.pow(10,Math.floor(Math.log10(raw))), m=raw/p;
  return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;
}

function drawChart(){
  const box=$('#chart'); if(!lastChart||!box) return;
  const {pts,T,years}=lastChart;
  const W=Math.max(280,Math.floor(box.clientWidth)), H=W<480?230:300;
  const L=W<480?48:58, R=16, Tp=18, B=30;
  const yp=pts.filter(p=>p.m%12===0);
  const maxV=Math.max(T,...yp.map(p=>p.bal))*1.06;
  const ystep=niceStep(maxV/4);
  const xs=y=>L+(W-L-R)*y/years, ys=v=>Tp+(H-Tp-B)*(1-v/maxV);
  const xstep=years<=6?1:years<=12?2:years<=30?5:10;
  let g='';
  for(let i=0;i*ystep<=maxV;i++){
    const v=i*ystep, y=ys(v).toFixed(1);
    g+=`<line class="grid-l" x1="${L}" x2="${W-R}" y1="${y}" y2="${y}"/><text class="tk" x="${L-6}" y="${(+y+4).toFixed(1)}" text-anchor="end">${short(v)}</text>`;
  }
  for(let y=0;y<=years;y+=xstep){
    g+=`<text class="tk" x="${xs(y).toFixed(1)}" y="${H-10}" text-anchor="${y===0?'start':'middle'}">${y===0?'現在':y+'年'}</text>`;
  }
  const line=yp.map(p=>`${xs(p.m/12).toFixed(1)},${ys(p.bal).toFixed(1)}`).join(' L');
  const inv=yp.map(p=>`${xs(p.m/12).toFixed(1)},${ys(p.inv).toFixed(1)}`).join(' L');
  const area=`M${line} L${xs(years).toFixed(1)},${ys(0).toFixed(1)} L${xs(0).toFixed(1)},${ys(0).toFixed(1)} Z`;
  const ty=ys(T).toFixed(1), last=yp[yp.length-1];
  box.innerHTML=
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="資產成長圖:${years} 年後資產 ${short(last.bal)},目標 ${short(T)}">`+
    g+`<line class="ax" x1="${L}" x2="${W-R}" y1="${ys(0).toFixed(1)}" y2="${ys(0).toFixed(1)}"/>`+
    `<path class="c-area" d="${area}"/><path class="c-inv" d="M${inv}"/>`+
    `<line class="c-tgt" x1="${L}" x2="${W-R}" y1="${ty}" y2="${ty}"/>`+
    `<text class="c-tl" x="${L+6}" y="${(+ty-7).toFixed(1)}">目標 ${short(T)}</text>`+
    `<path class="c-line" d="M${line}"/><circle class="c-dot" cx="${xs(years).toFixed(1)}" cy="${ys(last.bal).toFixed(1)}" r="5"/></svg>`;
}

// events
document.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t) return;
  if(t.dataset.goal){ state.goal=t.dataset.goal; renderInputs(); update(); }
  else if(t.dataset.mode){ state.mode=t.dataset.mode; renderInputs(); update(); }
  else if(t.id==='copyXl'){
    const txt=$('#xl').textContent, msg=$('#copyMsg');
    const done=ok=>{ msg.textContent=ok?'已複製':'請手動選取上方公式複製'; };
    try{ navigator.clipboard.writeText(txt).then(()=>done(true),()=>{
      const r=document.createRange(); r.selectNodeContents($('#xl')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); done(false);
    }); }catch(err){ done(false); }
  }
});
$('#inputs').addEventListener('input',e=>{
  const id=e.target.dataset.id; if(!id) return;
  state.vals[state.goal][id]=e.target.value; update();
});
$('#inputs').addEventListener('change',e=>{
  const id=e.target.dataset.id; if(!id||id==='due') return;
  const f=[...GOALS[state.goal].fields,...commonFields].find(x=>x.id===id); if(!f) return;
  let x=parseFloat(e.target.value); if(!isFinite(x)) x=f.min;
  x=Math.min(f.max,Math.max(f.min,x));
  e.target.value=x; state.vals[state.goal][id]=x; update();
});
let raf=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(raf); raf=requestAnimationFrame(drawChart);});

buildStatic(); renderInputs(); update();
