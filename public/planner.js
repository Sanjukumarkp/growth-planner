/* Growth Planner client app. Talks to /api/* for storage, advisor and export. */
(function(){

/* ================= utilities ================= */
const TODAY=(()=>{const d=new Date();d.setHours(0,0,0,0);return d})();
const DAY=864e5;
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const parseISO=s=>{if(!s)return null;const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const mondayOf=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const days=(a,b)=>Math.round((b-a)/DAY);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const w=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-w);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/864e5+1)/7)}
const fmtD=d=>d.getDate()+' '+MON[d.getMonth()];
const fmtDW=d=>WD[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()];
const mkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const mlabel=k=>{const[y,m]=k.split('-').map(Number);return MON[m-1]+' '+String(y).slice(2)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trimN=x=>(x>=100?x.toFixed(0):x>=10?x.toFixed(1):x.toFixed(2)).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
function inr(n){if(n==null||isNaN(n))return '—';const s=n<0?'−':'';n=Math.abs(n);if(n>=1e7)return s+'₹'+trimN(n/1e7)+' Cr';if(n>=1e5)return s+'₹'+trimN(n/1e5)+' L';return s+'₹'+Math.round(n).toLocaleString('en-IN')}
const uid=()=>Math.random().toString(36).slice(2,9);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const COLORS=['#3552F2','#E2533B','#0E9F57','#B4511A','#8A4FD8','#0B8EA8','#C27800'];
const initials=n=>(n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const fyQuarter=d=>{const m=d.getMonth();const q=m>=3&&m<=5?1:m>=6&&m<=8?2:m>=9&&m<=11?3:4;const fy=(m>=3?d.getFullYear()+1:d.getFullYear());return {q,fy,label:`Q${q} FY${String(fy).slice(2)}`,range:[['Apr','Jun'],['Jul','Sep'],['Oct','Dec'],['Jan','Mar']][q-1].join('–')}};

const ICON={
week:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 14l2.5 2.5L16 12"/></svg>',
plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V5M4 5c3-2 6 2 9 0s5-1 7 0v9c-2-1-4-2-7 0s-6-2-9 0"/></svg>',
cash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h10M7 9h10M7 5c5 0 6 8 0 8h-.5L14 20"/></svg>',
advisor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
compliance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/></svg>',
team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 010 6.4M18 14.8c1.8.8 3 2.6 3.5 5.2"/></svg>',
tick:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L22 20H2z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>',
arrow:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
logo:'<svg width="30" height="30" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="var(--accent)"/><rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#fff"/><rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="#fff"/><rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="var(--pop)"/></svg>'
};

/* ================= state ================= */
let S=null;            // persisted state
let UI={view:'week',openTask:null,filter:'all',compFilter:'All',menu:false,busy:false,personFilter:'all'};
let OB=null;           // onboarding in progress
let serverVersion=0, syncMode='saved', REAL=null, saving=false, pendingSave=false;
const GP=window.__GP__||{};

function blank(){return{v:1,profile:null,sample:false,items:[],team:[],recv:[],pay:[],history:[],weeks:{},streak:[],
  launch:[],first10:[],ideaChecks:{},job:{salary:0,need:0,side:0},
  scen:{hire:{on:false,n:2,salary:60000,month:0},late:{on:false,days:60,share:25},drop:{on:false,pct:20}},
  be:{price:1000,varCost:600,fixed:0},compDone:{},regs:{},reminders:{monday:true,close:true,review:true,reviewDay:5},chat:[],updatedAt:0}}

let saveTimer=null;
function save(){if(!S)return;S.updatedAt=Date.now();if(S.sample)return;syncMode='saving';paintSync();clearTimeout(saveTimer);saveTimer=setTimeout(pushDb,800)}
async function pushDb(){
  if(!S||S.sample)return;
  if(saving){pendingSave=true;return}
  saving=true;
  try{
    const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:S,version:serverVersion})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){location.href='/login';return}
    if(r.status===409){serverVersion=j.version;S=j.state;syncMode='saved';toast(j.error||'Someone else saved changes. Showing their version.');if(!OB)render();return}
    if(!r.ok)throw new Error(j.error||'save failed');
    serverVersion=j.version;syncMode='saved';
  }catch(e){syncMode='offline';clearTimeout(saveTimer);saveTimer=setTimeout(pushDb,5000)}
  finally{saving=false;paintSync();if(pendingSave){pendingSave=false;pushDb()}}
}
window.addEventListener('beforeunload',e=>{if(syncMode==='saving'||saving){e.preventDefault();e.returnValue=''}});
function paintSync(){const el=document.getElementById('sync');if(el){el.className='sync'+(syncMode==='saved'?' ok':'');el.innerHTML='<i></i>'+(S&&S.sample?'Sample data, not saved':syncMode==='saved'?'All changes saved':syncMode==='saving'?'Saving…':'Offline. Retrying…')}}

/* ================= finance model ================= */
function fin(){
  const p=S.profile||{};const cash=p.cash||0,rev=p.rev||0,spend=p.spend||0;
  const net=spend-rev;const runway=net>0?cash/net:Infinity;
  const cutFor12=net>0?Math.max(0,net-cash/12):0;
  const outDate=isFinite(runway)?addDays(TODAY,Math.round(runway*30.4)):null;
  return{cash,rev,spend,net,runway,cutFor12,outDate};
}
function runwayTxt(r){return !isFinite(r)?'Profitable':r>=36?'36+ months':trimN(Math.round(r*10)/10)+' months'}
function runwayTone(r){return !isFinite(r)||r>=12?'good':r>=6?'warn':'bad'}

function forecast(useScen){
  const p=S.profile,sc=S.scen;const start=mondayOf(TODAY);
  const wRev=(p.rev||0)*12/52,wSpend=(p.spend||0)*12/52;
  const hireStart=(()=>{const d=new Date(TODAY.getFullYear(),TODAY.getMonth()+ +sc.hire.month,1);return d<start?start:d})();
  const open=S.recv.filter(r=>!r.paid);const biggest=open.slice().sort((a,b)=>b.amt-a.amt)[0];
  const lagW=Math.round(sc.late.days/7);
  let bal=p.cash||0;const out=[];
  for(let i=0;i<13;i++){
    const ws=addDays(start,7*i),we=addDays(ws,7);
    let inflow=wRev,outflow=wSpend;
    if(useScen&&sc.drop.on)inflow*=(1-sc.drop.pct/100);
    if(useScen&&sc.late.on){const delayed=inflow*sc.late.share/100;inflow-=delayed;if(i>=lagW)inflow+=delayed}
    for(const r of open){let d=parseISO(r.due);if(d<start)d=addDays(start,7);if(useScen&&sc.late.on&&biggest&&r.id===biggest.id)d=addDays(d,sc.late.days);if(d>=ws&&d<we)inflow+=r.amt}
    for(const b of S.pay.filter(x=>!x.paid)){let d=parseISO(b.due);if(d<start)d=start;if(d>=ws&&d<we)outflow+=b.amt}
    if(useScen&&sc.hire.on&&ws>=mondayOf(hireStart))outflow+=sc.hire.n*sc.hire.salary*12/52;
    const o=bal;bal=bal+inflow-outflow;out.push({ws,open:o,inflow,outflow,close:bal});
  }
  return out;
}
function anyScen(){const s=S.scen;return s.hire.on||s.late.on||s.drop.on}

/* ================= compliance ================= */
function compEvents(){
  const p=S.profile||{};const ev=[];const from=addDays(TODAY,-20),to=addDays(TODAY,95);
  const push=(d,title,type,note)=>{if(d>=from&&d<=to)ev.push({id:type+'-'+iso(d)+'-'+title.slice(0,12).replace(/\W/g,''),date:d,title,type,note})};
  for(let k=-1;k<5;k++){
    const base=new Date(TODAY.getFullYear(),TODAY.getMonth()+k,1);const y=base.getFullYear(),m=base.getMonth();
    const prev=MONL[(m+11)%12];
    push(new Date(y,m,m===3?30:7),`TDS deposit for ${prev}`,'TDS','Tax deducted on salaries, rent and vendor payments');
    push(new Date(y,m,11),`GSTR-1 for ${prev}`,'GST','Outward sales return (monthly filers)');
    if(!['Just me','2–5'].includes(p.team))push(new Date(y,m,15),`PF & ESI for ${prev}`,'Payroll','Applies once you are registered (PF at 20+ staff, ESI at 10+)');
    push(new Date(y,m,20),`GSTR-3B for ${prev}`,'GST','Summary return and GST payment (monthly filers)');
  }
  const yrs=[TODAY.getFullYear()-1,TODAY.getFullYear(),TODAY.getFullYear()+1];
  for(const y of yrs){
    [[5,15,'Advance tax: 15% instalment'],[8,15,'Advance tax: 45% instalment'],[11,15,'Advance tax: 75% instalment'],[2,15,'Advance tax: final instalment']].forEach(([m,d,t])=>push(new Date(y,m,d),t,'Tax','Due if your tax for the year is above ₹10,000'));
    [[6,31,'Q1 (Apr–Jun)'],[9,31,'Q2 (Jul–Sep)'],[0,31,'Q3 (Oct–Dec)'],[4,31,'Q4 (Jan–Mar)']].forEach(([m,d,q])=>push(new Date(y,m,d),`TDS return for ${q}`,'TDS','Forms 24Q (salaries) and 26Q (others)'));
    push(new Date(y,9,30),'AOC-4: file financial statements','ROC','Within 30 days of your AGM (AGM by 30 Sep)');
    push(new Date(y,10,29),'MGT-7: annual return','ROC','Within 60 days of your AGM');
    push(new Date(y,8,30),'DIR-3 KYC for every director','ROC','Yearly KYC for each director');
    push(new Date(y,9,31),'Income tax return (audited companies)','Tax','ITR-6 for companies needing a tax audit');
    push(new Date(y,9,31),'MSME-1: dues to MSME suppliers','ROC','Half-yearly, only if you owe MSME vendors for 45+ days');
    push(new Date(y,3,30),'MSME-1: dues to MSME suppliers','ROC','Half-yearly, only if you owe MSME vendors for 45+ days');
  }
  ev.sort((a,b)=>a.date-b.date);
  return ev;
}
function nextDue(){return compEvents().filter(e=>!S.compDone[e.id]&&e.date>=TODAY)}
function overdueComp(){return compEvents().filter(e=>!S.compDone[e.id]&&e.date<TODAY)}

const SCHEMES=[
 {k:'dpiit',n:'Startup India (DPIIT) recognition',d:'The key that unlocks most benefits below. For companies, LLPs and partnerships under 10 years old with turnover under ₹100 Cr in every year.',url:'https://www.startupindia.gov.in',fit:p=>true},
 {k:'udyam',n:'Udyam registration',d:'Free MSME registration using Aadhaar and PAN. Gets you priority lending, protection against late payment from buyers, and CGTMSE loans.',url:'https://udyamregistration.gov.in',fit:p=>p.stage!=='idea'},
 {k:'80iac',n:'Section 80-IAC tax holiday',d:'100% deduction on profits for any 3 consecutive years out of your first 10. Needs DPIIT recognition and a separate approval.',url:'https://www.startupindia.gov.in',fit:p=>p.stage==='growing'||p.stage==='scaling'},
 {k:'sisfs',n:'Startup India Seed Fund Scheme',d:'Up to ₹20 L as a grant for proof of concept or prototype, and up to ₹50 L as debt for market entry, through approved incubators.',url:'https://seedfund.startupindia.gov.in',fit:p=>p.stage==='idea'||p.stage==='early'},
 {k:'cgss',n:'Credit Guarantee Scheme for Startups',d:'Collateral-free loans from banks and NBFCs for DPIIT-recognised startups, backed by a government guarantee.',url:'https://www.ncgtc.in',fit:p=>p.stage!=='idea'},
 {k:'cgtmse',n:'CGTMSE loans',d:'Collateral-free business loans for Udyam-registered micro and small businesses.',url:'https://www.cgtmse.in',fit:p=>p.stage!=='idea'},
 {k:'state',n:'Your state startup policy',d:'Most states run a startup mission with grants, rent and patent-fee reimbursements, and incubation. Check your state’s startup portal.',url:'',fit:p=>true}
];

/* ================= modules per stage ================= */
const MODS=[
 {k:'week',n:'This week',s:'all',go:'week'},
 {k:'idea',n:'Idea test',s:['idea'],later:'For founders still testing the idea'},
 {k:'first10',n:'First 10 customers',s:['idea','early'],later:'You are past your first 10'},
 {k:'launch',n:'Cost to launch',s:['idea'],later:'Only needed before launch'},
 {k:'quit',n:'When to quit the job',s:['idea'],later:'Only for side-project founders'},
 {k:'cash13',n:'13-week cash forecast',s:'all',go:'cash'},
 {k:'be',n:'Break-even calculator',s:['early','growing','scaling'],go:'cash',later:'Opens with your first sales'},
 {k:'aging',n:'Who owes you, whom you owe',s:['early','growing','scaling'],go:'cash',later:'Opens with your first sales'},
 {k:'advisor',n:'AI advisor',s:'all',go:'advisor'},
 {k:'comp',n:'Compliance calendar',s:['early','growing','scaling'],go:'compliance',later:'Starts once you register for GST'},
 {k:'schemes',n:'Schemes & registrations',s:'all',go:'compliance'},
 {k:'team',n:'Team tasks',s:'all',go:'team'},
 {k:'okr',n:'OKRs & growth levers',s:['growing','scaling'],later:'Opens at ₹50 L a year'},
 {k:'pipe',n:'B2B sales pipeline',s:['early','growing','scaling'],soon:true},
 {k:'unit',n:'Unit economics by channel',s:['growing','scaling'],soon:true,later:'Opens at ₹50 L a year'},
 {k:'docs',n:'Board pack & bank CMA report',s:['growing','scaling'],soon:true,later:'Opens at ₹50 L a year'},
 {k:'round',n:'Funding round modelling',s:['scaling'],later:'Opens at ₹10 Cr a year or when you raise',goalOpen:'raise'},
 {k:'cap',n:'Cap table',s:['scaling'],later:'Opens when you take outside money',goalOpen:'raise'}
];
function modOn(m,p){return m.s==='all'||m.s.includes(p.stage)||(m.goalOpen&&p.goal===m.goalOpen)}

/* ================= plan generation ================= */
const STAGES={idea:{n:'No sales yet',d:'Testing the idea'},early:{n:'First sales',d:'Under ₹50 L a year'},growing:{n:'Growing',d:'₹50 L – ₹10 Cr a year'},scaling:{n:'Scaling',d:'Above ₹10 Cr a year'}};
const SECTORS=['D2C brand','SaaS / software','Services / agency','Food & beverage','Manufacturing','Marketplace','Edtech','Fintech','Health','Other'];
const TEAMS=['Just me','2–5','6–15','16–50','50+'];
const GOALS={first10:'Get the first 10 customers',breakeven:'Reach break-even',grow:'Double revenue',raise:'Raise funding',team:'Build the team',compliant:'Get my paperwork in order'};
const GOAL_INIT={
 first10:['Build a list of 50 target customers','Talk to 15 of them about the problem','Sign the first 10 paying customers'],
 breakeven:['Find the break-even number','Cut the 3 least useful costs','Test a 10% price increase on one product'],
 grow:['Pick 2 growth channels and test each for 2 weeks','Fix the biggest drop-off in the sales funnel','Set a monthly revenue target per channel'],
 raise:['Write a one-page investor memo','Build a list of 40 relevant investors','Send monthly investor updates for 3 months'],
 team:['Write the scorecard for the next hire','Set up a 30-60-90 day onboarding plan','Hire 1 key person'],
 compliant:['Apply for DPIIT recognition','Agree a monthly compliance routine with the CA','Register on Udyam']
};
function genPlan(p,keep){
  const st=keep||blank();st.profile=p;
  const me={id:'me',name:p.name||'You',role:'Founder',color:COLORS[0]};
  st.team=keep&&keep.team.length?keep.team:[me];
  const items=[];const add=(t,dd,kind='initiative')=>items.push({id:uid(),title:t,kind,owner:'me',due:iso(addDays(TODAY,dd)),status:'todo',comments:[]});
  (GOAL_INIT[p.goal]||GOAL_INIT.grow).forEach((t,i)=>add(t,[21,45,80][i]));
  if(p.stage==='idea'){add('Run 15 problem interviews',14);add('Work out the cost to launch',10);}
  else{add('Close the books by the 7th of every month',30);add('Review the 13-week cash forecast every Monday',7,'task');}
  if(!keep)st.items=items;else{st.items=keep.items.concat(items.filter(i=>!keep.items.some(k=>k.title===i.title)))}
  if(!keep){const fixedGuess=Math.round((p.spend||0)*0.6);st.be={price:1000,varCost:600,fixed:fixedGuess||200000}}
  if(!st.history.length&&p.stage!=='idea'){const lm=new Date(TODAY.getFullYear(),TODAY.getMonth()-1,1);st.history=[{m:mkey(lm),rev:p.rev||0,spend:p.spend||0,cash:p.cash||0}]}
  if(!st.launch.length)st.launch=[{id:uid(),n:'Company registration & legal',amt:25000},{id:uid(),n:'Website, domain & tools',amt:30000},{id:uid(),n:'First product / MVP',amt:200000},{id:uid(),n:'First inventory or setup',amt:150000},{id:uid(),n:'Marketing tests',amt:50000}];
  if(!st.first10.length)st.first10=Array.from({length:10},()=>({n:'',s:'Lead'}));
  if(p.stage==='idea')st.job={salary:p.salary||0,need:p.need||0,side:0};
  st.weeks={};
  return st;
}

function sampleState(){
  const p={name:'Ananya Rao',company:'Haldi & Co.',stage:'growing',sector:'D2C brand',team:'6–15',cash:2400000,rev:950000,spend:1290000,goal:'breakeven',sample:true};
  const st=blank();st.sample=true;st.profile=p;
  st.team=[{id:'me',name:'Ananya Rao',role:'Founder',color:COLORS[0]},{id:'t2',name:'Rohan Mehta',role:'Operations',color:COLORS[1]},{id:'t3',name:'Meera Iyer',role:'Growth',color:COLORS[2]},{id:'t4',name:'Faiz Khan',role:'Finance (part-time)',color:COLORS[4]}];
  const d=n=>iso(addDays(TODAY,n));
  st.items=[
   {id:uid(),title:'Find the break-even number',kind:'initiative',owner:'me',due:d(-3),status:'doing',comments:[{by:'t4',t:'I pulled last quarter’s cost sheet. Shipping is 14% of revenue, higher than we thought.',at:d(-5)}]},
   {id:uid(),title:'Renegotiate packaging rates with Shree Packers',kind:'initiative',owner:'t2',due:d(-6),status:'todo',comments:[]},
   {id:uid(),title:'Test a 10% price increase on the turmeric latte mix',kind:'initiative',owner:'t3',due:d(12),status:'doing',comments:[{by:'t3',t:'Running it on the website only for 2 weeks, marketplaces unchanged.',at:d(-2)}]},
   {id:uid(),title:'Cut the 3 least useful costs',kind:'initiative',owner:'me',due:d(30),status:'todo',comments:[]},
   {id:uid(),title:'Apply for DPIIT recognition',kind:'initiative',owner:'t4',due:d(40),status:'todo',comments:[]},
   {id:uid(),title:'Pause the two worst-performing ad sets',kind:'task',owner:'t3',due:d(2),status:'todo',comments:[]},
   {id:uid(),title:'Send September numbers to the CA',kind:'task',owner:'t4',due:d(-1),status:'done',comments:[]},
   {id:uid(),title:'Hire a warehouse lead',kind:'initiative',owner:'t2',due:d(75),status:'todo',comments:[]}
  ];
  st.recv=[
   {id:uid(),who:'Kirana Fresh Distributors',amt:340000,due:d(-38)},
   {id:uid(),who:'UrbanPantry (B2B)',amt:185000,due:d(-12)},
   {id:uid(),who:'Mumbai Corporate Gifting',amt:96000,due:d(9)},
   {id:uid(),who:'Café chain trial order',amt:42000,due:d(-71)}
  ];
  st.pay=[
   {id:uid(),who:'Shree Packers (packaging)',amt:210000,due:d(5)},
   {id:uid(),who:'Warehouse rent, Bhiwandi',amt:85000,due:d(23)},
   {id:uid(),who:'Ad agency retainer',amt:120000,due:d(-4)}
  ];
  const ms=[];for(let i=6;i>=1;i--)ms.push(mkey(new Date(TODAY.getFullYear(),TODAY.getMonth()-i,1)));
  const R=[720000,780000,810000,890000,910000,950000],SP=[940000,1060000,1120000,1100000,1170000,1290000],C=[3800000,3520000,3210000,3000000,2740000,2400000];
  st.history=ms.map((m,i)=>({m,rev:R[i],spend:SP[i],cash:C[i]}));
  st.be={price:650,varCost:390,fixed:650000};
  st.regs={udyam:'done',dpiit:'progress'};
  const lastW=mondayOf(addDays(TODAY,-7)),w2=mondayOf(addDays(TODAY,-14)),w3=mondayOf(addDays(TODAY,-21));
  st.streak=[iso(w3),iso(w2),iso(lastW)];
  // mark the earliest past compliance item as done for realism
  return st;
}

/* ================= weekly moves ================= */
function weekKey(){return iso(mondayOf(TODAY))}
function needsClose(){const lm=mkey(new Date(TODAY.getFullYear(),TODAY.getMonth()-1,1));return S.profile.stage!=='idea'&&!S.history.some(h=>h.m===lm)}
function genMoves(){
  const p=S.profile,f=fin(),c=[];
  if(p.stage!=='idea'){const ev=nextDue().filter(e=>e.date<=addDays(TODAY,8))[0];if(ev)c.push({t:`File ${ev.title} by ${fmtD(ev.date)}`,why:'Late fees and interest start the day after the due date.',tag:'Compliance',go:'compliance',pr:90});}
  const od=S.recv.filter(r=>!r.paid&&parseISO(r.due)<TODAY).sort((a,b)=>b.amt-a.amt)[0];
  if(od)c.push({t:`Chase ${inr(od.amt)} from ${od.who}`,why:`${days(parseISO(od.due),TODAY)} days overdue. This is money you have already earned.`,tag:'Cash',go:'cash',pr:85});
  if(f.runway<9&&p.stage!=='idea')c.push({t:`Find ${inr(f.cutFor12)} a month to cut or bring in`,why:`That takes you from ${runwayTxt(f.runway)} to 12 months of runway.`,tag:'Cash',go:'cash',pr:80});
  if(needsClose()){const lm=new Date(TODAY.getFullYear(),TODAY.getMonth()-1,1);c.push({t:`Close the books for ${MONL[lm.getMonth()]}`,why:'Three numbers: sales, spend and bank balance. Takes two minutes.',tag:'Numbers',act:'close',pr:75})}
  const oi=S.items.filter(i=>i.status!=='done'&&parseISO(i.due)<TODAY).sort((a,b)=>parseISO(a.due)-parseISO(b.due))[0];
  if(oi)c.push({t:`Unblock “${oi.title}”`,why:`It was due ${fmtD(parseISO(oi.due))}. Finish it, hand it off, or move the date.`,tag:'Plan',go:'team',pr:70});
  if(p.stage==='idea'){
    c.push({t:'Talk to 5 people who have the problem',why:'Ask how they solve it today and what it costs them. Log them in your first-10 list.',tag:'Idea',go:'plan',pr:68});
    c.push({t:'Put up a one-page site with a waitlist',why:'Measure how many strangers leave an email. It beats asking friends.',tag:'Idea',go:'plan',pr:64});
    c.push({t:'Ask 3 people to pre-pay or sign a letter of intent',why:'A payment is the clearest sign the idea works.',tag:'Sales',go:'plan',pr:62});
  }
  const gm={first10:['Message 20 people from your target list','A short, personal note. Aim for 5 conversations.','Sales','plan'],breakeven:['Check your break-even number','See how far your sales are from covering costs.','Cash','cash'],grow:['Pick one growth channel and set a 2-week test','Write down the target, the budget and the date you will judge it.','Growth','plan'],raise:['Draft this month’s investor update','The advisor can write the first draft from your numbers.','Funding','advisor'],team:['Write the scorecard for your next hire','List the 3 results this person must deliver in a year.','Team','team'],compliant:['Start your DPIIT recognition','It unlocks tax and funding benefits. The form takes about an hour.','Compliance','compliance']}[p.goal];
  if(gm)c.push({t:gm[0],why:gm[1],tag:gm[2],go:gm[3],pr:60});
  c.push({t:'Ask the advisor one question about your numbers',why:'For example: “Why is cash falling?”',tag:'Advisor',go:'advisor',pr:30});
  c.push({t:'Review the 13-week cash forecast',why:'Five minutes on Monday stops surprises on Friday.',tag:'Cash',go:'cash',pr:40});
  return c.sort((a,b)=>b.pr-a.pr).slice(0,3).map(m=>({...m,id:uid(),done:false}));
}
function thisWeek(){const k=weekKey();if(!S.weeks[k]){S.weeks[k]={moves:genMoves()};save()}return S.weeks[k]}

/* ================= render: shell ================= */
const app=document.getElementById('app');
const NAV=[['week','This week'],['cash','Cash'],['advisor','Advisor'],['plan','Plan'],['compliance','Compliance'],['team','Team']];

function render(){
  if(OB){app.innerHTML=renderOB();afterOB();return}
  if(!S||!S.profile){OB={step:0,a:{}};app.innerHTML=renderOB();afterOB();return}
  const p=S.profile;
  const overdueTasks=S.items.filter(i=>i.status!=='done'&&parseISO(i.due)<TODAY).length;
  const compHot=p.stage==='idea'?0:overdueComp().length;
  const badges={team:overdueTasks,compliance:compHot};
  const views={week:vWeek,cash:vCash,advisor:vAdvisor,plan:vPlan,compliance:vComp,team:vTeam};
  app.innerHTML=`<div class="shell">
  <aside class="rail">
    <div class="brand">${ICON.logo}<span>Growth Planner</span></div>
    <nav class="nav" aria-label="Main">${NAV.map(([k,n])=>`<button data-act="nav" data-v="${k}" ${UI.view===k?'aria-current="page"':''}>${ICON[k]}<span>${n}</span>${badges[k]?`<span class="badge">${badges[k]}</span>`:''}</button>`).join('')}</nav>
    <div class="rail-foot" style="position:relative">
      ${UI.menu?menuHTML():''}
      <div id="sync" class="sync"><i></i></div>
      <button class="co-card" data-act="menu" aria-haspopup="true" aria-expanded="${UI.menu}">
        <div class="avatar" style="background:${COLORS[0]}">${esc(initials(p.company))}</div>
        <div style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.company)}</div><div class="small muted">${STAGES[p.stage].n} · ${esc(p.sector)}</div></div>
      </button>
    </div>
  </aside>
  <main><div class="wrap">
    <div class="mobile-top"><div class="brand" style="display:flex;padding:0">${ICON.logo}<span>Growth Planner</span></div><button class="btn sm" data-act="menu-mobile">${esc(p.company)}</button></div>
    ${S.sample?`<div class="sample-bar"><span>You’re exploring a sample startup (Haldi &amp; Co.). Every number here is an example.</span><button class="btn sm primary" data-act="start-own">Build my own plan ${ICON.arrow}</button></div>`:''}
    ${views[UI.view]()}
  </div></main></div>`;
  paintSync();afterRender();
}
function menuHTML(){return `<div class="menu" role="menu">
  <button data-act="settings-page">Account and team</button>
  <button data-act="edit-answers">Edit my answers</button>
  <button data-act="export">Export my data (JSON)</button>
  <button data-act="theme">Switch light / dark</button>
  ${S.sample?'<button data-act="start-own">Back to my own plan</button>':''}
  ${GP.role==='owner'?'<button class="danger" data-act="reset">Delete my plan and start over</button>':''}
  <button data-act="logout">Sign out</button></div>`}

/* ================= view: this week ================= */
function greet(){const h=new Date().getHours();return h<5?'Working late':h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function vWeek(){
  const p=S.profile,f=fin(),wk=thisWeek(),ws=mondayOf(TODAY),we=addDays(ws,6);
  const doneN=wk.moves.filter(m=>m.done).length;
  const weekNo=isoWeek(TODAY);
  const overdue=S.items.filter(i=>i.status!=='done'&&parseISO(i.due)<TODAY).sort((a,b)=>parseISO(a.due)-parseISO(b.due));
  const follow=S.recv.filter(r=>!r.paid&&parseISO(r.due)<=addDays(TODAY,7)).sort((a,b)=>parseISO(a.due)-parseISO(b.due));
  const comps=p.stage==='idea'?[]:nextDue().slice(0,4);
  const streakN=S.streak.length;
  const cells=Array.from({length:18},(_,i)=>{const on=i<Math.min(18,isFinite(f.runway)?Math.floor(f.runway):18);const c=on?(f.runway<6?'var(--bad)':f.runway<12?'var(--warn)':'var(--good)'):'';return `<i style="${on?`background:${c}`:''}"></i>`}).join('');
  let alert='';
  if(p.stage==='idea'){const r=ideaRunway();alert=r.months<12?`<div class="alert warn">${ICON.warn}<div>Your savings cover <b>${trimN(r.months)} months</b> of building. Most founders need 12+ months before the first steady income.</div></div>`:`<div class="alert good">${ICON.tick}<div>Savings cover <b>${trimN(r.months)} months</b>. Enough time to test properly.</div></div>`}
  else if(f.runway<6)alert=`<div class="alert bad">${ICON.warn}<div><b>Cash warning.</b> At this pace the money runs out around <b>${MON[f.outDate.getMonth()]} ${f.outDate.getFullYear()}</b>. Cut or bring in ${inr(f.cutFor12)} a month to get to 12 months, or start raising now.</div></div>`;
  else if(f.runway<12)alert=`<div class="alert warn">${ICON.warn}<div>Money lasts until about <b>${MON[f.outDate.getMonth()]} ${f.outDate.getFullYear()}</b>. Closing a gap of ${inr(f.cutFor12)} a month gets you to 12 months.</div></div>`;
  else alert=`<div class="alert good">${ICON.tick}<div>${isFinite(f.runway)?'More than a year of runway. Good place to plan growth from.':'You make more than you spend each month. Nice.'}</div></div>`;
  const runwayVal=p.stage==='idea'?ideaRunway().months:f.runway;
  return `
  <header class="pagehead"><div>
    <div class="eyebrow">Week ${weekNo} · ${fmtD(ws)} – ${fmtD(we)}</div>
    <h1 style="margin-top:8px">${greet()}, ${esc((p.name||'').split(' ')[0]||'founder')}.</h1>
    <p class="lede">${doneN===3?'All three moves are done this week. Everything else can wait.':`${3-doneN} ${3-doneN===1?'move':'moves'} left this week. Each one is picked from your numbers, deadlines and goal.`}</p>
  </div>
  <div class="row" title="Weeks in a row with at least one move done"><div class="streak">${Array.from({length:8},(_,i)=>`<i class="${i<Math.min(8,streakN)?'on':''}" style="height:${10+i*3}px"></i>`).join('')}</div><div><div style="font-family:var(--f-display);font-weight:800;font-size:20px;line-height:1">${streakN}-week streak</div><div class="small muted">Weeks with a move done</div></div></div>
  </header>
  ${needsClose()?`<div class="alert warn" style="align-items:center">${ICON.warn}<div style="flex:1">It’s a new month. Close ${MONL[new Date(TODAY.getFullYear(),TODAY.getMonth()-1,1).getMonth()]} so your forecast uses real figures.</div><button class="btn sm" data-act="close">Close the month</button></div>`:''}
  <div class="grid g-main">
    <section class="card raised">
      ${movesCard(wk)}
    </section>
    <section class="card">
      <div class="card-head"><h2>Cash pulse</h2><button class="btn ghost sm" data-act="nav" data-v="cash">Forecast ${ICON.arrow}</button></div>
      <div class="eyebrow">${p.stage==='idea'?'Runway from savings':'Runway'}</div>
      <div class="runway-big num">${isFinite(runwayVal)?trimN(Math.round(runwayVal*10)/10):'∞'}<small>${isFinite(runwayVal)?'months':'cash positive'}</small></div>
      <div class="fuel" aria-hidden="true">${p.stage==='idea'?Array.from({length:18},(_,i)=>`<i style="${i<Math.floor(runwayVal)?`background:${runwayVal<12?'var(--warn)':'var(--good)'}`:''}"></i>`).join(''):cells}</div>
      <div class="fuel-scale"><span>now</span><span>6 mo</span><span>12 mo</span><span>18 mo</span></div>
      <div class="grid g-3" style="margin:16px 0;gap:10px">
        ${p.stage==='idea'?`<div class="stat"><span class="k">Savings + cheque</span><span class="v num">${inr(ideaRunway().pot)}</span></div><div class="stat"><span class="k">Monthly need</span><span class="v num">${inr(ideaRunway().burn)}</span></div><div class="stat"><span class="k">Launch cost</span><span class="v num">${inr(launchTotal())}</span></div>`
        :`<div class="stat"><span class="k">In the bank</span><span class="v num">${inr(f.cash)}</span></div><div class="stat"><span class="k">Sales / month</span><span class="v num">${inr(f.rev)}</span></div><div class="stat"><span class="k">Net burn / month</span><span class="v num" style="color:${f.net>0?'var(--bad)':'var(--good)'}">${f.net>0?inr(f.net):'+'+inr(-f.net)}</span></div>`}
      </div>
      ${alert}
    </section>
  </div>
  <div class="grid g-3">
    <section class="card">
      <div class="card-head"><h3>Overdue initiatives</h3><span class="pill ${overdue.length?'bad':'good'}">${overdue.length}</span></div>
      ${overdue.length?`<div class="list">${overdue.slice(0,4).map(i=>{const o=member(i.owner);return `<div class="li"><div class="avatar sm" style="background:${o.color}" title="${esc(o.name)}">${esc(initials(o.name))}</div><div class="grow"><div class="t">${esc(i.title)}</div><div class="small" style="color:var(--bad)">${days(parseISO(i.due),TODAY)} days late · ${esc(o.name.split(' ')[0])}</div></div><button class="btn sm ghost" data-act="snooze" data-id="${i.id}" title="Move due date one week later">+1 wk</button></div>`}).join('')}</div>`:`${emptyState('good',ICON.tick,'All caught up','Nothing overdue this week. Keep it that way.')}`}
    </section>
    <section class="card">
      <div class="card-head"><h3>${p.stage==='idea'?'Customer follow-ups':'Follow-ups due'}</h3><span class="pill">${p.stage==='idea'?S.first10.filter(c=>c.n&&c.s!=='Paid').length:follow.length}</span></div>
      ${p.stage==='idea'?(S.first10.filter(c=>c.n&&c.s!=='Paid').length?`<div class="list">${S.first10.filter(c=>c.n&&c.s!=='Paid').slice(0,4).map(c=>`<div class="li"><div class="grow"><div class="t">${esc(c.n)}</div><div class="small muted">Status: ${esc(c.s)}. Move them one step this week.</div></div></div>`).join('')}</div>`:`${emptyState('accent',ICON.team,'Start your first-10 list','Add the people you want as your first customers. They show up here to follow up.',`<button class="btn sm primary" data-act="nav" data-v="plan">Open Plan ${ICON.arrow}</button>`)}`)
      :(follow.length?`<div class="list">${follow.slice(0,4).map(r=>{const dd=days(parseISO(r.due),TODAY);return `<div class="li"><div class="grow"><div class="t">${esc(r.who)}${r.source==='zoho'?' <span class="pill" style="font-size:10px;padding:1px 7px">Zoho</span>':''}</div><div class="small" style="color:${dd>0?'var(--bad)':'var(--muted)'}">${inr(r.amt)} · ${dd>0?dd+' days overdue':dd===0?'due today':'due '+fmtD(parseISO(r.due))}</div></div><button class="btn sm" data-act="paid" data-k="recv" data-id="${r.id}">Got paid</button></div>`}).join('')}</div>`:`${emptyState('pop',ICON.cash,'No invoices due','Nothing to chase this week. Add invoices in Cash to track them.',`<button class="btn sm" data-act="nav" data-v="cash">Open Cash</button>`)}`)}
    </section>
    <section class="card">
      <div class="card-head"><h3>Coming up</h3></div>
      <div class="list">
        ${comps.map(e=>{const dd=days(TODAY,e.date);return `<div class="li"><div class="datechip ${dd<=3?'hot':dd<=10?'soon':''}"><b>${e.date.getDate()}</b><span>${MON[e.date.getMonth()]}</span></div><div class="grow"><div class="t" style="font-size:14px">${esc(e.title)}</div><div class="small muted">${dd===0?'Today':dd===1?'Tomorrow':'In '+dd+' days'}</div></div></div>`}).join('')}
        ${nudges().map(n=>`<div class="li"><div class="datechip"><b>${n.d.getDate()}</b><span>${MON[n.d.getMonth()]}</span></div><div class="grow"><div class="t" style="font-size:14px">${esc(n.t)}</div><div class="small muted">Reminder</div></div></div>`).join('')}
      </div>
    </section>
  </div>
  <section class="card">
    <div class="card-head"><div><h3>Reminders</h3><p class="small muted" style="margin-top:4px">In this preview, reminders show up on this screen. Monday email, then WhatsApp, come next.</p></div></div>
    <div class="grid g-3" style="gap:12px">
      ${[['monday','Monday plan','Your 3 moves every Monday morning'],['close','Month close','On the 1st, a 2-minute check-in with your numbers'],['review','Team review','The day before your weekly review meeting']].map(([k,t,d])=>`<label class="row" style="align-items:flex-start;gap:12px;cursor:pointer"><input type="checkbox" class="switch" id="rem-${k}" data-bind="reminders.${k}" data-type="bool" ${S.reminders[k]?'checked':''}><span><b>${t}</b><br><span class="small muted">${d}</span></span></label>`).join('')}
    </div>
  </section>`;
}
function emptyState(tone,icon,title,sub,btn=''){return `<div class="es"><div class="es-ic ${tone}">${icon}</div><b>${title}</b><span>${sub}</span>${btn}</div>`}
/* ---------- guided weekly moves ---------- */
const GO_LABEL={cash:'Open Cash',compliance:'Open Compliance',team:'Open Team',plan:'Open Plan',advisor:'Open Advisor',week:'Open'};
function howFor(m){
  const t=(m.t||'').toLowerCase();
  if(/^file /.test(t))return ['Open Compliance to see the exact form and its due date.','Send your sales and purchase details to your CA, or file it yourself on the government portal.','Come back here and tap “Mark as done”.'];
  if(/^chase /.test(t))return ['Call or WhatsApp the customer today. Mention the invoice number and the amount.','Agree a date they will pay by, or ask for part of it now.','When the money arrives, mark the invoice “Paid” in Cash.'];
  if(/a month to cut or bring in/.test(t))return ['Open Cash and look at your biggest monthly costs.','Pick one cost to cut, delay or renegotiate, or one way to bring in more cash.','Try it in the “What if…” panel to see how many months it adds.'];
  if(/close the books/.test(t))return ['Tap “Close the month” below.','Enter last month’s sales, spend and bank balance, or upload your bank statement.','Save. Your runway and forecast update straight away.'];
  if(/^unblock/.test(t))return ['Open Team and find this task.','Finish it, hand it to someone else, or move the due date.','Tick it off there once it is finished.'];
  if(/talk to 5 people/.test(t))return ['Write down 5 people who have this problem: friends of friends, LinkedIn, local groups.','Ask how they deal with it today and what it costs them. Don’t pitch yet.','Add each person to your first-10 list in Plan.'];
  if(/one-page site/.test(t))return ['Make a single page: the problem, your fix, and an email sign-up box.','Share it in 3 places where your customers already spend time.','Count the sign-ups after a week.'];
  if(/pre-pay|letter of intent/.test(t))return ['Pick the 3 people most excited about your idea.','Ask for a small advance payment or a signed letter saying they will buy.','Mark them “Paid” in your first-10 list in Plan.'];
  if(/message 20 people/.test(t))return ['Make a list of 20 people who match your ideal customer.','Send each a short, personal message asking for a 15-minute chat.','Log the replies in your first-10 list in Plan.'];
  if(/break-even/.test(t))return ['Open Cash and scroll to the break-even calculator.','Check your price, cost per order and fixed costs.','See how many orders a month you need, and how far you are.'];
  if(/growth channel/.test(t))return ['Choose one channel: ads, partnerships, marketplaces, referrals.','Write down the budget, the target and the date you will judge it.','Add it as an initiative in Plan so it has an owner and a date.'];
  if(/investor update/.test(t))return ['Open Advisor and tap “Draft my monthly investor update”.','Check the numbers and add one win and one ask.','Send it to your investors and mentors.'];
  if(/scorecard/.test(t))return ['List the 3 results this person must deliver in their first year.','Write the skills they need for those results.','Share it with your team in Team for comments.'];
  if(/dpiit/.test(t))return ['Open Compliance and find Startup India (DPIIT) recognition.','Keep your incorporation certificate and PAN ready.','Apply on the Startup India portal and set the status to “In progress”.'];
  if(/cash forecast/.test(t))return ['Open Cash and look at the week-by-week line.','Check the lowest point and when it happens.','If it dips below the dashed line, plan a fix this week.'];
  if(/advisor/.test(t))return ['Open Advisor.','Tap a suggested question or type your own.','Read the answer and note one thing to act on.'];
  return ['Open the page below.','Do what the move says.','Come back and tap “Mark as done”.'];
}
function movesCard(wk){
  const ms=wk.moves,doneN=ms.filter(m=>m.done).length,total=ms.length;
  const nextIdx=ms.findIndex(m=>!m.done);
  const openId=UI.openMove&&ms.some(m=>m.id===UI.openMove)?UI.openMove:(nextIdx>=0?ms[nextIdx].id:null);
  const coach=!S.seenMovesHelp&&doneN===0;
  return `<div class="card-head"><div><h2>This week’s 3 moves</h2><p class="small muted" style="margin-top:4px">Your to-do list for this week, picked from your numbers. Do them one at a time, top to bottom.</p></div>
      <div class="row"><button class="btn ghost sm" data-act="reroll" title="Pick new moves from your latest data">New moves</button></div></div>
    <div class="mprog" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${doneN}" aria-label="${doneN} of ${total} moves done">
      ${ms.map((m,i)=>`<i class="${m.done?'on':i===nextIdx?'now':''}"></i>`).join('')}<span>${doneN===total?'All done this week':`${doneN} of ${total} done`}</span></div>
    ${coach?`<div class="coach" role="note"><div><b>How this works</b><ol><li>Tap a move to see the steps.</li><li>Do it, using the button that takes you to the right page.</li><li>Come back and tap <b>Mark as done</b>. The next move opens.</li></ol></div><button class="btn sm ghost" data-act="coach-ok" aria-label="Dismiss help">Got it</button></div>`:''}
    <ol class="msteps">${ms.map((m,i)=>{
      const isOpen=m.id===openId,state=m.done?'done':i===nextIdx?'now':'later';
      const badge=m.done?'<span class="pill good">Done</span>':i===nextIdx?'<span class="pill accent">Do this now</span>':'<span class="pill">Up next</span>';
      return `<li class="mstep ${state} ${isOpen?'open':''}">
        <button class="mhead" data-act="move-open" data-id="${m.id}" aria-expanded="${isOpen}">
          <span class="mnum" aria-hidden="true">${m.done?ICON.tick:i+1}</span>
          <span class="mtitle"><span class="mmeta">Step ${i+1} · ${esc(m.tag)}</span><span class="t">${esc(m.t)}</span></span>
          ${badge}<span class="chev" aria-hidden="true"></span>
        </button>
        ${isOpen?`<div class="mbody">
          <p class="why">${esc(m.why)}</p>
          ${m.done?'':`<div class="how"><div class="lbl">How to do it</div><ol>${howFor(m).map(h=>`<li>${esc(h)}</li>`).join('')}</ol></div>`}
          <div class="row mact">
            ${m.done?`<button class="btn sm ghost" data-act="move" data-id="${m.id}">Undo, not done yet</button>`
              :`${m.act?`<button class="btn" data-act="${m.act}">Close the month</button>`:m.go?`<button class="btn" data-act="nav" data-v="${m.go}">${GO_LABEL[m.go]||'Open'} ${ICON.arrow}</button>`:''}
              <button class="btn primary" data-act="move" data-id="${m.id}">${ICON.tick.replace('<svg','<svg width="16" height="16"')} Mark as done</button>`}
          </div></div>`:''}
      </li>`}).join('')}</ol>
    ${doneN===total?`<div class="cleared">${ICON.tick.replace('<svg','<svg width="22" height="22"')}<span>Week cleared. See you Monday with three new moves.</span></div>`:''}`;
}
function nudges(){const out=[];const r=S.reminders;
  if(r.monday)out.push({d:addDays(mondayOf(TODAY),7),t:'Monday plan: 3 new moves'});
  if(r.close&&S.profile.stage!=='idea')out.push({d:new Date(TODAY.getFullYear(),TODAY.getMonth()+1,1),t:`Close ${MONL[TODAY.getMonth()]}`});
  if(r.review){let d=new Date(TODAY);while(d.getDay()!==r.reviewDay)d=addDays(d,1);out.push({d,t:'Weekly team review'})}
  return out.sort((a,b)=>a.d-b.d).slice(0,2)}
function member(id){return S.team.find(t=>t.id===id)||{name:'Unassigned',color:'#8792A6',id:''}}

/* ================= view: cash ================= */
function launchTotal(){const s=S.launch.reduce((a,b)=>a+(+b.amt||0),0);return Math.round(s*1.15)}
function ideaRunway(){const p=S.profile;const pot=(p.savings||0)+(p.angel||0);const burn=(p.spend||0)+(p.job==='no'?(p.need||0):0);return{pot,burn,months:burn>0?Math.max(0,(pot-launchTotal()))/burn:99}}
function vCash(){
  const p=S.profile,f=fin(),base=forecast(false),sc=forecast(true),on=anyScen();
  const end=(on?sc:base)[12].close,low=(on?sc:base).reduce((m,w,i)=>w.close<m.v?{v:w.close,i}:m,{v:Infinity,i:0});
  const s=S.scen;const monthsOpt=Array.from({length:6},(_,i)=>{const d=new Date(TODAY.getFullYear(),TODAY.getMonth()+i,1);return `<option value="${i}" ${+s.hire.month===i?'selected':''}>${MONL[d.getMonth()]}</option>`}).join('');
  const head=p.stage==='idea'?`You have ${inr(ideaRunway().pot)} to build with.`:`${inr(f.cash)} in the bank, ${isFinite(f.runway)?'about '+runwayTxt(f.runway).replace(' months','')+' months':'and growing'}.`;
  return `
  <header class="pagehead"><div><div class="eyebrow">Cash · next 13 weeks · ${fmtD(base[0].ws)} – ${fmtD(addDays(base[12].ws,6))}</div><h1 style="margin-top:8px">${head}</h1><p class="lede">A yearly forecast hides the bad weeks. This one shows every week, and lets you test a decision before you make it.</p></div>
  ${p.stage!=='idea'?`<button class="btn" data-act="close">Close a month</button>`:''}</header>
  ${p.stage==='idea'?ideaCash():''}
  <div class="grid g-main">
    <section class="card raised">
      <div class="card-head"><h2>Bank balance, week by week</h2>
        <div class="legend"><span><i style="background:var(--muted)"></i>${on?'Today’s plan':'Forecast'}</span>${on?'<span><i style="background:var(--accent)"></i>With your what-ifs</span>':''}<span><i style="background:var(--warn);height:0;border-top:2px dashed var(--warn)"></i>1 month of spend</span></div></div>
      <div class="chart-box" id="chart13"></div>
      <details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:700;color:var(--muted)">Show the weekly table</summary>
        <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Week of</th><th>Money in</th><th>Money out</th><th>Closing</th></tr></thead><tbody>
        ${(on?sc:base).map(w=>`<tr><td>${fmtD(w.ws)}</td><td>${inr(w.inflow)}</td><td>${inr(w.outflow)}</td><td style="color:${w.close<0?'var(--bad)':'inherit'};font-weight:700">${inr(w.close)}</td></tr>`).join('')}
        </tbody></table></div><p class="small muted" style="margin-top:8px">Regular sales and spend are your monthly figures spread evenly across weeks. Listed invoices and one-off bills land in the week they’re due; overdue ones are assumed next week.</p></details>
    </section>
    <section class="card">
      <div class="card-head"><h2>What if…</h2>${on?'<button class="btn ghost sm" data-act="scen-clear">Clear all</button>':''}</div>
      <div class="whatif">
        <div class="wi ${s.hire.on?'on':''}" ${s.hire.on?'':'data-off'}>
          <label class="head" for="sc-hire"><span>I hire more people</span><input type="checkbox" class="switch" id="sc-hire" data-bind="scen.hire.on" data-type="bool" ${s.hire.on?'checked':''}></label>
          <div class="ctrls">
            <div class="field"><label for="sc-hn">How many</label><input class="input" type="number" min="1" max="50" id="sc-hn" data-bind="scen.hire.n" data-type="num" data-live value="${s.hire.n}"></div>
            <div class="field"><label for="sc-hm">Starting in</label><select class="input" id="sc-hm" data-bind="scen.hire.month" data-type="num">${monthsOpt}</select></div>
            <div class="field" style="grid-column:1/-1"><label for="sc-hs">Cost per person, per month: <b class="num">${inr(s.hire.salary)}</b></label><input type="range" min="15000" max="300000" step="5000" id="sc-hs" data-bind="scen.hire.salary" data-type="num" data-live value="${s.hire.salary}"></div>
          </div>
        </div>
        <div class="wi ${s.late.on?'on':''}" ${s.late.on?'':'data-off'}>
          <label class="head" for="sc-late"><span>My biggest customer pays late</span><input type="checkbox" class="switch" id="sc-late" data-bind="scen.late.on" data-type="bool" ${s.late.on?'checked':''}></label>
          <div class="ctrls">
            <div class="field"><label for="sc-ld">Days late: <b class="num">${s.late.days}</b></label><input type="range" min="15" max="90" step="15" id="sc-ld" data-bind="scen.late.days" data-type="num" data-live value="${s.late.days}"></div>
            <div class="field"><label for="sc-ls">Their share of sales: <b class="num">${s.late.share}%</b></label><input type="range" min="5" max="80" step="5" id="sc-ls" data-bind="scen.late.share" data-type="num" data-live value="${s.late.share}"></div>
          </div>
        </div>
        <div class="wi ${s.drop.on?'on':''}" ${s.drop.on?'':'data-off'}>
          <label class="head" for="sc-drop"><span>Sales drop</span><input type="checkbox" class="switch" id="sc-drop" data-bind="scen.drop.on" data-type="bool" ${s.drop.on?'checked':''}></label>
          <div class="ctrls"><div class="field" style="grid-column:1/-1"><label for="sc-dp">Drop by: <b class="num">${s.drop.pct}%</b></label><input type="range" min="5" max="60" step="5" id="sc-dp" data-bind="scen.drop.pct" data-type="num" data-live value="${s.drop.pct}"></div></div>
        </div>
        <div class="result">
          <span class="small muted">${on?'With these changes':'If nothing changes'}, in week 13 you’ll have</span>
          <span class="big num" style="color:${end<0?'var(--bad)':'var(--ink)'}">${inr(end)}</span>
          ${on?`<span class="small" style="color:${end<base[12].close?'var(--bad)':'var(--good)'}">${end<base[12].close?inr(base[12].close-end)+' less':inr(end-base[12].close)+' more'} than today’s plan</span>`:''}
          <span class="small muted">Lowest point: <b class="num" style="color:${low.v<0?'var(--bad)':'var(--ink)'}">${inr(low.v)}</b> in the week of ${fmtD((on?sc:base)[low.i].ws)}${low.v<0?'. You would need a loan or new money before then.':''}</span>
        </div>
      </div>
    </section>
  </div>
  ${p.stage!=='idea'?`
  <div class="grid g-2">${agingCard('recv','Who owes you','Invoices waiting to be paid')}${agingCard('pay','Whom you owe','One-off bills beyond your regular monthly spend')}</div>
  <div class="grid g-main">${beCard()}${historyCard()}</div>`:''}`;
}
function ideaCash(){
  const r=ideaRunway(),lt=launchTotal(),p=S.profile;
  return `<div class="grid g-2">
   <section class="card raised"><div class="card-head"><h2>Cost to launch</h2><span class="pill accent num">${inr(lt)} with 15% buffer</span></div>
    <div class="list">${S.launch.map(l=>`<div class="li"><input class="input" style="flex:1.6" id="ln-${l.id}" value="${esc(l.n)}" data-arr="launch" data-id="${l.id}" data-f="n" aria-label="Cost item"><div class="money" style="flex:1"><span class="pre">₹</span><input class="input num" type="number" id="la-${l.id}" value="${l.amt}" data-arr="launch" data-id="${l.id}" data-f="amt" data-type="num" data-live aria-label="Amount"></div><button class="btn ghost sm" data-act="del" data-k="launch" data-id="${l.id}" aria-label="Remove">✕</button></div>`).join('')}</div>
    <button class="btn sm" style="margin-top:10px" data-act="add-launch">Add a cost</button>
   </section>
   <section class="card"><div class="card-head"><h2>Runway from savings</h2></div>
    <div class="grid g-2" style="gap:12px">
      <div class="field"><label for="i-sav">Savings set aside</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="0.5" id="i-sav" data-bind="profile.savings" data-type="lakh" data-live value="${(p.savings||0)/1e5}"><span class="suf">L</span></div></div>
      <div class="field"><label for="i-ang">Angel / family cheque</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="0.5" id="i-ang" data-bind="profile.angel" data-type="lakh" data-live value="${(p.angel||0)/1e5}"><span class="suf">L</span></div></div>
      <div class="field"><label for="i-sp">Business spend / month</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="0.1" id="i-sp" data-bind="profile.spend" data-type="lakh" data-live value="${(p.spend||0)/1e5}"><span class="suf">L</span></div></div>
      <div class="field"><label for="i-nd">Your personal need / month</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="0.1" id="i-nd" data-bind="profile.need" data-type="lakh" data-live value="${(p.need||0)/1e5}"><span class="suf">L</span></div></div>
    </div>
    <div class="result" style="margin-top:14px"><span class="small muted">After paying the launch cost, the money lasts</span><span class="big num">${r.months>=99?'—':trimN(Math.round(r.months*10)/10)+' months'}</span><span class="small muted">${p.job==='no'?'Includes your personal spending, since you’re full-time on this.':'You still have a salary, so only business spend counts.'}</span></div>
   </section></div>`;
}
function agingCard(k,title,sub){
  const rows=S[k].filter(r=>!r.paid);const tot=rows.reduce((a,b)=>a+b.amt,0);
  const B=[['Not due','var(--good)'],['1–30 days','var(--pop)'],['31–60','var(--warn)'],['60+ days','var(--bad)']];
  const bucket=r=>{const d=days(parseISO(r.due),TODAY);return d<=0?0:d<=30?1:d<=60?2:3};
  const sums=[0,0,0,0];rows.forEach(r=>sums[bucket(r)]+=r.amt);
  return `<section class="card"><div class="card-head"><div><h2>${title}</h2><p class="small muted">${sub}</p></div><span class="stat" style="text-align:right"><span class="v num">${inr(tot)}</span></span></div>
   <div class="aging">${sums.map((s,i)=>s?`<i style="width:${s/tot*100}%;background:${B[i][1]}" title="${B[i][0]}: ${inr(s)}"></i>`:'').join('')}</div>
   <div class="aging-key">${B.map((b,i)=>`<span><i style="background:${b[1]}"></i>${b[0]} <b class="num">${inr(sums[i])}</b></span>`).join('')}</div>
   <div class="list" style="margin-top:10px">${rows.length?rows.sort((a,b)=>parseISO(a.due)-parseISO(b.due)).map(r=>{const d=days(parseISO(r.due),TODAY);return `<div class="li"><div class="grow"><div class="t">${esc(r.who)}${r.source==='zoho'?' <span class="pill" style="font-size:10px;padding:1px 7px">Zoho</span>':''}</div><div class="small" style="color:${d>0?(d>60?'var(--bad)':'var(--warn)'):'var(--muted)'}">${d>0?d+' days overdue':d===0?'Due today':'Due '+fmtD(parseISO(r.due))}</div></div><b class="num">${inr(r.amt)}</b><button class="btn sm ghost" data-act="paid" data-k="${k}" data-id="${r.id}">${k==='recv'?'Paid':'Done'}</button></div>`}).join(''):`<div class="empty">Nothing here yet.</div>`}</div>
   <form class="addrow" data-form="${k}"><input class="input" id="${k}-who" name="who" placeholder="${k==='recv'?'Customer':'Supplier'}" required aria-label="Name"><div class="money"><span class="pre">₹</span><input class="input num" id="${k}-amt" name="amt" type="number" placeholder="0" required aria-label="Amount"></div><input class="input" id="${k}-due" name="due" type="date" value="${iso(addDays(TODAY,15))}" aria-label="Due date"><button class="btn primary">Add</button></form>
  </section>`;
}
function beCard(){
  const b=S.be,p=S.profile;const cm=b.price-b.varCost;const units=cm>0?b.fixed/cm:Infinity;const rev=units*b.price;
  const cur=b.price>0?(p.rev||0)/b.price:0;const pct=isFinite(units)&&units>0?cur/units*100:0;
  return `<section class="card raised"><div class="card-head"><h2>Break-even calculator</h2><span class="pill ${pct>=100?'good':'warn'}">${pct>=100?'Above break-even':Math.round(pct)+'% of the way'}</span></div>
   <div class="grid g-3" style="gap:12px">
    <div class="field"><label for="be-p">Average price per order</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" id="be-p" data-bind="be.price" data-type="num" data-live value="${b.price}"></div></div>
    <div class="field"><label for="be-v">Direct cost per order</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" id="be-v" data-bind="be.varCost" data-type="num" data-live value="${b.varCost}"></div></div>
    <div class="field"><label for="be-f">Fixed costs per month</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" id="be-f" data-bind="be.fixed" data-type="num" data-live value="${b.fixed}"></div></div>
   </div>
   <p class="small muted" style="margin-top:8px">Direct cost is what each sale costs you: product, packaging, shipping, payment fees. Fixed costs are salaries, rent and tools.</p>
   ${cm<=0?`<div class="alert bad" style="margin-top:12px">${ICON.warn}<div>Each order costs more than it earns. Raise the price or cut direct costs before chasing volume.</div></div>`:`
   <div class="grid g-3" style="margin-top:16px;gap:10px">
    <div class="stat"><span class="k">You keep per order</span><span class="v num">${inr(cm)}</span></div>
    <div class="stat"><span class="k">Orders needed / month</span><span class="v num">${Math.ceil(units).toLocaleString('en-IN')}</span></div>
    <div class="stat"><span class="k">Sales needed / month</span><span class="v num">${inr(rev)}</span></div>
   </div>
   <div class="be-meter"><i style="width:${clamp(pct,2,100)}%"></i></div>
   <div class="spread small muted"><span>Today: about ${Math.round(cur).toLocaleString('en-IN')} orders (${inr(p.rev||0)})</span><span>${pct>=100?'Covered':inr(Math.max(0,rev-(p.rev||0)))+' to go'}</span></div>
   <p class="small" style="margin-top:10px">A <b>₹${Math.round(b.price*0.1).toLocaleString('en-IN')}</b> price increase (10%) would cut the orders you need to <b>${cm+b.price*0.1>0?Math.ceil(b.fixed/(cm+b.price*0.1)).toLocaleString('en-IN'):'—'}</b>.</p>`}
  </section>`;
}
function ago(t){if(!t)return 'never';const m=Math.round((Date.now()-new Date(t))/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'}
function zohoBlock(){
  const z=GP.zoho||{},owner=GP.role==='owner';const others=`<div class="connect" style="margin-top:8px">${['Tally','Razorpay','Shopify'].map(n=>`<span>${n} <span class="soon">Soon</span></span>`).join('')}</div>`;
  if(S&&S.sample)return `<div class="connect"><span>Zoho Books <span class="soon">Your own plan only</span></span></div>`+others;
  if(z.connected)return `<div class="zoho"><div class="row" style="gap:8px"><span class="pill good">Zoho Books connected</span><span class="small muted">${esc(z.org||'')} · synced ${ago(z.lastSyncAt)}</span></div>
    ${z.lastError?`<div class="small" style="color:var(--bad);margin-top:6px">${esc(z.lastError)}</div>`:''}
    ${z.lastResult&&!z.lastError&&!z.lastResult.skipped?`<div class="small muted" style="margin-top:6px">Last sync: ${z.lastResult.invoices??0} unpaid invoices, ${z.lastResult.bills??0} bills${z.lastResult.cash!=null?', bank balance '+inr(z.lastResult.cash):''}, ${z.lastResult.months??0} months of sales and spend.</div>`:''}
    <div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="zoho-sync" ${UI.zohoBusy?'disabled':''}>${UI.zohoBusy?'Syncing…':'Sync now'}</button>${owner?'<button type="button" class="btn sm ghost" data-act="zoho-off">Disconnect</button>':''}</div></div>`+others;
  if(!z.configured)return `<div class="connect"><span>Zoho Books <span class="soon">Not set up on this server</span></span></div>`+others;
  return owner?`<div class="zoho"><a class="btn sm primary" href="/api/zoho/connect">Connect Zoho Books</a><div class="small muted" style="margin-top:6px">Read-only. Pulls unpaid invoices and bills, your bank balance, and six months of sales and spend. Syncs every morning.</div></div>`+others
    :`<div class="small muted">Ask the account owner to connect Zoho Books.</div>`+others;
}
async function refreshFromServer(){const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)return;const j=await r.json();serverVersion=j.version;if(!S||!S.sample)S=j.state;GP.zoho=j.zoho;render();paintSync()}
function historyCard(){
  const h=S.history.slice(-6);
  return `<section class="card"><div class="card-head"><h2>Month by month</h2><button class="btn sm" data-act="close">Close a month</button></div>
   ${h.length>1?`<div id="spark" class="chart-box" style="min-height:150px"></div>`:''}
   <div class="tbl-wrap"><table><thead><tr><th>Month</th><th>Sales</th><th>Spend</th><th>Bank</th></tr></thead><tbody>${h.slice().reverse().map(r=>`<tr><td>${mlabel(r.m)}</td><td>${inr(r.rev)}</td><td>${inr(r.spend)}</td><td><b>${inr(r.cash)}</b></td></tr>`).join('')}</tbody></table></div>
   <div style="margin-top:14px"><div class="lbl" style="margin-bottom:6px">Update automatically</div>${zohoBlock()}</div>
  </section>`;
}

/* ================= view: plan ================= */
function vPlan(){
  const p=S.profile;
  const byQ={};S.items.filter(i=>i.kind==='initiative').sort((a,b)=>parseISO(a.due)-parseISO(b.due)).forEach(i=>{const q=fyQuarter(parseISO(i.due));(byQ[q.label]=byQ[q.label]||{q,items:[]}).items.push(i)});
  const on=MODS.filter(m=>modOn(m,p)),off=MODS.filter(m=>!modOn(m,p));
  return `
  <header class="pagehead"><div><div class="eyebrow">Your plan · ${esc(p.company)}</div><h1 style="margin-top:8px">${esc(GOALS[p.goal]||'Grow')}${p.goal==='raise'?'.':' in the next 6 months.'}</h1>
   <div class="row" style="margin-top:12px"><span class="pill accent">${STAGES[p.stage].n}</span><span class="pill">${esc(p.sector)}</span><span class="pill">Team: ${esc(p.team)}</span></div></div>
   <button class="btn" data-act="edit-answers">Edit answers</button></header>
  ${p.stage==='idea'?noSalesPath():''}
  <section class="card raised">
   <div class="card-head"><h2>Initiatives</h2><span class="small muted">Grouped by Indian financial-year quarter</span></div>
   ${Object.values(byQ).map(g=>`<div class="qtr" style="margin-bottom:14px"><div class="month-h">${g.q.label} · ${g.q.range}</div>
    ${g.items.map(i=>{const late=i.status!=='done'&&parseISO(i.due)<TODAY;return `<div class="item ${i.status==='done'?'done':''}">
      <button class="check ${i.status==='done'?'on':''}" style="width:24px;height:24px" data-act="toggle-item" data-id="${i.id}" aria-label="Mark done">${ICON.tick}</button>
      <div><div class="t">${esc(i.title)}</div>${late?`<span class="small" style="color:var(--bad)">${days(parseISO(i.due),TODAY)} days late</span>`:''}</div>
      <select class="input" id="own-${i.id}" data-arr="items" data-id="${i.id}" data-f="owner" aria-label="Owner">${S.team.map(t=>`<option value="${t.id}" ${t.id===i.owner?'selected':''}>${esc(t.name)}</option>`).join('')}</select>
      <input class="input" type="date" id="due-${i.id}" data-arr="items" data-id="${i.id}" data-f="due" value="${i.due}" aria-label="Due date">
    </div>`}).join('')}</div>`).join('')||'<div class="empty">No initiatives yet.</div>'}
   <form class="row" data-form="initiative" style="margin-top:6px"><input class="input" style="flex:1;min-width:200px" name="t" id="new-init" placeholder="Add an initiative, e.g. Launch on Amazon" required><button class="btn primary">Add</button></form>
  </section>
  <section class="card">
   <div class="card-head"><div><h2>Screens for your stage</h2><p class="small muted" style="margin-top:4px">You see only what fits a ${STAGES[p.stage].n.toLowerCase()} company. The rest opens as you grow.</p></div><span class="pill accent">${on.length} on · ${off.length} later</span></div>
   <div class="mods">${on.map(m=>`<div class="mod on"><div class="spread"><span class="nm">${m.n}</span>${m.soon?'<span class="soon">Soon</span>':'<span class="pill good">On</span>'}</div>${m.go?`<button class="btn sm ghost" style="align-self:flex-start;padding-left:0" data-act="nav" data-v="${m.go}">Open ${ICON.arrow}</button>`:'<span class="why">Below on this page</span>'}</div>`).join('')}
   ${off.map(m=>`<div class="mod"><div class="spread"><span class="nm" style="color:var(--muted)">${m.n}</span><span class="pill">Later</span></div><span class="why">${m.later||''}</span></div>`).join('')}</div>
  </section>`;
}
function noSalesPath(){
  const checks=[['problem','Wrote the problem in one sentence'],['talk15','Talked to 15 people who have the problem'],['workaround','Found 3 who already pay for a workaround'],['landing','Put up a landing page or waitlist'],['preorder','Got 5 pre-orders or letters of intent'],['compete','Know who else solves this and how']];
  const ck=checks.filter(c=>S.ideaChecks[c[0]]).length;const paid=S.first10.filter(c=>c.s==='Paid').length;
  const r=ideaRunway();const j=S.job;const p=S.profile;
  const needAll=(p.need||0)+(p.spend||0);const monthsIfQuit=needAll>0?Math.max(0,r.pot-launchTotal())/Math.max(1,needAll-(j.side||0)):0;
  const sig=[[monthsIfQuit>=12,`12+ months of money if you quit`,`You’d have ${trimN(Math.round(monthsIfQuit*10)/10)} months.`],[paid>=10||(j.side||0)>=0.3*(p.need||1),'10 paying customers, or side income covering 30% of your needs',`${paid} paying so far.`],[ck>=4,'At least 4 of 6 idea checks done',`${ck} of 6 done.`]];
  const sigN=sig.filter(s=>s[0]).length;
  return `<section class="card raised"><div class="card-head"><div><h2>The no-sales path</h2><p class="small muted" style="margin-top:4px">Five steps from idea to first revenue. Do them in order.</p></div><span class="pill pop">No sales yet</span></div>
  <div class="path">
   <div class="step ${ck>=4?'ok':''}"><div class="dot">${ck>=4?ICON.tick.replace('<svg','<svg width="20" height="20"'):1}</div><div class="body"><h3>Test the idea</h3><p class="small muted">${ck} of 6 done · Tick each one once it’s true for you. Tap the circle or the words.</p>
     <div class="checklist">${checks.map(([k,t])=>`<label class="cl"><button class="check ${S.ideaChecks[k]?'on':''}" data-act="idea-check" data-k="${k}" aria-pressed="${!!S.ideaChecks[k]}" aria-label="${esc(t)}">${ICON.tick}</button>${t}</label>`).join('')}</div></div></div>
   <div class="step ${launchTotal()>0?'ok':''}"><div class="dot">${launchTotal()>0?ICON.tick.replace('<svg','<svg width="20" height="20"'):2}</div><div class="body"><h3>Know the cost to launch</h3><p class="small muted">${inr(launchTotal())} including a 15% buffer. <button class="btn sm ghost" data-act="nav" data-v="cash">Edit in Cash</button></p></div></div>
   <div class="step ${paid>=10?'ok':''}"><div class="dot">${paid>=10?ICON.tick.replace('<svg','<svg width="20" height="20"'):3}</div><div class="body"><h3>Find the first 10 customers</h3><p class="small muted">${paid} paid · ${S.first10.filter(c=>c.n).length} on the list</p>
     <div class="tenhelp">Write down people or companies who could buy. As you talk to them, move each one along: <b>Lead</b> (on your list) → <b>Talked</b> (had a conversation) → <b>Trial</b> (trying it) → <b>Paid</b>.</div>
     <div class="tensum">${['Lead','Talked','Trial','Paid'].map(st=>`<span class="ts ${st.toLowerCase()}">${st} <b>${S.first10.filter(c=>c.n&&c.s===st).length}</b></span>`).join('')}</div>
     <div class="ten">${S.first10.map((c,i)=>`<div class="slot ${c.s==='Paid'?'paid':''}"><span class="no">${i+1}</span><input id="f10-${i}" data-ten="${i}" data-f="n" value="${esc(c.n)}" placeholder="Name or company" aria-label="Customer ${i+1}"><div class="stg" role="group" aria-label="Stage for customer ${i+1}">${['Lead','Talked','Trial','Paid'].map(st=>`<button type="button" class="${c.s===st?'on '+st.toLowerCase():''}" data-act="ten-stage" data-i="${i}" data-s="${st}" aria-pressed="${c.s===st}">${st}</button>`).join('')}</div></div>`).join('')}</div></div></div>
   <div class="step ${r.months>=12?'ok':''}"><div class="dot">${r.months>=12?ICON.tick.replace('<svg','<svg width="20" height="20"'):4}</div><div class="body"><h3>Check your runway</h3><p class="small muted">${r.months>=99?'Add your monthly spend in Cash to see this.':`Savings cover about ${trimN(Math.round(r.months*10)/10)} months after launch costs.`}</p></div></div>
   <div class="step ${sigN===3?'ok':''}"><div class="dot">${sigN===3?ICON.tick.replace('<svg','<svg width="20" height="20"'):5}</div><div class="body"><h3>Decide when to quit the job</h3>
     ${p.job==='no'?`<p class="small muted">You’re already full-time on this.</p>`:`
     <div class="grid g-3" style="gap:10px;margin-top:10px">
      <div class="field"><label for="j-s">Your salary / month</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" id="j-s" data-bind="job.salary" data-type="num" data-live value="${j.salary||0}"></div></div>
      <div class="field"><label for="j-n">Personal need / month</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="0.1" id="j-n" data-bind="profile.need" data-type="lakh" data-live value="${(p.need||0)/1e5}"><span class="suf">L</span></div></div>
      <div class="field"><label for="j-x">Side income / month</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" id="j-x" data-bind="job.side" data-type="num" data-live value="${j.side||0}"></div></div>
     </div>
     <div class="signals">${sig.map(s=>`<div class="sig"><span class="ic" style="background:${s[0]?'var(--good)':'var(--line)'}">${s[0]?'✓':''}</span><div><b>${s[1]}</b><br><span class="muted small">${s[2]}</span></div></div>`).join('')}</div>
     <div class="alert ${sigN===3?'good':'warn'}" style="margin-top:12px">${sigN===3?ICON.tick:ICON.warn}<div>${sigN===3?'All three signals are green. This is a reasonable time to go full-time.':`${sigN} of 3 signals are green. Keep the job a little longer and work on the grey ones.`} This is a rule of thumb, not a verdict.</div></div>`}
   </div></div>
  </div></section>`;
}

/* ================= view: advisor ================= */
function ctxText(){
  const p=S.profile,f=fin();const L=[];
  L.push(`Company: ${p.company} | Founder: ${p.name} | Stage: ${STAGES[p.stage].n} (${STAGES[p.stage].d}) | Sector: ${p.sector} | Team: ${p.team} | Main goal (6 months): ${GOALS[p.goal]}`);
  if(p.stage==='idea'){const r=ideaRunway();L.push(`Savings set aside ${inr(p.savings||0)}, angel/family cheque ${inr(p.angel||0)}, business spend ${inr(p.spend||0)}/month, personal need ${inr(p.need||0)}/month, still employed: ${p.job==='yes'?'yes':'no'}. Launch cost estimate ${inr(launchTotal())}. Runway after launch ${trimN(r.months)} months.`);
    L.push(`Idea checks done: ${Object.keys(S.ideaChecks).filter(k=>S.ideaChecks[k]).join(', ')||'none'}. First-10 list: ${S.first10.filter(c=>c.n).map(c=>c.n+' ('+c.s+')').join('; ')||'empty'}.`)}
  else{L.push(`Bank balance ${inr(f.cash)}. Monthly sales ${inr(f.rev)}. Monthly spend ${inr(f.spend)}. Net burn ${inr(f.net)}/month. Runway ${runwayTxt(f.runway)}.`);
    if(S.history.length)L.push('Monthly history (month: sales / spend / closing bank): '+S.history.slice(-6).map(h=>`${mlabel(h.m)}: ${inr(h.rev)} / ${inr(h.spend)} / ${inr(h.cash)}`).join('; '));
    const rv=S.recv.filter(r=>!r.paid);if(rv.length)L.push('Unpaid customer invoices: '+rv.map(r=>`${r.who} ${inr(r.amt)} (${days(parseISO(r.due),TODAY)>0?days(parseISO(r.due),TODAY)+' days overdue':'due '+fmtD(parseISO(r.due))})`).join('; '));
    const py=S.pay.filter(r=>!r.paid);if(py.length)L.push('Bills to pay: '+py.map(r=>`${r.who} ${inr(r.amt)} due ${fmtD(parseISO(r.due))}`).join('; '));
    const b=S.be;L.push(`Break-even inputs: avg price ${inr(b.price)}, direct cost per order ${inr(b.varCost)}, fixed costs ${inr(b.fixed)}/month.`);
    const nd=nextDue().slice(0,4);if(nd.length)L.push('Next compliance dates: '+nd.map(e=>`${e.title} on ${fmtD(e.date)}`).join('; '));}
  L.push('Open initiatives: '+S.items.filter(i=>i.status!=='done').map(i=>`${i.title} (owner ${member(i.owner).name}, due ${fmtD(parseISO(i.due))}${parseISO(i.due)<TODAY?', OVERDUE':''})`).join('; '));
  return L.join('\n');
}
const ADV_SYS=`You are the advisor inside Growth Planner, helping a first-time Indian startup founder who has no CFO or consultant. Answer from THEIR numbers below. Use ₹ with lakh (L) and crore (Cr). Lead with the answer in one or two sentences, then give 2–4 specific reasons or steps that cite their figures. Keep it under 200 words unless they ask you to draft something (investor update, SOP, email, pitch feedback). For tax, legal or filing specifics, say to confirm with their CA. If the data cannot answer the question, say exactly which number you would need. Plain text only: short paragraphs and "- " bullets, **bold** allowed, no headings, no tables.`;
function vAdvisor(){
  const p=S.profile;const isIdea=p.stage==='idea';
  const Q=isIdea?[['Launch','Is my idea ready to launch?'],['Customers','How should I find my first 10 customers?'],['Career','When should I quit my job?'],['Money','What should I spend my savings on first?'],['Draft','Write a script for customer interviews'],['Pitch','Critique my pitch: ']]
    :[['Pricing','Should I raise prices?'],['Cash','Why is cash falling?'],['Draft','Draft my monthly investor update'],['Costs','Which costs should I cut first?'],['Process','Write an SOP for closing the books each month'],['Pitch','Critique my pitch: ']];
  const avail=UI.sampleOk!==false;const f=fin();
  const tiles=isIdea?[['Savings + cheque',inr(ideaRunway().pot)],['Launch cost',inr(launchTotal())],['Idea checks',Object.values(S.ideaChecks).filter(Boolean).length+' / 6'],['First-10 list',S.first10.filter(c=>c.n).length+' names']]
    :[['Bank',inr(f.cash)],['Sales / month',inr(f.rev)],['Spend / month',inr(f.spend)],['Runway',isFinite(f.runway)?trimN(Math.round(f.runway*10)/10)+' mo':'∞'],['Unpaid invoices',S.recv.filter(r=>!r.paid).length],['Deadlines ahead',Math.min(4,nextDue().length)]];
  return `<header class="pagehead"><div><div class="eyebrow">Advisor</div><h1 style="margin-top:8px">Ask anything about your numbers.</h1><p class="lede">It reads your cash, sales, invoices, deadlines and plan before it answers, so the advice is about your company, not a template.</p></div>${S.chat.length?'<button class="btn" data-act="chat-clear">New conversation</button>':''}</header>
  <div class="grid g-main">
   <section class="card raised stack">
    <div class="chat" id="chat">${S.chat.length?S.chat.map((m,i)=>`<div class="msg ${m.role==='user'?'u':'a'}">${m.role==='user'?esc(m.content).replace(/\n/g,'<br>'):md(m.content)}${m.role!=='user'&&m.content?`<div class="tools"><button class="btn sm ghost" data-act="copy" data-i="${i}">Copy</button></div>`:''}</div>`).join('')
     :`<div class="adv-hero"><div class="orb">${ICON.advisor}</div><h2>What would you like to know, ${esc((p.name||'').split(' ')[0]||'founder')}?</h2><p>Every answer uses ${esc(p.company)}’s own numbers. Pick a question or type your own below.</p></div>
       <div class="qgrid">${Q.map(([c,q],i)=>`<button class="qcard" data-act="sug" data-q="${esc(q)}"><span class="qtag c${i%4}">${c}</span><span class="qt">${esc(q.replace(/: $/,'…'))}</span><span class="qa">${ICON.arrow}</span></button>`).join('')}</div>`}
    ${UI.busy?`<div class="msg a" id="stream"><span class="typing"><i></i><i></i><i></i></span></div>`:''}</div>
    ${!avail?`<div class="alert warn">${ICON.warn}<div>The advisor isn’t switched on for this server yet. The site owner needs to add an Anthropic API key.</div></div>`:''}
    <form class="composer" data-form="ask"><textarea id="ask" name="q" rows="1" placeholder="e.g. What if I hire a sales person next month?" aria-label="Ask the advisor">${esc(UI.draft||'')}</textarea>${UI.busy?'<button type="button" class="btn" data-act="stop">Stop</button>':'<button class="btn primary">Ask</button>'}</form>
    ${S.chat.length?`<div class="sugs">${Q.slice(0,4).map(([c,q])=>`<button class="sug" data-act="sug" data-q="${esc(q)}">${esc(q.replace(/: $/,'…'))}</button>`).join('')}</div>`:''}
   </section>
   <aside class="card stack" style="align-self:start">
    <div class="sees-h"><h3>What the advisor sees</h3><span class="live"><i></i>Live</span></div>
    <div class="tiles">${tiles.map(([k,v])=>`<div class="tile"><div class="k"><i></i>${k}</div><div class="v">${v}</div></div>`).join('')}<div class="tile wide"><div class="k"><i style="background:var(--pop)"></i>Open initiatives</div><div class="v">${S.items.filter(i=>i.status!=='done').length}</div></div></div>
    <div class="privacy">${ICON.compliance}<div>Nothing is stored by the advisor. Each question sends this summary along with it. It is not a CA or lawyer, so confirm tax and legal steps with one.</div></div>
   </aside>
  </div>`;
}
function md(t){const e=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');const blocks=e.split(/\n{2,}/);return blocks.map(b=>{const lines=b.split('\n');if(lines.every(l=>/^\s*[-•]\s+/.test(l)))return '<ul>'+lines.map(l=>'<li>'+l.replace(/^\s*[-•]\s+/,'')+'</li>').join('')+'</ul>';return '<p>'+lines.map(l=>/^\s*[-•]\s+/.test(l)?'• '+l.replace(/^\s*[-•]\s+/,''):l).join('<br>')+'</p>'}).join('')}
let abortCtl=null;
async function ask(q){
  q=q.trim();if(!q||UI.busy)return;
  S.chat.push({role:'user',content:q});UI.busy=true;UI.draft='';rerender();scrollChat();
  const turns=S.chat.map((m,i)=>({role:m.role,content:i===0?`FOUNDER DATA (today is ${fmtDW(TODAY)} ${TODAY.getFullYear()}):\n${ctxText()}\n\nQUESTION: ${m.content}`:(i===S.chat.length-1?`(Latest data again for reference)\n${ctxText()}\n\nQUESTION: ${m.content}`:m.content)}));
  abortCtl=new AbortController();
  try{
    const r=await fetch('/api/advisor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:turns}),signal:abortCtl.signal});
    if(r.status===401){location.href='/login';return}
    if(!r.ok){const j=await r.json().catch(()=>({}));if(r.status===503)UI.sampleOk=false;throw {msg:j.error}}
    const rd=r.body.getReader(),dec=new TextDecoder();let text='';
    for(;;){const {done,value}=await rd.read();if(done)break;text+=dec.decode(value,{stream:true});const el=document.getElementById('stream');if(el){el.innerHTML=md(text);scrollChat()}}
    S.chat.push({role:'assistant',content:text||'No answer came back. Try asking again.'});
  }catch(err){
    const el=document.getElementById('stream');const partial=el&&err&&err.name==='AbortError'?el.innerText:'';
    if(UI.sampleOk===false)S.chat.pop();
    else S.chat.push({role:'assistant',content:err&&err.name==='AbortError'?(partial?partial+'\n\n(Stopped.)':'(Stopped.)'):(err&&err.msg)||'Something went wrong getting an answer. Try asking again.'});
  }
  S.chat=S.chat.slice(-20);UI.busy=false;abortCtl=null;save();rerender();scrollChat();
}
function scrollChat(){const c=document.getElementById('chat');if(c){const last=c.lastElementChild;last&&last.scrollIntoView({block:'nearest'})}}

/* ================= view: compliance ================= */
function vComp(){
  const p=S.profile;const all=compEvents();const nd=nextDue();const first=nd[0];
  const types=['All','GST','TDS','Payroll','ROC','Tax'];
  const shown=all.filter(e=>UI.compFilter==='All'||e.type===UI.compFilter);
  const groups={};shown.forEach(e=>{const k=mkey(e.date);(groups[k]=groups[k]||[]).push(e)});
  const fy=fyQuarter(TODAY).fy;
  return `<header class="pagehead"><div><div class="eyebrow">Compliance · India · FY ${fy-1}–${String(fy).slice(2)}</div><h1 style="margin-top:8px">${p.stage==='idea'?'Register first. Filings come later.':'Never pay a late fee again.'}</h1><p class="lede">${p.stage==='idea'?'Before your first sale, focus on the right registrations and the schemes that pay founders like you. The filing calendar below starts once you register for GST or hire.':'Every GST, TDS, PF/ESI, ROC and income-tax date for a private limited company, plus the schemes that can put money back in your pocket.'}</p></div></header>
  ${first&&p.stage!=='idea'?`<section class="card raised"><div class="nextdue"><div class="countdown num">${days(TODAY,first.date)===0?'Today':days(TODAY,first.date)+'d'}</div><div style="flex:1;min-width:200px"><div class="eyebrow">Next deadline</div><h2 style="margin-top:4px">${esc(first.title)}</h2><p class="muted small">${fmtDW(first.date)} · ${esc(first.note)}</p></div><button class="btn primary" data-act="comp-done" data-id="${first.id}">Mark filed</button></div>
   ${overdueComp().length?`<div class="alert bad" style="margin-top:14px">${ICON.warn}<div><b>${overdueComp().length} past ${overdueComp().length===1?'date is':'dates are'} not marked filed.</b> If they’re done, tick them below. If not, file today to keep interest small.</div></div>`:''}</section>`:''}
  <div class="grid g-main">
   <section class="card">
    <div class="card-head"><h2>Calendar</h2><div class="filters">${types.map(t=>`<button class="chip" data-act="comp-filter" data-v="${t}" aria-pressed="${UI.compFilter===t}">${t}</button>`).join('')}</div></div>
    ${Object.entries(groups).map(([k,evs])=>`<div class="month-h">${MONL[+k.split('-')[1]-1]} ${k.split('-')[0]}</div>${evs.map(e=>{const dd=days(TODAY,e.date);const done=!!S.compDone[e.id];return `<div class="ev ${done?'done':''}"><div class="datechip ${!done&&dd<0?'hot':!done&&dd<=7?'soon':''}"><b>${e.date.getDate()}</b><span>${WD[e.date.getDay()]}</span></div><div class="grow"><div class="row" style="gap:8px"><span class="tag ${e.type}">${e.type}</span><span class="t" style="font-weight:600">${esc(e.title)}</span></div><div class="small muted">${esc(e.note)}${!done&&dd<0?` · <b style="color:var(--bad)">${-dd} days late</b>`:''}</div></div><button class="check ${done?'on':''}" data-act="comp-done" data-id="${e.id}" aria-pressed="${done}" aria-label="Mark filed">${ICON.tick}</button></div>`}).join('')}`).join('')}
    <p class="small muted" style="margin-top:14px">Typical due dates for a monthly GST filer. The government often extends dates, and some depend on your AGM date or state. Confirm with your CA.</p>
   </section>
   <aside class="card stack">
    <h3>Rules of thumb</h3>
    <div class="list small">
     <div class="li"><div class="grow"><b>GST registration</b><br><span class="muted">Needed above ₹40 L turnover for goods or ₹20 L for services (lower in some states), and for most online selling.</span></div></div>
     <div class="li"><div class="grow"><b>PF</b><br><span class="muted">Required once you have 20 or more employees.</span></div></div>
     <div class="li"><div class="grow"><b>ESI</b><br><span class="muted">Required at 10 or more employees in most states.</span></div></div>
     <div class="li"><div class="grow"><b>TDS</b><br><span class="muted">Deduct on salaries, rent, contractor and professional fees above the limits, and deposit by the 7th.</span></div></div>
    </div>
   </aside>
  </div>
  <section class="card">
   <div class="card-head"><div><h2>Registrations & schemes</h2><p class="small muted" style="margin-top:4px">Track where you are with each. The tag shows which ones fit a company at your stage.</p></div></div>
   <div class="schemes">${SCHEMES.map(s=>`<div class="scheme"><div class="spread"><h3>${s.n}</h3>${s.fit(p)?'<span class="pill good">Fits you</span>':''}</div><p>${s.d}</p><div class="foot">${s.url?`<a href="${s.url}" target="_blank" rel="noopener">Official site ↗</a>`:'<span></span>'}<select id="reg-${s.k}" data-bind="regs.${s.k}" aria-label="Status for ${esc(s.n)}">${[['','Not started'],['progress','In progress'],['done','Done']].map(([v,l])=>`<option value="${v}" ${(S.regs[s.k]||'')===v?'selected':''}>${l}</option>`).join('')}</select></div></div>`).join('')}</div>
  </section>`;
}

/* ================= view: team ================= */
function vTeam(){
  const f=UI.personFilter;const items=S.items.filter(i=>f==='all'||i.owner===f);
  const cols=[['todo','To do'],['doing','In progress'],['done','Done']];
  return `<header class="pagehead"><div><div class="eyebrow">Team · ${S.team.length} ${S.team.length===1?'person':'people'}</div><h1 style="margin-top:8px">Who’s doing what, by when.</h1><p class="lede">Assign initiatives and tasks, set due dates and talk in comments, so the whole team runs on one plan.</p></div><button class="btn" data-act="add-member">Add a teammate</button></header>
  <div class="people"><button class="person" data-act="pf" data-v="all" aria-pressed="${f==='all'}" style="padding-left:12px">Everyone · ${S.items.filter(i=>i.status!=='done').length} open</button>${S.team.map(t=>`<button class="person" data-act="pf" data-v="${t.id}" aria-pressed="${f===t.id}"><span class="avatar sm" style="background:${t.color}">${esc(initials(t.name))}</span>${esc(t.name.split(' ')[0])} <span class="muted small" style="color:inherit;opacity:.7">${esc(t.role)}</span></button>`).join('')}</div>
  <section class="card"><form class="addtask" data-form="task"><input class="input" name="t" id="nt-t" placeholder="New task, e.g. Get 3 quotes for a new courier" required aria-label="Task"><select class="input" name="o" id="nt-o" aria-label="Owner">${S.team.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><input class="input" type="date" name="d" id="nt-d" value="${iso(addDays(TODAY,7))}" aria-label="Due"><button class="btn primary">Assign</button></form></section>
  <div class="board">${cols.map(([k,n])=>{const list=items.filter(i=>i.status===k).sort((a,b)=>parseISO(a.due)-parseISO(b.due));return `<div class="col"><div class="col-h"><span>${n}</span><span class="pill">${list.length}</span></div>${list.map(taskCard).join('')||'<div class="empty" style="font-size:13px">Nothing here</div>'}</div>`}).join('')}</div>`;
}
function taskCard(i){
  const o=member(i.owner);const d=parseISO(i.due);const dd=days(TODAY,d);const late=i.status!=='done'&&dd<0;
  if(UI.openTask===i.id)return `<div class="task open"><div class="spread"><span class="kind">${i.kind}</span><button class="btn ghost sm" data-act="open-task" data-id="">Close</button></div>
   <input class="input" style="font-weight:700" id="tt-${i.id}" data-arr="items" data-id="${i.id}" data-f="title" value="${esc(i.title)}" aria-label="Title">
   <div class="grid g-2" style="gap:8px"><select class="input" id="to-${i.id}" data-arr="items" data-id="${i.id}" data-f="owner" aria-label="Owner">${S.team.map(t=>`<option value="${t.id}" ${t.id===i.owner?'selected':''}>${esc(t.name)}</option>`).join('')}</select><input class="input" type="date" id="td-${i.id}" data-arr="items" data-id="${i.id}" data-f="due" value="${i.due}" aria-label="Due"></div>
   <select class="input" id="ts-${i.id}" data-arr="items" data-id="${i.id}" data-f="status" aria-label="Status">${[['todo','To do'],['doing','In progress'],['done','Done']].map(([v,l])=>`<option value="${v}" ${i.status===v?'selected':''}>${l}</option>`).join('')}</select>
   <div class="comments">${i.comments.map(c=>{const m=member(c.by);return `<div class="cmt"><b>${esc(m.name)}</b> <span class="muted">· ${fmtD(parseISO(c.at))}</span><div>${esc(c.t)}</div></div>`}).join('')}
   <form class="row" data-form="comment" data-id="${i.id}"><input class="input" style="flex:1" name="c" id="cm-${i.id}" placeholder="Write a comment" required aria-label="Comment"><button class="btn sm">Post</button></form></div>
   <button class="btn ghost sm" style="color:var(--bad);align-self:flex-start" data-act="del" data-k="items" data-id="${i.id}">Delete</button></div>`;
  return `<button class="task" data-act="open-task" data-id="${i.id}"><span class="kind">${i.kind}</span><span class="t">${esc(i.title)}</span><span class="meta"><span class="row" style="gap:6px"><span class="avatar sm" style="background:${o.color}">${esc(initials(o.name))}</span>${esc(o.name.split(' ')[0])}</span><span style="color:${late?'var(--bad)':'inherit'};font-weight:${late?700:500}">${i.status==='done'?'Done':late?-dd+'d late':dd===0?'Today':fmtD(d)}</span>${i.comments.length?`<span>${i.comments.length} ${i.comments.length===1?'comment':'comments'}</span>`:''}</span></button>`;
}

/* ================= onboarding ================= */
const OBS=['welcome','you','stage','sector','team','money','goal','habit','build'];
function obValid(){const a=OB.a,s=OBS[OB.step];
  if(s==='you')return (a.name||'').trim()&&(a.company||'').trim();
  if(s==='stage')return !!a.stage; if(s==='sector')return !!a.sector; if(s==='team')return !!a.team; if(s==='goal')return !!a.goal;
  if(s==='money')return a.stage==='idea'?(a.savings>0||a.angel>0)&&(a.spend>0||a.need>0)&&!!a.job:a.cash>=0&&a.cash!==undefined&&a.spend>0;
  return true}
function renderOB(){
  const s=OBS[OB.step],a=OB.a;const qn=OB.step;const total=OBS.length-2;
  const segs=`<div class="segs" aria-label="Step ${Math.min(qn,total)} of ${total}">${Array.from({length:total},(_,i)=>`<i class="${i<qn?'on':''}"></i>`).join('')}</div>`;
  const opt=(k,v,b,sub,key)=>`<button class="opt" data-act="ob-pick" data-k="${k}" data-v="${esc(v)}" aria-pressed="${a[k]===v}">${key?`<span class="k">${key}</span>`:''}<b>${b}</b>${sub?`<span>${sub}</span>`:''}</button>`;
  let body='';
  if(s==='welcome')body=`<div class="ob-q"><div class="eyebrow">Growth Planner · for first-time founders</div><div class="hero-k">Run your startup in <em>20 minutes</em> a week.</div><p class="hint">Answer 7 quick questions. Get a first plan, three moves for this week, a 13-week cash forecast and an advisor that reads your numbers. No CFO or consultant needed.</p>
    <div class="row" style="gap:12px"><button class="btn primary lg" data-act="ob-next">Build my plan ${ICON.arrow}</button><button class="btn lg" data-act="load-sample">Explore a sample startup</button></div><p class="small muted">Takes about 3 minutes. You can change every answer later.</p></div>`;
  if(s==='you')body=`<div class="ob-q"><h1>First, who’s building this?</h1><div class="field"><label for="ob-name">Your name</label><input class="big-in" id="ob-name" data-ob="name" value="${esc(a.name||'')}" placeholder="Priya Sharma" autocomplete="name"></div><div class="field"><label for="ob-co">Startup name</label><input class="big-in" id="ob-co" data-ob="company" value="${esc(a.company||'')}" placeholder="Brewhaus Coffee"></div></div>`;
  if(s==='stage')body=`<div class="ob-q"><h1>Where is ${esc(a.company||'your startup')} today?</h1><p class="hint">This decides which screens you see. A company with no sales needs a different plan from a ₹5 Cr one.</p><div class="opts">${Object.entries(STAGES).map(([k,v],i)=>opt('stage',k,v.n,v.d,i+1)).join('')}</div></div>`;
  if(s==='sector')body=`<div class="ob-q"><h1>What do you sell?</h1><div class="chips">${SECTORS.map(x=>opt('sector',x,x)).join('')}</div></div>`;
  if(s==='team')body=`<div class="ob-q"><h1>How many people work on it, including you?</h1><div class="chips">${TEAMS.map(x=>opt('team',x,x)).join('')}</div></div>`;
  if(s==='money'){const m=(k,l,step,ph)=>`<div class="field"><label for="ob-${k}">${l}</label><div class="money"><span class="pre">₹</span><input class="input num" style="font-size:20px;padding-block:12px" type="number" inputmode="decimal" min="0" step="${step}" id="ob-${k}" data-ob="${k}" data-type="lakh" value="${a[k]!=null?a[k]/1e5:''}" placeholder="${ph}"><span class="suf">lakh</span></div></div>`;
    body=a.stage==='idea'?`<div class="ob-q"><h1>How much runway do you have?</h1><p class="hint">Rough numbers are fine. 1 lakh = ₹1,00,000.</p><div class="grid g-2" style="gap:14px">${m('savings','Savings set aside for this',0.5,'5')}${m('angel','Angel or family cheque (if any)',0.5,'0')}${m('spend','Business spend per month',0.1,'0.5')}${m('need','Your personal need per month',0.1,'0.6')}</div><div class="field"><span class="lbl">Do you still have a job?</span><div class="chips">${opt('job','yes','Yes, building on the side')}${opt('job','no','No, full-time on this')}</div></div></div>`
    :`<div class="ob-q"><h1>Now, the money.</h1><p class="hint">Last month’s rough figures are enough. 1 lakh = ₹1,00,000. You can upload real numbers later.</p><div class="grid g-3" style="gap:14px">${m('cash','In the bank today',0.5,'25')}${m('rev','Sales per month',0.1,'8')}${m('spend','Spend per month',0.1,'10')}</div></div>`}
  if(s==='goal'){const gs=a.stage==='idea'?['first10','compliant','raise','team']:a.stage==='early'?['first10','breakeven','grow','raise','team','compliant']:['breakeven','grow','raise','team','compliant'];
    body=`<div class="ob-q"><h1>What matters most in the next 6 months?</h1><p class="hint">Pick one. Your first initiatives and weekly moves are built around it.</p><div class="opts">${gs.map((g,i)=>opt('goal',g,GOALS[g],'',i+1)).join('')}</div></div>`}
  if(s==='habit')body=`<div class="ob-q"><h1>Last one: how should we keep you on track?</h1><p class="hint">Tools like this get used for a week and forgotten. A short nudge at the right time fixes that.</p><div class="stack">${[['monday','Every Monday','Your 3 moves for the week'],['close','On the 1st of each month','Close last month in 2 minutes'],['review','Before team reviews','A reminder the day before']].map(([k,t,d])=>`<label class="row" style="gap:14px;cursor:pointer;padding:14px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface)"><input type="checkbox" class="switch" id="obr-${k}" data-obr="${k}" ${a['r_'+k]!==false?'checked':''}><span><b>${t}</b><br><span class="small muted">${d}</span></span></label>`).join('')}</div><p class="small muted">Shown inside the app for now. Email and WhatsApp delivery are next on the roadmap.</p></div>`;
  if(s==='build')body=`<div class="ob-q"><h1>Building ${esc(a.company)}’s first plan…</h1><div class="build" id="build">${['Reading your numbers','Choosing the screens that fit your stage','Writing this week’s 3 moves','Checking your cash runway','Setting up your compliance calendar'].map(t=>`<div><span class="check on">${ICON.tick}</span>${t}</div>`).join('')}</div></div>`;
  const nav=(s!=='welcome'&&s!=='build')?`<div class="ob-nav"><button class="btn lg primary" data-act="ob-next" ${obValid()?'':'disabled'}>${s==='habit'?'Build my plan':'Continue'} ${ICON.arrow}</button><button class="btn ghost" data-act="ob-back">Back</button><span class="hint-k">or press Enter ↵</span></div>`:'';
  const fresh=OB.anim!==OB.step;OB.anim=OB.step;body=body.replace('class="ob-q"','class="ob-q'+(fresh?' enter':'')+'"');
  return `<div class="ob"><div class="ob-left"><div class="spread"><div class="brand" style="padding:0">${ICON.logo}<span>Growth Planner</span></div>${S&&S.profile&&!S.sample?'<button class="btn ghost sm" data-act="ob-cancel">Cancel</button>':''}</div>${s!=='welcome'?segs:''}${body}${nav}</div>
   <div class="ob-right">${s==='welcome'?welcomeRight():previewRight()}</div></div>`;
}
function welcomeRight(){
  let g=new Date(TODAY.getFullYear(),TODAY.getMonth(),11);if(g<TODAY)g=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,11);
  return `<h2>This is your Monday</h2>
  <div class="demo">
   <div class="float f1" aria-hidden="true"><div class="k">Runway</div><div class="v">7.1 months</div></div>
   <div class="mini-week"><div class="spread"><b style="font-family:var(--f-display);font-size:18px">This week’s 3 moves</b><span class="pill pop">Example</span></div>
    <div class="move done"><span class="check">${ICON.tick}</span><div class="body"><div class="t">Chase ₹3.4 L from Kirana Fresh</div><div class="why">38 days overdue</div></div></div>
    <div class="move"><span class="check">${ICON.tick}</span><div class="body"><div class="t">File GSTR-1 by ${fmtD(g)}</div><div class="why">Late fees start the next day</div></div></div>
    <div class="move"><span class="check">${ICON.tick}</span><div class="body"><div class="t">Find ₹1.4 L a month to cut</div><div class="why">Gets you from 7 to 12 months of runway</div></div></div>
    <div class="alert warn" style="margin-top:4px">${ICON.warn}<div>Cash lasts until about <b>May 2027</b>.</div></div></div>
   <div class="float f2" aria-hidden="true">${ICON.logo}<div><div class="k">Mon 9:00 AM</div><div class="v">3 new moves are ready</div></div></div>
  </div>
  <p style="color:var(--pm);max-width:42ch">Built for founders with no CFO and no consultant: from “just an idea” to ₹10 Cr a year.</p>`;
}
function previewRight(){
  const a=OB.a;const st=a.stage;const p={stage:st||'early',goal:a.goal};
  OB.seen=OB.seen||{};const nw=(k,v)=>{const n=OB.seen[k]!==v;OB.seen[k]=v;return n?' new':''};
  const ghost=(n,t,sub,wide)=>`<div class="bc ghost${wide?' wide':''}"><span class="gi">${n}</span><span><b>${t}</b>${sub.replace('<br>','')}</span></div>`;
  // runway
  let months=null,cashPos=false;
  if(a.stage==='idea'&&(a.savings||a.angel)){const pot=(a.savings||0)+(a.angel||0),b=(a.spend||0)+(a.job==='no'?(a.need||0):0);if(b>0)months=pot/b}
  else if(a.stage&&a.stage!=='idea'&&a.cash!=null&&a.spend){const net=a.spend-(a.rev||0);if(net>0)months=a.cash/net;else cashPos=true}
  const hasRw=months!=null||cashPos;
  const tc=cashPos||months>=12?'var(--pg)':months>=6?'var(--pw)':'var(--pr)';
  const mods=st?MODS.filter(m=>modOn(m,p)):[];const onN=mods.length;
  const built=[!!(a.company||a.name),!!st,hasRw,!!st,!!a.goal,OB.step>=7].filter(Boolean).length;
  // cards
  const idCard=`<div class="bc id wide${nw('id',a.company&&a.sector&&a.team?'full':a.company?'name':'none')}">
    <div class="lab"><span>Startup card</span><span>GP·${String(TODAY.getFullYear()).slice(2)}·${String((a.company||'xx').length*137%900+100)}</span></div>
    <div class="id-row"><div class="id-tile">${esc(initials(a.company||'?'))}</div><div style="min-width:0"><div class="id-name">${esc(a.company||'Your startup')}</div><div class="id-sub">${a.name?'Founded by '+esc(a.name):'Founder name appears here'}</div></div></div>
    <div class="id-foot"><div>${a.sector?`<span class="gchip">${esc(a.sector)}</span>`:'<span class="gchip dim">Sector</span>'}${a.team?`<span class="gchip">${a.team==='Just me'?'Solo founder':'Team of '+esc(a.team)}</span>`:'<span class="gchip dim">Team</span>'}</div><span class="barcode" aria-hidden="true"></span></div>
  </div>`;
  const order=['idea','early','growing','scaling'];const si=order.indexOf(st);
  const stageCard=st?`<div class="bc${nw('st',st)}"><div class="lab"><span>Stage</span></div><div class="track">${order.map((k,i)=>`<div class="${i<si?'past':i===si?'now':''}"><i></i>${STAGES[k].n}</div>`).join('')}</div></div>`:ghost(1,'Stage','<br>Where you are today');
  const filled=months!=null?Math.max(1,Math.min(12,Math.round(months/2))):cashPos?12:0;
  const out=months!=null?addDays(TODAY,Math.round(months*30.4)):null;
  const rwCard=hasRw?`<div class="bc${nw('rw',cashPos?'pos':'m')}"><div class="lab"><span>${a.stage==='idea'?'Savings runway':'Runway'}</span></div>
     ${cashPos?`<div class="rw-num" style="color:var(--pg);font-size:26px">Cash positive</div>`:`<div class="rw-num" style="color:${tc}">${months>=36?'36+':trimN(Math.round(months*10)/10)}<small>months</small></div>`}
     <div class="rw-bars" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="${i<filled?`background:${tc}`:''}"></i>`).join('')}</div>
     <div class="rw-note">${cashPos?'You earn more than you spend':months>=36?'Plenty of time to plan':'Lasts until about '+MON[out.getMonth()]+' '+out.getFullYear()}</div></div>`:ghost(2,'Runway','<br>From your money answers');
  const scCard=st?`<div class="bc wide${nw('md',st+a.goal)}"><div class="lab"><span>Screens unlocked</span><span style="color:var(--pi)">${onN} / ${MODS.length}</span></div>
     <div class="unlock"><i style="width:${onN/MODS.length*100}%"></i></div>
     <div class="mods-mini">${MODS.map(m=>`<span class="mm ${modOn(m,p)?(m.soon?'soon':''):'off'}" title="${modOn(m,p)?(m.soon?'Coming soon':'Unlocked'):esc(m.later||'Later')}">${m.n}</span>`).join('')}</div></div>`:ghost(3,'Your screens','<br>Only the ones that fit your stage',true);
  const dues=['in 3 wks','in 6 wks','in 3 mo'];
  const goalCard=a.goal?`<div class="bc goal wide${nw('gl',a.goal)}"><div class="lab"><span>6-month goal</span><span>First initiatives</span></div><div class="goal-t">${esc(GOALS[a.goal])}</div>
     ${(GOAL_INIT[a.goal]||[]).map((t,i)=>`<div class="ini"><span class="n ${i===0?'hi':''}">${i+1}</span><span class="grow">${t}</span><span class="d">${dues[i]}</span></div>`).join('')}</div>`:ghost(4,'Goal and first initiatives','<br>Built around what matters most',true);
  const r=k=>a['r_'+k]!==false;
  const nudgeCard=OB.step>=7?`<div class="bc nudge wide${nw('nd','on')}">${ICON.logo}<div style="flex:1;min-width:0"><div class="nt"><span>Growth Planner</span><span>Mon 9:00 AM</span></div><b>${r('monday')?`Morning ${esc((a.name||'').split(' ')[0]||'founder')}, your 3 moves are ready`:'Weekly nudges are off'}</b>
     <div class="tags"><span class="${r('monday')?'':'off'}">Monday plan</span><span class="${r('close')?'':'off'}">Month close</span><span class="${r('review')?'':'off'}">Team review</span></div></div></div>`:'';
  return `<div class="pv-head"><h2>Your plan, as you answer</h2><div class="pv-count" aria-label="${built} of 6 cards built"><span>${built}/6</span><span class="pips">${Array.from({length:6},(_,i)=>`<i class="${i<built?'on':''}"></i>`).join('')}</span></div></div>
  <div class="bento">${idCard}${stageCard}${rwCard}${scCard}${goalCard}${nudgeCard}</div>`;
}
function revealNew(){if(window.innerWidth<=860)return;const n=document.querySelector('.ob-right .bc.new:last-of-type')||document.querySelector('.ob-right .bc.new');if(n)setTimeout(()=>n.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),80)}
function afterOB(){revealNew();
  const s=OBS[OB.step];
  const f=document.querySelector('[data-ob]');if(f&&OB.focused!==OB.step){OB.focused=OB.step;setTimeout(()=>f.focus(),60)}
  if(s==='build'){const rows=[...document.querySelectorAll('#build > div')];const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const gap=reduce?60:520;
    rows.forEach((r,i)=>setTimeout(()=>r.classList.add('on'),gap*(i+1)));
    setTimeout(finishOB,gap*(rows.length+1)+200)}
}
function finishOB(){
  const a=OB.a;const p={name:a.name.trim(),company:a.company.trim(),stage:a.stage,sector:a.sector,team:a.team,goal:a.goal,
    cash:a.stage==='idea'?(a.savings||0)+(a.angel||0):(a.cash||0),rev:a.stage==='idea'?0:(a.rev||0),spend:a.spend||0,savings:a.savings||0,angel:a.angel||0,need:a.need||0,job:a.job};
  const keep=OB.editing&&S&&!S.sample?S:null;
  const st=genPlan(p,keep);
  st.sample=false;st.reminders={...st.reminders,monday:a.r_monday!==false,close:a.r_close!==false,review:a.r_review!==false};
  if(keep&&st.team[0])st.team[0].name=p.name;
  S=st;OB=null;UI.view='week';save();render();toast(keep?'Plan updated':'Your first plan is ready');
}

/* ================= events ================= */
function setPath(o,path,v){const ks=path.split('.');let x=o;for(let i=0;i<ks.length-1;i++){x[ks[i]]=x[ks[i]]??{};x=x[ks[i]]}x[ks[ks.length-1]]=v}
function readVal(el){const t=el.dataset.type;if(t==='bool')return el.checked;if(t==='num')return el.value===''?0:+el.value;if(t==='lakh')return el.value===''?0:Math.round(+el.value*1e5);return el.value}
function rerender(){
  const a=document.activeElement;const id=a&&a.id;let ss=null,se=null;try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}
  const y=window.scrollY;render();window.scrollTo(0,y);
  if(id){const n=document.getElementById(id);if(n){n.focus({preventScroll:true});try{if(ss!=null)n.setSelectionRange(ss,se)}catch(e){}}}
}
function onInput(e,live){
  const el=e.target;
  if(el.dataset.ob){OB.a[el.dataset.ob]=el.dataset.type==='lakh'?(el.value===''?undefined:Math.round(+el.value*1e5)):el.value;
    const btn=document.querySelector('[data-act="ob-next"]');if(btn)btn.disabled=!obValid();
    const r=document.querySelector('.ob-right');if(r){r.innerHTML=previewRight();revealNew()}return}
  if(el.dataset.obr){OB.a['r_'+el.dataset.obr]=el.checked;const r=document.querySelector('.ob-right');if(r)r.innerHTML=previewRight();return}
  if(el.dataset.bind){if(live&&el.dataset.live===undefined)return;
    setPath(S,el.dataset.bind,readVal(el));
    if(el.dataset.bind==='profile.need'||el.dataset.bind==='profile.savings'||el.dataset.bind==='profile.angel'||el.dataset.bind==='profile.spend'){if(S.profile.stage==='idea')S.profile.cash=(S.profile.savings||0)+(S.profile.angel||0)}
    save();rerender();return}
  if(el.dataset.arr){if(live&&el.dataset.live===undefined)return;const arr=S[el.dataset.arr];const it=arr.find(x=>x.id===el.dataset.id);if(it){it[el.dataset.f]=readVal(el);save();rerender()}return}
  if(el.dataset.ten!==undefined){if(live&&el.dataset.f==='n'){S.first10[+el.dataset.ten].n=el.value;save();return}S.first10[+el.dataset.ten][el.dataset.f]=el.value;save();rerender();return}
  if(el.id==='ask'){UI.draft=el.value;el.style.height='auto';el.style.height=Math.min(180,el.scrollHeight)+'px'}
}
document.addEventListener('input',e=>onInput(e,true));
document.addEventListener('change',e=>onInput(e,false));
document.addEventListener('keydown',e=>{
  if(OB&&e.key==='Enter'&&!e.shiftKey&&!['TEXTAREA','BUTTON'].includes(e.target.tagName)){if(obValid()&&OBS[OB.step]!=='build'){e.preventDefault();obNext()}}
  if(OB&&/^[1-6]$/.test(e.key)&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){const b=document.querySelectorAll('.opts .opt')[+e.key-1];if(b)b.click()}
  if(e.target.id==='ask'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(e.target.value)}
  if(e.key==='Escape'){closeLayer();if(UI.menu){UI.menu=false;render()}}
});
function obNext(){if(!obValid())return;OB.step=Math.min(OBS.length-1,OB.step+1);if(OBS[OB.step]==='money'&&OB.a.stage!=='idea'){OB.a.job=undefined}render()}
document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target,k=f.dataset.form,fd=new FormData(f);
  if(k==='recv'||k==='pay'){S[k].push({id:uid(),who:fd.get('who'),amt:+fd.get('amt'),due:fd.get('due')||iso(TODAY)});save();render();toast('Added')}
  if(k==='initiative'){S.items.push({id:uid(),title:fd.get('t'),kind:'initiative',owner:'me',due:iso(addDays(TODAY,30)),status:'todo',comments:[]});save();render();toast('Initiative added')}
  if(k==='task'){S.items.push({id:uid(),title:fd.get('t'),kind:'task',owner:fd.get('o'),due:fd.get('d')||iso(addDays(TODAY,7)),status:'todo',comments:[]});save();render();toast(`Assigned to ${member(fd.get('o')).name.split(' ')[0]}`)}
  if(k==='comment'){const it=S.items.find(i=>i.id===f.dataset.id);it.comments.push({by:'me',t:fd.get('c'),at:iso(TODAY)});save();render()}
  if(k==='ask'){ask(fd.get('q')||'')}
  if(k==='close'){const m=fd.get('m');const row={m,rev:Math.round(+fd.get('rev')*1e5),spend:Math.round(+fd.get('spend')*1e5),cash:Math.round(+fd.get('cash')*1e5)};S.history=S.history.filter(h=>h.m!==m).concat(row).sort((a,b)=>a.m<b.m?-1:1);
    const last=S.history[S.history.length-1];Object.assign(S.profile,{rev:last.rev,spend:last.spend,cash:last.cash});const wk=S.weeks[weekKey()];if(wk)wk.moves.forEach(mv=>{if(mv.act==='close')mv.done=true});markStreak();save();closeLayer();render();toast(`${mlabel(m)} closed. Forecast updated.`)}
  if(k==='member'){const n=fd.get('n').trim();if(!n)return;const em=(fd.get('e')||'').trim();S.team.push({id:uid(),name:n,role:fd.get('r')||'Team',color:COLORS[S.team.length%COLORS.length],email:em||undefined});save();closeLayer();render();
    if(em&&!S.sample){fetch('/api/team',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em})}).then(r=>r.json().then(j=>({ok:r.ok,j}))).then(({ok,j})=>toast(!ok?(j.error||'Could not send the invite'):j.joined?`${n} added and can sign in now`:j.emailSent?`${n} added and invited by email`:`${n} added. Email isn’t set up, so share the sign-up link from Account and team`))}else toast(`${n} added`)}
});
function markStreak(){const k=weekKey();if(!S.streak.includes(k))S.streak.push(k)}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');
  if(!b){if(UI.menu&&!e.target.closest('.menu')){UI.menu=false;render()}return}
  const act=b.dataset.act,id=b.dataset.id;
  if(act!=='menu'&&act!=='menu-mobile'&&UI.menu&&!b.closest('.menu'))UI.menu=false;
  switch(act){
   case 'nav':UI.view=b.dataset.v;UI.openTask=null;try{history.replaceState(null,'','#'+UI.view)}catch(_){}render();window.scrollTo(0,0);break;
   case 'menu':UI.menu=!UI.menu;render();break;
   case 'menu-mobile':openLayer(`<h2>${esc(S.profile.company)}</h2><div class="menu" style="position:static;box-shadow:none">${menuHTML().replace(/^<div class="menu" role="menu">|<\/div>$/g,'')}</div><button class="btn" data-act="close-layer">Close</button>`);break;
   case 'move':{const wk=thisWeek();const m=wk.moves.find(x=>x.id===id);m.done=!m.done;if(m.done){markStreak();S.seenMovesHelp=true;const nx=wk.moves.find(x=>!x.done);UI.openMove=nx?nx.id:null}else UI.openMove=m.id;save();rerender();
     if(wk.moves.every(x=>x.done))toast('Week cleared. Nice work.');else if(m.done)toast('Done. Next move is open.');break}
   case 'ten-stage':{const c=S.first10[+b.dataset.i];if(!c.n){toast('Type a name first, then pick a stage.');document.getElementById('f10-'+b.dataset.i)?.focus();break}c.s=b.dataset.s;save();rerender();if(c.s==='Paid')toast(`${c.n} is a paying customer.`);break}
   case 'move-open':UI.openMove=UI.openMove===id?'__none__':id;rerender();break;
   case 'coach-ok':S.seenMovesHelp=true;save();rerender();break;
   case 'reroll':{const old=S.weeks[weekKey()].moves.filter(m=>m.done);const fresh=genMoves().filter(n=>!old.some(o=>o.t===n.t));S.weeks[weekKey()].moves=old.concat(fresh).slice(0,3);save();render();toast('Moves refreshed from your latest data');break}
   case 'snooze':{const it=S.items.find(i=>i.id===id);it.due=iso(addDays(parseISO(it.due)<TODAY?TODAY:parseISO(it.due),7));save();render();toast('Moved one week later');break}
   case 'paid':{const r=S[b.dataset.k].find(x=>x.id===id);r.paid=true;if(b.dataset.k==='recv')S.profile.cash+=r.amt;else S.profile.cash-=r.amt;save();render();toast(b.dataset.k==='recv'?`${inr(r.amt)} added to your bank balance`:`${inr(r.amt)} paid`);break}
   case 'del':{S[b.dataset.k]=S[b.dataset.k].filter(x=>x.id!==id);save();render();break}
   case 'add-launch':S.launch.push({id:uid(),n:'New cost',amt:0});save();render();break;
   case 'toggle-item':{const it=S.items.find(i=>i.id===id);it.status=it.status==='done'?'todo':'done';save();rerender();break}
   case 'idea-check':S.ideaChecks[b.dataset.k]=!S.ideaChecks[b.dataset.k];save();rerender();break;
   case 'scen-clear':S.scen.hire.on=S.scen.late.on=S.scen.drop.on=false;save();render();break;
   case 'comp-filter':UI.compFilter=b.dataset.v;render();break;
   case 'comp-done':S.compDone[id]=!S.compDone[id];save();rerender();if(S.compDone[id])toast('Marked as filed');break;
   case 'pf':UI.personFilter=b.dataset.v;render();break;
   case 'open-task':UI.openTask=id||null;render();break;
   case 'add-member':openLayer(`<h2>Add a teammate</h2><p class="muted small">They can own initiatives and tasks. Add their email to invite them to sign in and share this plan.</p><form class="stack" data-form="member"><div class="field"><label for="m-n">Name</label><input class="input" id="m-n" name="n" required placeholder="Kavya Nair"></div><div class="field"><label for="m-e">Email (optional, sends an invite)</label><input class="input" id="m-e" name="e" type="email" placeholder="kavya@company.com"></div><div class="field"><label for="m-r">Role</label><input class="input" id="m-r" name="r" placeholder="Sales"></div><div class="row"><button class="btn primary">Add</button><button type="button" class="btn ghost" data-act="close-layer">Cancel</button></div></form>`);setTimeout(()=>document.getElementById('m-n')?.focus(),50);break;
   case 'close':openClose();break;
   case 'close-layer':closeLayer();break;
   case 'sug':{const q=b.dataset.q;if(/: $/.test(q)){UI.draft=q;rerender();const t=document.getElementById('ask');if(t){t.focus();t.setSelectionRange(q.length,q.length)}}else ask(q);break}
   case 'stop':abortCtl&&abortCtl.abort();break;
   case 'chat-clear':S.chat=[];save();render();break;
   case 'copy':{const t=S.chat[+b.dataset.i].content;try{await navigator.clipboard.writeText(t);toast('Copied')}catch(_){openLayer(`<h2>Copy this text</h2><textarea class="input" rows="12" id="copybox">${esc(t)}</textarea><button class="btn" data-act="close-layer">Done</button>`);setTimeout(()=>{const x=document.getElementById('copybox');x&&x.select()},50)}break}
   case 'ob-next':if(OBS[OB.step]==='welcome'){OB.step=1;render()}else obNext();break;
   case 'ob-back':OB.step=Math.max(0,OB.step-1);render();break;
   case 'ob-cancel':OB=null;render();break;
   case 'ob-pick':{OB.a[b.dataset.k]=b.dataset.v;const auto=['stage','sector','team','goal'].includes(b.dataset.k);if(auto){render();setTimeout(()=>{if(OB&&obValid())obNext()},260)}else render();break}
   case 'load-sample':if(S&&!S.sample&&S.profile)REAL=S;S=sampleState();OB=null;UI.view='week';UI.menu=false;render();paintSync();toast('Showing a sample startup. Nothing you change here is saved.');break;
   case 'start-own':UI.menu=false;closeLayer();if(REAL){S=REAL;REAL=null;OB=null;render();paintSync();break}S=null;OB={step:1,a:{}};render();break;
   case 'edit-answers':{const p=S.profile;OB={step:1,editing:true,a:{name:p.name,company:p.company,stage:p.stage,sector:p.sector,team:p.team,goal:p.goal,cash:p.stage==='idea'?undefined:p.cash,rev:p.rev,spend:p.spend,savings:p.savings,angel:p.angel,need:p.need,job:p.job,r_monday:S.reminders.monday,r_close:S.reminders.close,r_review:S.reminders.review}};if(S.sample)OB.editing=false;UI.menu=false;closeLayer();render();break}
   case 'theme':{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('gp-theme',r.dataset.theme)}catch(_){}UI.menu=false;closeLayer();render();break}
   case 'export':{UI.menu=false;closeLayer();render();location.href='/api/export';break}
   case 'reset':UI.menu=false;closeLayer();render();openLayer(`<h2>Delete your data?</h2><p class="muted">This removes your company’s plan, numbers, tasks and advisor history for everyone on your team. It can’t be undone. Export first if you want a copy.</p><div class="row"><button class="btn primary" style="background:var(--bad);border-color:var(--bad)" data-act="reset-yes">Delete and start over</button><button class="btn ghost" data-act="close-layer">Keep my data</button></div>`);break;
   case 'reset-yes':{const r=await fetch('/api/state',{method:'DELETE'});const j=await r.json().catch(()=>({}));if(!r.ok){toast(j.error||'Could not delete the plan');break}serverVersion=j.version;S=null;closeLayer();OB={step:0,a:{}};render();toast('Your plan was deleted');break}
   case 'settings-page':location.href='/settings';break;
   case 'zoho-sync':{if(UI.zohoBusy)break;UI.zohoBusy=true;rerender();clearTimeout(saveTimer);if(syncMode==='saving'||saving)await pushDb();const r=await fetch('/api/zoho/sync',{method:'POST'});const j=await r.json().catch(()=>({}));UI.zohoBusy=false;
     if(!r.ok){toast(j.error||'Sync failed');await refreshFromServer();break}const x=j.result||{};toast(x.skipped||`Synced: ${x.invoices} invoices, ${x.bills} bills${x.cash!=null?', bank '+inr(x.cash):''}`);await refreshFromServer();break}
   case 'zoho-off':{const r=await fetch('/api/zoho',{method:'DELETE'});if(r.ok){toast('Zoho Books disconnected. Imported rows stay until you remove them.');await refreshFromServer()}else toast('Could not disconnect');break}
   case 'logout':await fetch('/api/auth/logout',{method:'POST'});location.href='/login';break;
  }
});
/* ---------- bank statement CSV → monthly totals (runs in the browser) ---------- */
function csvRows(t){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===','){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}if(f||row.length){row.push(f);rows.push(row)}return rows.filter(r=>r.some(x=>x.trim()))}
function toNum(s){if(s==null)return 0;s=String(s).replace(/[₹,\s]/g,'').replace(/(Cr|Dr)$/i,'');if(/^\(.*\)$/.test(s))s='-'+s.slice(1,-1);const n=parseFloat(s);return isNaN(n)?0:n}
function toDate(s){s=String(s||'').trim();let m;if(m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))return new Date(+m[1],+m[2]-1,+m[3]);if(m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)){const y=+m[3]<100?2000+ +m[3]:+m[3];return new Date(y,+m[2]-1,+m[1])}if(m=s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[A-Za-z]*[\s\-,]+(\d{2,4})/)){const mi=MON.findIndex(x=>x.toLowerCase()===m[2].toLowerCase());const y=+m[3]<100?2000+ +m[3]:+m[3];if(mi>=0)return new Date(y,mi,+m[1])}return null}
function parseStatement(text){
  const rows=csvRows(text);const hi=rows.findIndex(r=>r.some(c=>/date/i.test(c))&&r.some(c=>/(withdraw|debit|dr\b|deposit|credit|cr\b|amount)/i.test(c)));
  if(hi<0)throw new Error('Could not find a header row with Date and Debit/Credit columns.');
  const H=rows[hi].map(h=>h.trim().toLowerCase());const col=re=>H.findIndex(h=>re.test(h));
  const cD=col(/date/),cDr=col(/withdraw|debit|^dr\b|dr amount/),cCr=col(/deposit|credit|^cr\b|cr amount/),cAmt=col(/^amount|amount \(inr\)|transaction amount/),cType=col(/^type|dr\/cr|cr\/dr/),cBal=col(/balance/);
  const months={};let n=0;
  for(const r of rows.slice(hi+1)){const d=toDate(r[cD]);if(!d)continue;let inn=0,out=0;
    if(cDr>=0||cCr>=0){out=Math.abs(toNum(r[cDr]));inn=Math.abs(toNum(r[cCr]))}else if(cAmt>=0){const a=toNum(r[cAmt]);const t=cType>=0?String(r[cType]).toLowerCase():'';if(/dr|debit/.test(t)||a<0)out=Math.abs(a);else inn=Math.abs(a)}
    const k=mkey(d);const m=months[k]=months[k]||{m:k,in:0,out:0,closing:null,last:null};m.in+=inn;m.out+=out;n++;
    if(cBal>=0&&r[cBal]&&(!m.last||d>=m.last)){m.closing=toNum(r[cBal]);m.last=d}}
  if(!n)throw new Error('No transactions found. Check that the file is a CSV export from your bank.');
  return Object.values(months).sort((a,b)=>a.m<b.m?-1:1);
}
document.addEventListener('change',e=>{if(e.target.id!=='cl-file')return;const f=e.target.files&&e.target.files[0];if(!f)return;const note=document.getElementById('cl-note');
  f.text().then(t=>{const ms=parseStatement(t);const want=document.getElementById('cl-m').value;const m=ms.find(x=>x.m===want)||ms[ms.length-1];
    document.getElementById('cl-m').value=[...document.getElementById('cl-m').options].some(o=>o.value===m.m)?m.m:want;
    document.getElementById('cl-r').value=(m.in/1e5).toFixed(2);document.getElementById('cl-s').value=(m.out/1e5).toFixed(2);if(m.closing!=null)document.getElementById('cl-c').value=(m.closing/1e5).toFixed(2);
    note.textContent=`Filled from ${mlabel(m.m)}: money in ${inr(m.in)}, money out ${inr(m.out)}${m.closing!=null?', closing balance '+inr(m.closing):''}. Money in counts as sales, so take out loans or transfers between your own accounts.`;note.style.color='var(--good)'})
  .catch(err=>{note.textContent=err.message||'Could not read that file.';note.style.color='var(--bad)'})});
function openClose(){
  const lm=new Date(TODAY.getFullYear(),TODAY.getMonth()-1,1);const opts=[0,1,2].map(i=>{const d=new Date(TODAY.getFullYear(),TODAY.getMonth()-1-i,1);return `<option value="${mkey(d)}">${MONL[d.getMonth()]} ${d.getFullYear()}</option>`}).join('');
  const p=S.profile;
  openLayer(`<div><div class="eyebrow">Month close</div><h2 style="margin-top:4px">Three numbers, two minutes.</h2><p class="muted small" style="margin-top:6px">These refresh your runway, forecast and advisor. Take them from your bank statement and books.</p></div>
  <form class="stack" data-form="close">
   <div class="field"><label for="cl-m">Month</label><select class="input" id="cl-m" name="m">${opts}</select></div>
   <div class="grid g-3" style="gap:10px">
    <div class="field"><label for="cl-r">Sales</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="any" id="cl-r" name="rev" required value="${(p.rev/1e5).toFixed(1)}"><span class="suf">L</span></div></div>
    <div class="field"><label for="cl-s">Spend</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="any" id="cl-s" name="spend" required value="${(p.spend/1e5).toFixed(1)}"><span class="suf">L</span></div></div>
    <div class="field"><label for="cl-c">Bank balance</label><div class="money"><span class="pre">₹</span><input class="input num" type="number" step="any" id="cl-c" name="cash" required value="${(p.cash/1e5).toFixed(1)}"><span class="suf">L</span></div></div>
   </div>
   <div class="field"><label for="cl-file">Or fill these from a bank statement (CSV)</label><input class="input" type="file" id="cl-file" accept=".csv,text/csv"><span class="small muted" id="cl-note">The file is read on your device and never uploaded. Only the totals you save are kept.</span></div>
   <div><div class="lbl" style="margin-bottom:6px">Connect your books</div>${zohoBlock()}</div>
   <div class="row"><button class="btn primary">Close the month</button><button type="button" class="btn ghost" data-act="close-layer">Cancel</button></div>
  </form>`);
}
const layer=document.getElementById('layer');
function openLayer(html){layer.innerHTML=`<div class="modal-bg" data-bg><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;layer.querySelector('[data-bg]').addEventListener('click',e=>{if(e.target.dataset.bg!==undefined)closeLayer()})}
function closeLayer(){layer.innerHTML=''}
let toastT;function toast(t){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true},2600)}

/* ================= charts ================= */
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function afterRender(){
  if(UI.view==='cash'){drawCash();drawSpark()}
}
function drawCash(){
  const box=document.getElementById('chart13');if(!box)return;
  const W=Math.max(300,box.clientWidth),H=W<520?240:290,pad={l:W<520?44:58,r:16,t:22,b:30};
  const base=forecast(false),sc=anyScen()?forecast(true):null;
  const pts=[base[0].open,...base.map(w=>w.close)];const spts=sc?[sc[0].open,...sc.map(w=>w.close)]:null;
  const safety=S.profile.spend||0;
  const all=pts.concat(spts||[],[0,safety]);let mn=Math.min(...all),mx=Math.max(...all);const span=mx-mn||1;mn-=span*.06;mx+=span*.1;
  // nice ticks
  const step=niceStep((mx-mn)/4);const t0=Math.ceil(mn/step)*step;const ticks=[];for(let v=t0;v<=mx;v+=step)ticks.push(v);
  const x=i=>pad.l+(W-pad.l-pad.r)*i/13,y=v=>pad.t+(H-pad.t-pad.b)*(1-(v-mn)/(mx-mn));
  const line=a=>a.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area=a=>line(a)+`L${x(13)},${y(Math.max(mn,0))}L${x(0)},${y(Math.max(mn,0))}Z`;
  const ink=css('--ink'),muted=css('--muted'),lineC=css('--line'),acc=css('--accent'),warn=css('--warn'),bad=css('--bad');
  const main=spts||pts;const endV=main[13];
  let svg=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bank balance forecast for 13 weeks">
   <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${spts?acc:muted}" stop-opacity=".22"/><stop offset="1" stop-color="${spts?acc:muted}" stop-opacity="0"/></linearGradient></defs>
   ${ticks.map(v=>`<line x1="${pad.l}" x2="${W-pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="${lineC}" stroke-width="1"/><text x="${pad.l-8}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="${muted}" font-family="IBM Plex Mono,monospace">${inr(v).replace('₹','')}</text>`).join('')}
   ${mn<0?`<rect x="${pad.l}" y="${y(0)}" width="${W-pad.l-pad.r}" height="${H-pad.b-y(0)}" fill="${bad}" opacity=".08"/><line x1="${pad.l}" x2="${W-pad.r}" y1="${y(0)}" y2="${y(0)}" stroke="${bad}" stroke-width="1.5"/><text x="${W-pad.r}" y="${y(0)+14}" text-anchor="end" font-size="11" fill="${bad}" font-weight="700">Out of cash</text>`:''}
   ${safety>0&&safety>mn&&safety<mx?`<line x1="${pad.l}" x2="${W-pad.r}" y1="${y(safety)}" y2="${y(safety)}" stroke="${warn}" stroke-width="1.5" stroke-dasharray="5 4"/>`:''}
   <path d="${area(main)}" fill="url(#ga)"/>
   ${spts?`<path d="${line(pts)}" fill="none" stroke="${muted}" stroke-width="2" stroke-dasharray="4 4"/>`:''}
   <path d="${line(main)}" fill="none" stroke="${spts?acc:ink}" stroke-width="2.6" stroke-linejoin="round"/>
   ${[0,2,4,6,8,10,12].filter(i=>W>=520||i%4===0).map(i=>`<text x="${x(i+0.5)}" y="${H-8}" text-anchor="middle" font-size="11" fill="${muted}" font-family="IBM Plex Mono,monospace">${fmtD(base[i].ws)}</text>`).join('')}
   <circle cx="${x(13)}" cy="${y(endV)}" r="5" fill="${endV<0?bad:(spts?acc:ink)}" stroke="${css('--surface')}" stroke-width="2"/>
   <text x="${x(13)-8}" y="${y(endV)-10}" text-anchor="end" font-size="12" font-weight="700" fill="${endV<0?bad:ink}">${inr(endV)}</text>
   <line id="hov" x1="0" x2="0" y1="${pad.t}" y2="${H-pad.b}" stroke="${muted}" stroke-width="1" opacity="0"/>
   <rect x="${pad.l}" y="${pad.t}" width="${W-pad.l-pad.r}" height="${H-pad.t-pad.b}" fill="transparent" id="hit"/>
  </svg><div class="tip" id="tip" hidden></div>`;
  box.innerHTML=svg;box.style.minHeight=H+'px';
  const hit=box.querySelector('#hit'),hov=box.querySelector('#hov'),tip=box.querySelector('#tip');
  const show=ev=>{const r=box.getBoundingClientRect();const cx=(ev.touches?ev.touches[0].clientX:ev.clientX)-r.left;const i=clamp(Math.round((cx-pad.l)/((W-pad.l-pad.r)/13)),1,13);const w=(sc||base)[i-1];
    hov.setAttribute('x1',x(i));hov.setAttribute('x2',x(i));hov.setAttribute('opacity',1);tip.hidden=false;tip.style.left=clamp(x(i),80,W-80)+'px';tip.style.top=(y(main[i])-12)+'px';
    tip.innerHTML=`<b>Week of ${fmtD(w.ws)}</b><br>In ${inr(w.inflow)} · Out ${inr(w.outflow)}<br>Balance <b>${inr(w.close)}</b>${sc?`<br><span style="opacity:.7">Without what-ifs: ${inr(base[i-1].close)}</span>`:''}`};
  hit.addEventListener('mousemove',show);hit.addEventListener('touchstart',show,{passive:true});
  hit.addEventListener('mouseleave',()=>{tip.hidden=true;hov.setAttribute('opacity',0)});
}
function niceStep(raw){const p=Math.pow(10,Math.floor(Math.log10(Math.max(raw,1))));const n=raw/p;return (n<1.5?1:n<3?2:n<7?5:10)*p}
function drawSpark(){
  const box=document.getElementById('spark');if(!box)return;const h=S.history.slice(-6);if(h.length<2)return;
  const W=Math.max(240,box.clientWidth),H=150,pad={l:8,r:8,t:16,b:22};
  const vals=h.flatMap(r=>[r.rev,r.spend]);const mx=Math.max(...vals)*1.1;
  const bw=(W-pad.l-pad.r)/h.length;const y=v=>pad.t+(H-pad.t-pad.b)*(1-v/mx);
  const good=css('--good'),bad=css('--bad'),muted=css('--muted'),acc=css('--accent'),pop=css('--pop');
  box.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly sales and spend">
  ${h.map((r,i)=>{const x0=pad.l+bw*i+bw*.18,w=bw*.3;return `<rect x="${x0}" y="${y(r.rev)}" width="${w}" height="${H-pad.b-y(r.rev)}" rx="3" fill="${acc}"/><rect x="${x0+w+2}" y="${y(r.spend)}" width="${w}" height="${H-pad.b-y(r.spend)}" rx="3" fill="${pop}"/><text x="${pad.l+bw*i+bw/2}" y="${H-6}" text-anchor="middle" font-size="11" fill="${muted}" font-family="IBM Plex Mono,monospace">${mlabel(r.m).split(' ')[0]}</text>`}).join('')}
  </svg><div class="legend" style="margin-top:4px"><span><i style="background:${acc};height:8px;width:8px;border-radius:2px"></i>Sales</span><span><i style="background:${pop};height:8px;width:8px;border-radius:2px"></i>Spend</span></div>`;
}
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!OB&&S&&S.profile)afterRender()},150)});

/* ================= boot ================= */
(async function boot(){
  const h=(location.hash||'').slice(1);if(NAV.some(n=>n[0]===h))UI.view=h;
  app.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;color:var(--muted)">Loading your plan…</div>';
  try{
    const r=await fetch('/api/state',{cache:'no-store'});
    if(r.status===401){location.href='/login';return}
    const j=await r.json();
    serverVersion=j.version;S=j.state;GP.role=j.role;GP.user=j.user;GP.zoho=j.zoho;
  }catch(e){app.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;text-align:center;padding:16px">Could not load your plan. Check your connection and refresh.</div>';return}
  render();paintSync();
  const zq=new URLSearchParams(location.search).get('zoho');
  if(zq){const msg={connected:'Zoho Books connected and synced.',sync_failed:'Zoho Books connected, but the first sync failed. Try Sync now.',failed:'Could not connect Zoho Books. Try again.',denied:'Zoho Books was not connected.',owner_only:'Only the account owner can connect Zoho Books.',not_configured:'Zoho Books isn’t set up on this server yet.'}[zq];if(msg)toast(msg);try{history.replaceState(null,'',location.pathname+location.hash)}catch(_){}}
})();

})();
