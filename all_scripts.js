window.DEMO_DATA = (() => {
  // Deterministic fictional data. No API calls, no personal or clinical data.
  let seed = 2718281828;
  const rnd = () => ((seed ^= seed << 13, seed ^= seed >>> 17, seed ^= seed << 5) >>> 0) / 4294967296;
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(0.000001, rnd()))) * Math.cos(2 * Math.PI * rnd());
  const bound = (v, a, b) => Math.max(a, Math.min(b, v));
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date());
  const obj = Object.fromEntries(parts.map(p => [p.type,p.value]));
  const today = Date.UTC(Number(obj.year), Number(obj.month)-1,Number(obj.day));
  const count = 1160; // ~3.2 years; shorter time selections all have sufficient history.
  const records = [];
  let trueWeight = 84.9;
  let rollingSteps = 8800;
  let dietaryDrift = 0;
  for (let i=0;i<count;i++) {
    const date = new Date(today - (count - i - 1) * 86400000);
    const iso = date.toISOString().slice(0,10);
    const weekday = date.getUTCDay();
    const weekend = weekday===0 || weekday===6;
    const stepsFull = Math.round(bound(8650 + 1550*Math.sin(i/41) + 920*Math.sin(i/9.5) + (weekend ? -1150 : 400) + 1250*normal(),2000,16500));
    rollingSteps = rollingSteps*0.96 + stepsFull*0.04;
    // The maintenance *base* changes gradually; modest day-specific walking credit remains.
    const budgetMid = 2150 - 0.012*i + 40*Math.sin(i/148) + .010*(rollingSteps-8700) + .010*(stepsFull-rollingSteps);
    const budgetLowFull = Math.round(budgetMid-105);
    const budgetHighFull = Math.round(budgetMid+105);
    // A persistent slow dietary trend, with plausible but restrained daily variation.
    dietaryDrift = .96*dietaryDrift + 8*normal();
    const intakeFull = Math.round(bound(2145 - .025*i + 94*Math.sin(i/95) + 26*Math.sin(i/27) + dietaryDrift + 28*normal(),1660,2600));
    // Nutrient grams explain the calorie total (4/4/9 and ~2 kcal/g fibre).
    const proteinFull = Math.round(bound(intakeFull*(.239 + .018*Math.sin(i/33) + .012*normal())/4,80,188));
    const fibreFull = Math.round(bound(27 + 4*Math.sin(i/30) + 3.4*normal(),15,42));
    const fatsFull = Math.round(bound(intakeFull*(.307 + .015*Math.sin(i/25) + .012*normal())/9,43,104));
    const carbsFull = Math.max(115,Math.round((intakeFull-4*proteinFull-9*fatsFull-2*fibreFull)/4));
    // Keep actual calorie energy consistent to within normal integer rounding.
    const caloriesFull = 4*proteinFull+4*carbsFull+9*fatsFull+2*fibreFull;
    const waterFull = Math.round(bound(2200 + 320*Math.sin(i/31) + 200*normal() + .04*(stepsFull-8700),900,3500));
    // Small sustained intake/expenditure imbalance affects the slow bodyweight trend.
    trueWeight += bound((caloriesFull - budgetMid)/7700,-.048,.048);
    // Noise includes water/contents fluctuation, not mistaken for fat gain.
    const weightActual = Math.round((trueWeight + .24*normal())*100)/100;
    const measured = rnd() < (weekend ? .46 : .77);
    const isToday = i===count-1;
    const frac = isToday ? .66 : 1;
    const protein = Math.round(proteinFull*frac);
    const fats = Math.round(fatsFull*frac);
    const fibre = Math.round(fibreFull*frac);
    const carbs = Math.round(carbsFull*frac);
    const calories = 4*protein + 9*fats + 2*fibre + 4*carbs;
    const steps = Math.round(stepsFull*(isToday ? .73 : 1));
    const water = Math.round(waterFull*frac);
    records.push({date:iso,weight:measured?weightActual:null,targetWeight:78,calories,budgetLow:budgetLowFull,budgetHigh:budgetHighFull,budget:Math.round(budgetMid),protein,proteinGoal:125,carbs,fats,fibre,fibreGoal:30,steps,stepsGoal:10000,water,waterGoal:2500,partial:isToday});
  }
  // No fabricated missing weights. All nutrient-to-calorie checks are consistent by construction.
  return records;
})();
/* PieChart v0.1.014 — visual prototype, deliberately no external services. */
(() => {
  'use strict';
  let DATA = window.DEMO_DATA || [];
  const svg=document.getElementById('chart');
  const host=document.querySelector('.chart-shell');
  const tooltip=document.getElementById('tooltip');
  
    const NS='http://www.w3.org/2000/svg';
  const defaultKeys=['weight','steps','water','calories','fibre','protein','fats','carbs'];
  const loadOrder=()=>{
    try {const k=JSON.parse(localStorage.getItem('pieChartMetricOrderV014'));return Array.isArray(k)&&k.length===8&&defaultKeys.every(x=>k.includes(x))?k:defaultKeys.slice();}
    catch{return defaultKeys.slice();}
  };
  let keys=loadOrder();
  const coreKeys=['steps','weight','calories','water'];
  const optionalKeys=new Set(['protein','carbs','fats','fibre']);
  const hiddenInPortrait=new Set(['protein','carbs','fats','fibre']);
  const colors={weight:'#3377e1',calories:'#ed9d11',protein:'#56a52b',carbs:'#1c9bf3',fats:'#ef5c84',fibre:'#9b72b4',steps:'#9476d4',water:'#27bfd4'};
  const labels={weight:'Weight',calories:'Calories',protein:'Protein',carbs:'Carbs',fats:'Fats',fibre:'Fibre',steps:'Steps',water:'Water'};
  const units={weight:'kg',calories:'kcal',protein:'g',carbs:'g',fats:'g',fibre:'g',steps:'steps',water:'L'};
  const goals={steps:'stepsGoal',water:'waterGoal',protein:'proteinGoal',fibre:'fibreGoal'};
  const active=Object.fromEntries(keys.map(k=>[k,true]));
  const shown=k=>active[k];
  let current=[], scales={},geometry=null, hovered=-1, focusedAxis='calories';
  let daysVisible=100;
  const MIN_DAYS=7;
  const portraitView=window.matchMedia('(orientation:portrait)');
  let chartRoot=svg;
  function pointerLogical(e){
    const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    try{return p.matrixTransform(chartRoot.getScreenCTM().inverse());}
    catch{const r=host.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  }


  const fmt=v=>Math.round(v).toLocaleString('en-NZ');
  const one=v=>Number(v).toFixed(1);
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const niceDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'});
  const longDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const valueFor=(k,d)=>d[k]==null?null:(k==='water'?d[k]/1000:d[k]);
  const goalFor=(k,d)=>k==='water'?d.waterGoal/1000:d[goals[k]];
  function el(tag,attrs={},parent=chartRoot){
    const node=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));
    if(parent)parent.appendChild(node);
    return node;
  }
  function quantile(source,q){
    const a=source.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!a.length)return null;
    const n=(a.length-1)*q,l=Math.floor(n),h=Math.ceil(n);
    return a[l]*(h-n)+a[h]*(n-l);
  }
  function rangeData(){
    const completed=DATA.filter(d=>!d.partial);
    const daily=completed.slice(-Math.max(MIN_DAYS,Math.min(completed.length,Math.round(daysVisible))));
    // Daily observations remain literal daily slots through 90 days.
    // Long time windows use true group averages, marked clearly on inspection.
    if(daily.length<=90) return daily;
    const bucketSize=daily.length<=210?3:daily.length<=400?7:daily.length<=800?14:28;
    const pending=[];
    const grouped=[];
    // Chunk from the right to keep equally sized recent historical periods.
    for(let finish=completed.length;finish>0;finish-=bucketSize){
      const start=Math.max(0,finish-bucketSize),chunk=completed.slice(start,finish);
      const avg=(key)=>{
        const vals=chunk.map(d=>d[key]).filter(Number.isFinite);
        return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
      };
      const weights=chunk.map(d=>d.weight).filter(Number.isFinite);
      grouped.unshift({
        date:chunk.at(-1).date,from:chunk[0].date,daysCount:chunk.length,
        weight:weights.length?avg('weight'):null,
        weightLo:weights.length?Math.min(...weights):null,
        weightHi:weights.length?Math.max(...weights):null,
        targetWeight:avg('targetWeight'),calories:avg('calories'),
        budgetLow:avg('budgetLow'),budgetHigh:avg('budgetHigh'),
        protein:avg('protein'),proteinGoal:avg('proteinGoal'),fibre:avg('fibre'),fibreGoal:avg('fibreGoal'),carbs:avg('carbs'),fats:avg('fats'),
        steps:avg('steps'),stepsGoal:avg('stepsGoal'),water:avg('water'),waterGoal:avg('waterGoal'),
        partial:false,summary:true,weightMeasurements:weights.length
      });
    }
    return grouped; // live today is shown only in the attached readouts
  }
  function metricScales(rows){
    const visible=keys.filter(shown);
    const n=visible.length;
    const output={};
    if(!n) return output;
    const topCentre=n===1?0.54:0.94;
    const bottomCentre=n===1?0.54:0.11;
    const spacing=n>1?(topCentre-bottomCentre)/(n-1):0;
    visible.forEach((k,index)=>{
      const centre=n===1?0.54:(topCentre-index*spacing);
      const amplitude=n===1?0.40:Math.min(0.15,spacing*0.50,centre-bottomCentre+spacing*0.2,topCentre-centre+spacing*0.2);
      let values=rows.filter(d=>!d.partial).map(d=>valueFor(k,d)).filter(Number.isFinite);
      if(k==='steps'||k==='water'||k==='protein'||k==='fibre')values=values.concat(rows.map(d=>goalFor(k,d)).filter(Number.isFinite));
      if(k==='calories')values=values.concat(rows.flatMap(d=>[d.budgetLow,d.budgetHigh]).filter(Number.isFinite));
      if(k==='weight') values=values.concat(extremaForWeight(rows).flatMap(d=>[d.lo,d.hi]).filter(Number.isFinite));
      if(!values.length){output[k]={centre,offset:0,scale:0,amplitude};return;}
      const lo=quantile(values,.03),hi=quantile(values,.97);
      const mid=(lo+hi)/2;
      const minHalf={weight:.20,water:.20,calories:90,steps:1100,protein:8,fibre:3,carbs:12,fats:8}[k]||1;
      const half=Math.max((hi-lo)/2,minHalf);
      output[k]={centre,offset:mid,scale:amplitude/(half*1.18),amplitude};
    });
    return output;
  }
  function pos(k,v){const s=scales[k];return s&&Number.isFinite(v)?s.centre+(v-s.offset)*s.scale:null;}
  function textValue(k,n){
    if(!Number.isFinite(n))return 'not recorded';
    if(k==='weight')return n.toFixed(2)+' kg';
    if(k==='water')return one(n)+' L';
    if(k==='steps')return fmt(n);
    return fmt(n)+' '+units[k];
  }
  function numericTick(k,n){
    if(k==='weight')return n.toFixed(2);
    if(k==='water')return n.toFixed(1);
    return fmt(n);
  }
  function line(g,samples,x,y,colour,width,opacity,dash=''){
    let path='',active=false;
    samples.forEach((v,i)=>{
      if(v===null||!Number.isFinite(v)){active=false;return;}
      path+=(active?' L ':' M ')+x(i).toFixed(2)+' '+y(v).toFixed(2);
      active=true;
    });
    if(!path)return;
    const args={d:path,fill:'none',stroke:colour,'stroke-width':width,'stroke-opacity':opacity,'stroke-linejoin':'round','stroke-linecap':'round'};
    if(dash)args['stroke-dasharray']=dash;
    el('path',args,g);
  }
  function closedRibbon(top,bottom,x,y){
    let paths=[],start=-1;
    for(let i=0;i<=top.length;i++){
      const good=i<top.length&&Number.isFinite(top[i])&&Number.isFinite(bottom[i]);
      if(good&&start<0)start=i;
      if(!good&&start>=0){
        if(i-start>1){
          let d='M '+x(start)+' '+y(top[start]);
          for(let n=start+1;n<i;n++)d+=' L '+x(n)+' '+y(top[n]);
          for(let n=i-1;n>=start;n--)d+=' L '+x(n)+' '+y(bottom[n]);
          paths.push(d+' Z');
        }
        start=-1;
      }
    }
    return paths.join(' ');
  }
  const WEIGHT_WINDOW_DAYS=7;
  const MS_DAY=86400000;
  let weighed=DATA.filter(d=>Number.isFinite(d.weight)).map(d=>({t:Date.parse(d.date+'T00:00:00Z'),weight:d.weight}));
  function windowWeight(date,extraDays=0){
    const centre=Date.parse(date+'T00:00:00Z'), radius=(WEIGHT_WINDOW_DAYS-1)/2*MS_DAY+extraDays*MS_DAY;
    const near=weighed.filter(w=>Math.abs(w.t-centre)<=radius);
    return near.length?{lo:Math.min(...near.map(w=>w.weight)),hi:Math.max(...near.map(w=>w.weight))}:{lo:null,hi:null};
  }
  function extremaForWeight(rows){
    return rows.map(d=>d.summary?{lo:d.weightLo,hi:d.weightHi}:windowWeight(d.date));
  }
  function smoothBound(points){
    // Monotone cubic Hermite: runs through every measured rolling extreme
    // without spline overshoots (which could miss an actual high or low).
    if(!points.length)return '';
    if(points.length===1)return `M ${points[0][0]} ${points[0][1]}`;
    const d=[];
    for(let i=0;i<points.length-1;i++)d.push((points[i+1][1]-points[i][1])/(points[i+1][0]-points[i][0]));
    const m=points.map((_,i)=>i===0?d[0]:i===points.length-1?d.at(-1):d[i-1]*d[i]<=0?0:(2*d[i-1]*d[i])/(d[i-1]+d[i]));
    let path=`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
    for(let i=0;i<d.length;i++){
      const [x0,y0]=points[i],[x1,y1]=points[i+1],h=(x1-x0);
      if(Math.abs(h)<1e-6)continue;
      const c1x=x0+h/3,c1y=y0+m[i]*h/3,c2x=x1-h/3,c2y=y1-m[i+1]*h/3;
      path+=` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
    return path;
  }
  function compressTurningPoints(points,key){
    const clean=points.filter(p=>Number.isFinite(p[key]));
    if(clean.length<=2)return clean;
    const out=[clean[0]];
    for(let i=1;i<clean.length-1;i++){
      const prev=clean[i-1][key], curr=clean[i][key], next=clean[i+1][key];
      const d1=curr-prev, d2=next-curr;
      if((d1===0&&d2===0))continue;
      if(d1===0||d2===0||Math.sign(d1)!==Math.sign(d2)) out.push(clean[i]);
    }
    out.push(clean.at(-1));
    if(out.length<4){
      const step=Math.max(1,Math.floor(clean.length/4));
      for(let i=step;i<clean.length-1;i+=step){
        if(!out.includes(clean[i])) out.splice(out.length-1,0,clean[i]);
      }
      out.sort((a,b)=>a.x-b.x);
    }
    return out;
  }
  function weightEnvelope(rows, edges, widths, y){
    if(rows.length<2)return null;
    const centres=rows.map((_,i)=>edges[i]+widths[i]/2);
    const raw=[];
    if(!rows[0].summary){
      for(let n=4;n>=1;n--){
        const date=new Date(Date.parse(rows[0].date+'T00:00:00Z')-n*MS_DAY).toISOString().slice(0,10);
        const v=windowWeight(date);
        if(Number.isFinite(v.lo)||Number.isFinite(v.hi)) raw.push({x:centres[0]-n*widths[0],...v});
      }
    }
    rows.forEach((d,i)=>{
      const v=d.summary?{lo:d.weightLo,hi:d.weightHi}:windowWeight(d.date);
      if(Number.isFinite(v.lo)||Number.isFinite(v.hi)) raw.push({x:centres[i],...v});
    });
    if(!rows.at(-1).summary){
      for(let n=1;n<=2;n++){
        const date=new Date(Date.parse(rows.at(-1).date+'T00:00:00Z')+n*MS_DAY).toISOString().slice(0,10);
        const v=windowWeight(date);
        if(Number.isFinite(v.lo)||Number.isFinite(v.hi)) raw.push({x:centres.at(-1)+n*widths.at(-1),...v});
      }
    }
    if(raw.length<2)return null;
    const upperPts=compressTurningPoints(raw,'hi');
    const lowerPts=compressTurningPoints(raw,'lo');
    if(upperPts.length<2||lowerPts.length<2)return null;
    const upper=upperPts.map(p=>[p.x,y(pos('weight',p.hi))]);
    const lower=lowerPts.map(p=>[p.x,y(pos('weight',p.lo))]);
    const upperPath=smoothBound(upper), lowerPath=smoothBound(lower);
    // Build a ribbon that stays open at the left edge and smoothly returns along the lower boundary.
    const shape=upperPath+' L '+lower.at(-1)[0].toFixed(2)+' '+lower.at(-1)[1].toFixed(2)+
      lower.slice().reverse().map((p,i)=> (i? ' L ':' ')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join('')+' Z';
    return {top:upperPath,bottom:lowerPath,shape};
  }
  function gradientDefs(){
    const defs=el('defs');
    for(const k of keys){
      const grad=el('linearGradient',{id:'fade-'+k,x1:'0%',y1:'0%',x2:'0%',y2:'100%'},defs);
      el('stop',{offset:'0%','stop-color':colors[k],'stop-opacity':k==='weight'?.20:.20},grad);
      el('stop',{offset:'100%','stop-color':colors[k],'stop-opacity':0},grad);
    }
  }
  function recentReference(k,rows){
    return [...rows].reverse().find(d=>!d.partial&&Number.isFinite(valueFor(k,d)))
       || [...DATA].reverse().find(d=>!d.partial&&Number.isFinite(valueFor(k,d)));
  }
  function dayMarks(group,k,rows,x,y,pw,ph,emphasis=1){
    if(!shown(k))return;
    const fadeHeight=Math.max(2,ph*.036),c=colors[k];
    rows.forEach((d,i)=>{
      const inProgress=Boolean(d.partial);
      if(k==='weight'&&d.summary)return; // never portray a multi-day average as a weigh-in
      const direct=valueFor(k,d);
      if(!Number.isFinite(direct))return;
      const reference=inProgress?recentReference(k,rows):null;
      const level=inProgress&&reference?valueFor(k,reference):direct;
      const v=pos(k,level);
      if(v===null)return;
      const slot=geometry.slotWidths[i],px=geometry.edges[i],py=y(v);
      if(k==='weight'){
        if(inProgress){
          el('line',{x1:px,y1:py,x2:px+slot,y2:py,stroke:c,'stroke-opacity':.4,
            'stroke-width':1.3,'stroke-dasharray':'4 3','pointer-events':'none'},group);
        }else{
          el('circle',{cx:px+slot/2,cy:py,r:clamp(slot*.28,2.8,6.4),fill:c,
            'fill-opacity':emphasis,stroke:'#ffffff','stroke-width':1.3,'pointer-events':'none'},group);
        }
        return;
      }
      const h=Math.max(0,Math.min(fadeHeight,y(.018)-py));
      if(h>0)el('rect',{x:px,y:py,width:slot,height:h,fill:'url(#fade-'+k+')',
        opacity:emphasis*(inProgress?.25:1),'pointer-events':'none'},group);
      const sw=Math.min(2.5,Math.max(.35,slot*.18));
      if(inProgress){
        const goal=k==='calories'?(d.budgetLow+d.budgetHigh)/2:goalFor(k,d);
        // If no specific target exists, show current activity but don't
        // invent a progress percentage for carb/fat.
        const p=Number.isFinite(goal)&&goal>0?clamp(direct/goal,0,1):.6;
        el('line',{x1:px,y1:py,x2:px+slot,y2:py,stroke:c,'stroke-width':sw,
          'stroke-opacity':.40,'stroke-dasharray':'3 3','pointer-events':'none'},group);
        el('line',{x1:px,y1:py,x2:px+slot*p,y2:py,stroke:c,'stroke-width':Math.max(2,sw),
          'stroke-opacity':emphasis,'pointer-events':'none'},group);
      }else{
        el('line',{x1:px+sw/2,y1:py,x2:px+slot-sw/2,y2:py,stroke:c,'stroke-width':sw,
          'stroke-opacity':emphasis,'stroke-linecap':'butt','pointer-events':'none'},group);
      }
    });
  }
  function positionMetricButtons(){
    const panel=document.querySelector('.metric-row'),h=panel.clientHeight,w=panel.clientWidth;
    if(!h||!geometry)return;
    const buttons=[...panel.querySelectorAll('.metric')],on=keys.filter(k=>active[k]);
    const off=keys.filter(k=>!active[k]),more=document.getElementById('hidden-metrics-toggle');
    more.hidden=!off.length;more.textContent=`+ ${off.length} hidden`;
    for(const b of buttons)b.hidden=!active[b.dataset.key];
    const isPortrait=false; // labels always attach to lines on the right
    const labelH=on.length>=7?clamp(h/(on.length+1.6),24,32):clamp(h/(on.length+2),30,48);
    panel.classList.toggle('compact-series',on.length>=7);
    const labelW=isPortrait?Math.min(96,Math.max(36,(w-12)/Math.max(1,on.length))):w;
    on.forEach(k=>{
      const b=buttons.find(n=>n.dataset.key===k);
      const reference=recentReference(k,current);
      const anchorY=geometry.y(scales[k]?.centre||.5);
      if(isPortrait){
        const x=w-anchorY;
        b.style.setProperty('--label-w',labelW+'px');
        b.style.left=clamp(x-labelW/2,1,w-labelW-1)+'px';
        b.style.top='39px'; b.style.height='44px';
      }else{
        b.style.left='0';
        b.style.top=clamp(anchorY-labelH/2,15,h-labelH)+'px';
        b.style.height=labelH+'px';
      }
      b.dataset.anchorDate=reference?.date||'';
    });
  }
  function draw(){
    if(!DATA.length)return;
    current=rangeData();hovered=-1;tooltip.hidden=true;
    const r=host.getBoundingClientRect(),isPortrait=false; // chart is always upright
    const physicalWidth=Math.max(240,Math.round(r.width)),physicalHeight=Math.max(200,Math.round(r.height));
    const width=physicalWidth;
    const height=physicalHeight;
    const ml=clamp(width*.02,10,24),mr=0,mt=clamp(height*.008,2,8),mb=clamp(height*.085,22,34);
    const pw=width-ml-mr,ph=height-mt-mb;
    const typical=current.find(d=>!d.partial)?.daysCount||1;
    const visualWidths=current.map(d=>d.partial?Math.max(2.4,typical*2.25):(d.daysCount||1));
    const totalDays=visualWidths.reduce((a,b)=>a+b,0);
    const offsets=[];let running=0;for(const n of visualWidths){offsets.push(running);running+=n;}
    const edges=offsets.map(n=>ml+n/totalDays*pw);
    const slotWidths=visualWidths.map(d=>d/totalDays*pw);
    const x=i=>edges[i]+slotWidths[i]/2;
    const y=f=>mt+(1-f)*ph;
    geometry={ml,mr,mt,mb,pw,ph,x,y,edges,slotWidths,width,height};
    scales=metricScales(current);
    if(!shown(focusedAxis))focusedAxis=keys.find(shown)||null;
    svg.setAttribute('viewBox',`0 0 ${physicalWidth} ${physicalHeight}`);
    svg.replaceChildren();chartRoot=svg;gradientDefs();

    const cp=el('clipPath',{id:'plot-clip'},svg.querySelector('defs'));
    el('rect',{x:ml,y:mt,width:pw,height:ph},cp);
    const grid=el('g',{'aria-hidden':'true'});
    const dateAxis=el('g',{'id':'date-axis','aria-hidden':'true'});
    appendTimelineDates(dateAxis, Math.min(daysVisible,DATA.length), geometry, mt+ph+clamp(height*.048,16,25));
    el('line',{x1:ml,y1:mt+ph,x2:ml+pw,y2:mt+ph,stroke:'#aeb8c7','stroke-width':1.2},grid);
    // Budget range, defined by its daily low/high, not a single target line.
    const background=el('g',{'aria-label':'Budget and weight ranges','clip-path':'url(#plot-clip)'});
    if(shown('calories')){
      const top=current.map(d=>pos('calories',d.budgetHigh));
      const bottom=current.map(d=>pos('calories',d.budgetLow));
      const shape=closedRibbon(top,bottom,x,y);
      if(shape)el('path',{d:shape,fill:colors.calories,'fill-opacity':.14,stroke:'none'},background);
      line(background,top,x,y,colors.calories,1.2,.50,'5 5');
      line(background,bottom,x,y,colors.calories,1.2,.50,'5 5');
    }
    if(shown('weight')){
      const envelope=weightEnvelope(current,edges,slotWidths,y);
      if(envelope){
        el('path',{d:envelope.shape,fill:colors.weight,'fill-opacity':.28,stroke:'none'},background);
        el('path',{d:envelope.top,fill:'none',stroke:colors.weight,'stroke-opacity':.56,'stroke-width':1.5},background);
        el('path',{d:envelope.bottom,fill:'none',stroke:colors.weight,'stroke-opacity':.56,'stroke-width':1.5},background);
      }
    }
    // Step and water goals belong only to their own native-unit scales.
    const goalsLayer=el('g',{'aria-label':'Daily steps, water, protein, and fibre goals','clip-path':'url(#plot-clip)'});
    for(const k of ['steps','water','protein','fibre']){
      if(!shown(k))continue;
      const vals=current.map(d=>pos(k,goalFor(k,d)));
      line(goalsLayer,vals,x,y,colors[k],clamp(width*.0019,1.4,2.2),.62,'7 6');
    }
    // Daily readings are width-of-a-day horizontal dashes, never joined lines.
    const marks=el('g',{'aria-label':'Daily horizontal measurement marks','clip-path':'url(#plot-clip)'});
    const order=['weight','steps','water','calories','fibre','protein','fats','carbs'];
    for(const k of order)dayMarks(marks,k,current,x,y,pw,ph,optionalKeys.has(k)?.76:1);
    el('rect',{x:ml,y:mt,width:pw,height:ph,fill:'transparent','pointer-events':'all'},chartRoot).classList.add('interaction-area');
    updateMetrics(DATA.at(-1));
    positionMetricButtons();
  }
  function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function showTooltip(clientX,clientY){
    if(!geometry||!current.length)return;
    const rect=host.getBoundingClientRect(),g=geometry;
    const lx=pointerLogical({clientX,clientY}).x;
    let idx=g.edges.findIndex((v,i)=>lx>=v&&lx<v+g.slotWidths[i]);
    if(idx<0)idx=lx<g.ml?0:current.length-1;
    idx=clamp(idx,0,current.length-1);
    if(idx===hovered)return;hovered=idx;
    const d=current[idx];
    const rows=keys.filter(shown).map(k=>`<div class="tooltip-row"><span><i class="tooltip-dot" style="background:${colors[k]}"></i>${labels[k]}</span><span>${textValue(k,valueFor(k,d))}</span></div>`);
    if(shown('calories'))rows.push(`<div class="tooltip-row"><span>Calorie budget</span><span>${fmt(d.budgetLow)}–${fmt(d.budgetHigh)} kcal</span></div>`);
    const dateTitle=d.summary?`${niceDate(d.from)}–${niceDate(d.date)} · Average (${d.daysCount} days)`:`${safe(longDate(d.date))}${d.partial?' · In progress':''}`;
    tooltip.innerHTML=`<strong>${dateTitle}</strong>${rows.join('')}${d.summary?`<div style="font-size:11px;padding-top:4px;color:#62758d">Weight: ${d.weightMeasurements} actual weigh-ins; intake/activity: daily means.</div>`:''}`;
    tooltip.hidden=false;
    const tw=tooltip.offsetWidth,th=tooltip.offsetHeight;
    tooltip.style.left=clamp(clientX-rect.left+8,4,rect.width-tw-4)+'px';
    tooltip.style.top=clamp(clientY-rect.top-th/2,4,rect.height-th-4)+'px';
  }
  function updateMetrics(d){
    if(!d)return;
    const put=(id,value)=>{const n=document.getElementById(id);if(n)n.textContent=value;};
    const pct=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b>0?Math.round(a/b*100)+'%':'';
    const lastWeight=[...DATA].reverse().find(r=>Number.isFinite(r.weight));
    put('steps-percent',pct(d.steps,d.stepsGoal));
    put('steps-reading',fmt(d.steps)+' of '+fmt(d.stepsGoal));
    put('water-percent',pct(d.water,d.waterGoal));
    put('water-reading',one(d.water/1000)+' of '+one(d.waterGoal/1000)+' litres');
    put('weight-percent','');
    put('weight-reading',(d.weight==null?(lastWeight?lastWeight.weight.toFixed(2):'—'):d.weight.toFixed(2))+' kg · target '+one(d.targetWeight)+' kg');
    const middle=(d.budgetLow+d.budgetHigh)/2;
    put('calories-percent',pct(d.calories,middle));
    put('calories-reading',fmt(d.calories)+' of '+fmt(d.budgetLow)+'–'+fmt(d.budgetHigh));
    for(const k of ['protein','fibre','carbs','fats']){
      const goal=(k==='protein'||k==='fibre')?d[k+'Goal']:null;
      put(k+'-percent',goal?pct(d[k],goal):'');
      put(k+'-reading',goal?fmt(d[k])+' of '+fmt(goal)+' g':fmt(d[k])+' g');
    }
  }
  const metricPanel=document.querySelector('.metric-row');
  const metricButtons=[...metricPanel.querySelectorAll('.metric')];
  const hiddenToggle=document.getElementById('hidden-metrics-toggle');
  const hiddenPopup=document.getElementById('hidden-metrics-popup');
  const byKey=k=>metricButtons.find(b=>b.dataset.key===k);
  function rebuildHiddenMenu(){
    hiddenPopup.replaceChildren();
    for(const k of keys.filter(k=>!active[k])){
      const b=document.createElement('button');b.type='button';b.textContent='+ '+labels[k];
      b.addEventListener('click',()=>{hiddenPopup.hidden=true;hiddenToggle.setAttribute('aria-expanded','false');toggleMetric(k)});
      hiddenPopup.append(b);
    }
    if(!hiddenPopup.children.length)hiddenPopup.hidden=true;
  }
  hiddenToggle.addEventListener('click',e=>{
    e.stopPropagation();rebuildHiddenMenu();hiddenPopup.hidden=!hiddenPopup.hidden;
    hiddenToggle.setAttribute('aria-expanded',String(!hiddenPopup.hidden));
  });
  document.addEventListener('pointerdown',e=>{
    if(!hiddenPopup.hidden&&!hiddenPopup.contains(e.target)&&e.target!==hiddenToggle){hiddenPopup.hidden=true;hiddenToggle.setAttribute('aria-expanded','false')}
  });
  function syncOrder(){keys.forEach(k=>metricPanel.append(byKey(k)));rebuildHiddenMenu();draw();}
  function toggleMetric(k){
    active[k]=!active[k];const b=byKey(k);
    b.setAttribute('aria-pressed',String(active[k]));
    const eye=b.querySelector('.visibility-btn');
    eye.textContent=active[k]?'◉':'○';eye.setAttribute('aria-pressed',String(active[k]));
    eye.setAttribute('aria-label',(active[k]?'Hide ':'Show ')+labels[k]);
    rebuildHiddenMenu();draw();
  }
  function doubleTapMetric(k){if(k!=='steps')openEntry(k==='water'?'water':k==='weight'?'weight':'food');}
  let lastTap=null;
  function labelTap(k){
    const now=performance.now();
    if(lastTap?.k===k&&now-lastTap.time<440){lastTap=null;doubleTapMetric(k);}else lastTap={k,time:now};
  }
  let press=null;
  metricButtons.forEach(b=>{
    const k=b.dataset.key,eye=b.querySelector('.visibility-btn');
    b.setAttribute('aria-pressed',String(active[k]));
    eye.textContent=active[k]?'◉':'○';eye.setAttribute('aria-pressed',String(active[k]));
    eye.addEventListener('pointerdown',e=>e.stopPropagation());
    eye.addEventListener('click',e=>{e.stopPropagation();toggleMetric(k);});
    b.addEventListener('pointerdown',e=>{
      if(e.target.closest('.visibility-btn'))return;
      if(e.pointerType==='mouse'&&e.button!==0)return;
      // Pointer capture stays on the same element throughout the drag.
      press={b,id:e.pointerId,startY:e.clientY,startX:e.clientX,dragging:false,valid:true};
      try{b.setPointerCapture(e.pointerId)}catch{}
      press.timer=setTimeout(()=>{
        if(!press||press.b!==b||!press.valid)return;
        press.dragging=true;b.classList.add('dragging','drag-ready');
        if(navigator.vibrate)navigator.vibrate(25);
      },620);
    });
    b.addEventListener('pointermove',e=>{
      if(!press||press.b!==b||e.pointerId!==press.id)return;
      const moved=Math.hypot(e.clientX-press.startX,e.clientY-press.startY);
      if(!press.dragging){if(moved>12){press.valid=false;clearTimeout(press.timer)}return;}
      e.preventDefault();
      const delta=e.clientY-press.startY;
      b.style.transform=`translateY(${delta}px) scale(1.02)`;
    });
    function finish(e,cancel=false){
      if(!press||press.b!==b||e.pointerId!==press.id)return;
      const wasDrag=press.dragging;clearTimeout(press.timer);press=null;
      b.classList.remove('dragging','drag-ready');b.style.transform='';
      if(wasDrag&&!cancel){
        const others=keys.filter(x=>x!==k);
        const targetY=e.clientY;
        // Hidden labels have zero-size rectangles. Only plotted labels can act
        // as visual drop targets; preserve hidden items' relative order.
        const plotted=others.filter(x=>active[x]);
        const rank=plotted.filter(x=>targetY>(byKey(x).getBoundingClientRect().top+byKey(x).getBoundingClientRect().height/2)).length;
        const insertBefore=plotted[rank];
        const index=insertBefore?others.indexOf(insertBefore):plotted.length?others.indexOf(plotted.at(-1))+1:0;
        keys=others.slice();keys.splice(index,0,k);
        try{localStorage.setItem('pieChartMetricOrderV014',JSON.stringify(keys));}catch{}
        syncOrder();
      }
    }
    b.addEventListener('pointerup',e=>{
      if(!press||press.b!==b)return;
      const isTap=!press.dragging&&press.valid;
      finish(e,false);
      if(isTap)labelTap(k);
      e.preventDefault();
    });
    b.addEventListener('pointercancel',e=>finish(e,true));
    b.addEventListener('contextmenu',e=>e.preventDefault());
    b.addEventListener('click',e=>e.preventDefault());
    b.addEventListener('keydown',e=>{
      if(e.target!==b)return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();doubleTapMetric(k)}
      if(e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
        e.preventDefault();const i=keys.indexOf(k),j=clamp(i+(e.key==='ArrowDown'?1:-1),0,keys.length-1);
        if(i!==j){keys.splice(i,1);keys.splice(j,0,k);try{localStorage.setItem('pieChartMetricOrder',JSON.stringify(keys))}catch{}syncOrder()}
      }
    });
  });
  syncOrder();
  // Swipe directly on the timeline: dates move immediately, plotted data
  // reflows only when the finger lifts. No range selector or static readout.
  let gesture=null;
  function appendTimelineDates(group,days,g,labelY){
    // Every label represents a *fixed calendar date*, so as the visible span
    // changes, its X position slides continuously under the finger.
    const latestCompleted=[...DATA].reverse().find(d=>!d.partial)||DATA.at(-1);
    const end=Date.parse(latestCompleted.date+'T00:00:00Z')/MS_DAY;
    const start=end-days+1, maxLabels=clamp(Math.floor(g.width/85),4,12);
    const intervals=[1,2,3,5,7,10,14,21,30,45,60,90,120,180,365,730];
    const step=intervals.find(s=>days/s<=maxLabels-1)||730;
    const font=clamp(g.width*.012,10,16);
    for(let tick=Math.ceil(start/step)*step;tick<=end;tick+=step){
      const frac=(tick-start)/Math.max(1,days-1);
      const px=g.ml+frac*g.pw;
      if(px<g.ml+24||px>g.ml+g.pw-40)continue;
      const dt=new Date(tick*MS_DAY),iso=dt.toISOString().slice(0,10);
      const text=days>400?dt.toLocaleDateString('en-NZ',{month:'short',year:'2-digit',timeZone:'UTC'}):
        days>100?dt.toLocaleDateString('en-NZ',{day:'numeric',month:'short',timeZone:'UTC'}):niceDate(iso);
      const t=el('text',{x:px,y:labelY,'text-anchor':'middle',fill:'#283d5b',
          'font-size':font,'font-weight':800,
},group);t.textContent=text;
    }
    const newest=el('text',{x:g.ml+g.pw,y:labelY,'text-anchor':'end',fill:'#283d5b',
        'font-size':font,'font-weight':900,
},group);
    newest.textContent=niceDate(latestCompleted.date);
  }
  function previewTimeline(days){
    if(!geometry)return;
    svg.querySelector('#date-preview')?.remove();
    const g=geometry;
    const preview=el('g',{'id':'date-preview','aria-hidden':'true'});
    const axisTop=g.mt+g.ph+1;
    el('rect',{x:g.ml-2,y:axisTop,width:g.pw+4,height:g.height-axisTop,fill:'#fffaf2'},preview);
    el('line',{x1:g.ml,y1:axisTop,x2:g.ml+g.pw,y2:axisTop,stroke:'#aeb8c7','stroke-width':1},preview);
    appendTimelineDates(preview,days,g,axisTop+clamp(g.height*.05,16,25));
  }
  host.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,base:daysVisible,days:daysVisible,moving:false};
    try{host.setPointerCapture(e.pointerId)}catch{}
  });
  host.addEventListener('pointermove',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const physicalDx=e.clientX-gesture.x,physicalDy=e.clientY-gesture.y;
    const dx=physicalDx;
    const cross=physicalDy;
    if(Math.abs(dx)<8&&!gesture.moving)return;
    if(!gesture.moving&&Math.abs(cross)>Math.abs(dx)*1.5)return;
    gesture.moving=true;
    const plotWidth=geometry?.pw||host.clientWidth;
    gesture.days=clamp(Math.round(gesture.base*Math.exp(2.45*dx/plotWidth)),MIN_DAYS,DATA.length);
    previewTimeline(gesture.days);
    e.preventDefault();
  });
  function endTimelineGesture(e,cancelled=false){
    if(!gesture||gesture.id!==e.pointerId)return;
    const g=gesture;gesture=null;
    if(g.moving&&!cancelled){daysVisible=g.days;draw();return;}
    svg.querySelector('#date-preview')?.remove();
    if(!g.moving&&!cancelled)showTooltip(e.clientX,e.clientY);
  }
  host.addEventListener('pointerup',e=>endTimelineGesture(e));
  host.addEventListener('pointercancel',e=>endTimelineGesture(e,true));
  host.addEventListener('lostpointercapture',e=>{if(gesture&&gesture.id===e.pointerId)endTimelineGesture(e,true)});
  document.addEventListener('click',e=>{if(!host.contains(e.target)){tooltip.hidden=true;hovered=-1;}});
  const entryBackdrop=document.getElementById('entry-backdrop');
  const entryContent=document.getElementById('entry-content');
  const entryHeading=document.getElementById('entry-heading');
  const closeEntry=document.getElementById('entry-close');
  // Demo food database only; the real shared Food > Dish > Meal library will follow.
  const sampleLibrary=[
    {name:'Water',kind:'Food Item',fav:true,g:1000,water:1000,protein:0,carbs:0,fats:0,fibre:0},
    {name:'Oats',kind:'Food Item',fav:true,g:50,water:0,protein:8,carbs:28,fats:3.5,fibre:5},
    {name:'Apple',kind:'Food Item',fav:true,g:150,water:0,protein:.4,carbs:21,fats:.2,fibre:3.6},
    {name:'Oat milk',kind:'Food Item',fav:false,g:200,water:0,protein:2,carbs:13,fats:3,fibre:1.2},
    {name:'Porridge',kind:'Dish',fav:true,g:265,water:0,protein:10,carbs:47,fats:7,fibre:6},
    {name:'Berry porridge',kind:'Dish',fav:true,g:325,water:0,protein:11,carbs:54,fats:7,fibre:9},
    {name:'Chicken and rice',kind:'Meal',fav:false,g:420,water:0,protein:36,carbs:59,fats:12,fibre:5},
    {name:'Toast and fruit',kind:'Meal',fav:false,g:260,water:0,protein:7,carbs:40,fats:6,fibre:5}
  ];
  let selectedFood=null;
  function showEntry(kind,html){entryHeading.textContent=kind;entryContent.innerHTML=html;entryBackdrop.hidden=false;}
  function dismissEntry(){entryBackdrop.hidden=true;selectedFood=null;}
  closeEntry.addEventListener('click',dismissEntry);
  entryBackdrop.addEventListener('pointerdown',e=>{if(e.target===entryBackdrop)dismissEntry();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!entryBackdrop.hidden)dismissEntry();});
  function openEntry(type){
    const today=DATA.at(-1),lastMeasured=[...DATA].reverse().find(r=>r!==today&&Number.isFinite(r.weight));
    if(type==='water'){
      const recentsKey='pieChartWaterRecentMl';
      let recent=[];
      try{const saved=JSON.parse(localStorage.getItem(recentsKey));recent=Array.isArray(saved)?saved.filter(n=>Number.isFinite(n)&&n>0).slice(0,5):[250,500,330,750,200];}catch{recent=[250,500,330,750,200]}
      showEntry('Record water',`<div class="entry-form"><p>Tap a previously used amount to record it immediately.</p><div class="water-recents" id="water-recents"></div><form class="entry-form recent-form" id="water-new-form" hidden><label for="water-new-amount">New amount (mL)</label><input id="water-new-amount" type="number" inputmode="decimal" min="1" max="10000" step="1" value="250" required><button class="entry-affirm">Record amount</button></form><p class="entry-note">Recently used amounts are remembered on this device in the prototype.</p></div>`);
      const add=v=>{
        v=Math.round(Number(v));if(!Number.isFinite(v)||v<=0||v>10000)return;
        today.water+=v;recent=[v,...recent.filter(n=>n!==v)].slice(0,5);
        try{localStorage.setItem(recentsKey,JSON.stringify(recent))}catch{}
        dismissEntry();draw();
      };
      const row=document.getElementById('water-recents');
      for(const v of recent){const b=document.createElement('button');b.type='button';b.textContent=v>=1000?(v/1000).toFixed(v%1000?2:1)+' L':v+' mL';b.addEventListener('click',()=>add(v));row.append(b)}
      const newBtn=document.createElement('button');newBtn.type='button';newBtn.className='new-amount';newBtn.textContent='+ New amount';row.append(newBtn);
      newBtn.addEventListener('click',()=>{document.getElementById('water-new-form').hidden=false;document.getElementById('water-new-amount').focus()});
      document.getElementById('water-new-form').addEventListener('submit',e=>{e.preventDefault();add(document.getElementById('water-new-amount').value)});
    }else if(type==='weight'){
      const prev=lastMeasured?Number(lastMeasured.weight):80;
      const days=lastMeasured?Math.round((Date.parse(today.date)-Date.parse(lastMeasured.date))/MS_DAY):null;
      const startWeight=Math.round((today.weight??prev)*100)/100;
      showEntry('Record weight',`<form class="entry-form" id="weight-form">
        <p>${new Date(today.date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'})} · Previous ${days==null?'—':days+' day'+(days===1?'':'s')+' ago'} · ${lastMeasured?prev.toFixed(2)+' kg':'no previous reading'}</p>
        <div class="weight-reading" id="weight-reading">${startWeight.toFixed(2)} kg</div>
        <div class="weight-wheel-wrap"><div class="weight-ruler-frame"><canvas class="weight-ruler" id="weight-ruler" tabindex="0" role="slider" aria-label="Weight: swipe horizontally to change, gently for 0.01 kg or quickly for kilograms" aria-valuemin="20" aria-valuemax="400" aria-valuenow="${startWeight}"></canvas></div></div>
        <p class="weight-wheel-hint">Swipe left or right. Slow movement adjusts by 0.01 kg; a fast flick accelerates and coasts.</p>
        <button class="entry-affirm">Record weight</button></form>`);
      const wheel=document.getElementById('weight-ruler'),readout=document.getElementById('weight-reading');
      const MAX=40000,MIN=2000,PIXELS_PER_CENT=10;
      let position=startWeight*100,gestureW=null,velocity=0,animation=0;
      const safePos=p=>clamp(p,MIN,MAX);
      const show=()=>{
        const value=(Math.round(position)/100).toFixed(2);
        readout.textContent=value+' kg';wheel.setAttribute('aria-valuenow',value);
        paintRuler();
      };
      function paintRuler(){
        const box=wheel.getBoundingClientRect();if(!box.width)return;
        const ratio=window.devicePixelRatio||1;
        wheel.width=Math.round(box.width*ratio);wheel.height=Math.round(box.height*ratio);
        const ctx=wheel.getContext('2d');ctx.scale(ratio,ratio);
        const w=box.width,h=box.height,mid=w/2;
        const minTick=Math.floor(position-(mid+20)/PIXELS_PER_CENT);
        const maxTick=Math.ceil(position+(mid+20)/PIXELS_PER_CENT);
        ctx.textAlign='center';ctx.textBaseline='alphabetic';
        for(let tick=minTick;tick<=maxTick;tick++){
          if(tick<MIN||tick>MAX)continue;
          const x=mid+(tick-position)*PIXELS_PER_CENT;
          const major=tick%10===0,midpoint=tick%5===0;
          ctx.strokeStyle=major?'#637fa5':'#aabdd3';ctx.lineWidth=major?1.6:1;
          ctx.beginPath();ctx.moveTo(x,h*.45);ctx.lineTo(x,major?h*.78:midpoint?h*.67:h*.57);ctx.stroke();
          if(major){ctx.fillStyle='#354d70';ctx.font='bold 12px Arial';ctx.fillText((tick/100).toFixed(1),x,h*.94)}
        }
        ctx.fillStyle='#dd6c50';ctx.beginPath();ctx.moveTo(mid-7,12);ctx.lineTo(mid+7,12);ctx.lineTo(mid,27);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#dd6c50';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(mid,26);ctx.lineTo(mid,h*.78);ctx.stroke();
      }
      function stop(){if(animation)cancelAnimationFrame(animation);animation=0}
      function factor(speed){
        // 0.01 kg steps for careful movement; fast gestures scale exponentially.
        return Math.exp(Math.min(4.5,Math.max(0,speed-.25)*2));
      }
      wheel.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse'&&e.button!==0)return;
        stop();velocity=0;gestureW={id:e.pointerId,x:e.clientX,t:performance.now(),lastX:e.clientX,lastT:performance.now(),history:[]};
        try{wheel.setPointerCapture(e.pointerId)}catch{}
      });
      wheel.addEventListener('pointermove',e=>{
        if(!gestureW||gestureW.id!==e.pointerId)return;
        const now=performance.now(),dx=e.clientX-gestureW.lastX,dt=Math.max(1,now-gestureW.lastT);
        const pxSpeed=Math.abs(dx)/dt;
        position=safePos(position-dx/PIXELS_PER_CENT*factor(pxSpeed));
        const instant=(-dx/PIXELS_PER_CENT*factor(pxSpeed))/dt;
        gestureW.history.push({t:now,instant});
        gestureW.history=gestureW.history.filter(item=>now-item.t<110);
        velocity=.6*instant+.4*velocity;
        gestureW.lastX=e.clientX;gestureW.lastT=now;
        e.preventDefault();show();
      });
      wheel.addEventListener('pointerup',e=>{
        if(!gestureW||gestureW.id!==e.pointerId)return;
        const now=performance.now(),recent=now-gestureW.lastT;
        if(recent>90)velocity=0;
        gestureW=null;
        let v=clamp(velocity,-.85,.85),last=now;
        const glide=timestamp=>{
          const dt=Math.min(timestamp-last,40);last=timestamp;
          position=safePos(position+v*dt);v*=Math.exp(-dt/170);
          show();
          if(Math.abs(v)>.003&&position>MIN&&position<MAX)animation=requestAnimationFrame(glide);
          else{position=Math.round(position);show();animation=0}
        };
        if(Math.abs(v)>.006)animation=requestAnimationFrame(glide);
        else{position=Math.round(position);show()}
      });
      wheel.addEventListener('pointercancel',()=>{gestureW=null;stop();position=Math.round(position);show()});
      wheel.addEventListener('keydown',e=>{
        if(['ArrowLeft','ArrowRight','PageUp','PageDown'].includes(e.key)){
          e.preventDefault();stop();position=safePos(Math.round(position)+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:e.key==='PageUp'?100:-100));show();
        }
      });
      wheel.addEventListener('wheel',e=>{e.preventDefault();stop();position=safePos(Math.round(position)+(e.deltaY>0?-1:1));show()},{passive:false});
      requestAnimationFrame(show);
      document.getElementById('weight-form').addEventListener('submit',e=>{
        e.preventDefault();stop();const v=Math.round(position)/100;
        if(!Number.isFinite(v)||v<20||v>400)return;
        today.weight=v;
        weighed=DATA.filter(d=>Number.isFinite(d.weight)).map(d=>({t:Date.parse(d.date+'T00:00:00Z'),weight:d.weight}));
        dismissEntry();draw();
      });
    }else{
      showEntry('Record food, dish, or meal',`<form class="entry-form" id="food-form"><label for="food-search">Search saved foods, dishes, and meals</label><input id="food-search" placeholder="Search…" autocomplete="off"><div class="entry-results" id="food-results"></div><div id="food-choice"></div><p class="entry-note">Demo library and demo-day recording only. Shared recipes, ingredient editing, and Firebase will come in later development.</p><button class="entry-affirm" id="food-submit" disabled>Record</button></form>`);
      const search=document.getElementById('food-search'),results=document.getElementById('food-results');
      const choice=document.getElementById('food-choice');
      const renderResults=()=>{
        const q=search.value.trim().toLowerCase();
        results.replaceChildren();
        sampleLibrary.filter(d=>d.name.toLowerCase().includes(q)).sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)).forEach(item=>{
          const b=document.createElement('button');b.type='button';b.setAttribute('aria-selected',String(selectedFood===item));
          b.innerHTML=`<span>${safe(item.name)}</span><small>${item.kind}${item.fav?' · Favourite':''}</small>`;
          b.addEventListener('click',()=>{
            selectedFood=item;renderResults();
            choice.innerHTML=`<label for="food-g">Quantity (g or mL)</label><input id="food-g" type="number" inputmode="decimal" min="1" step="1" value="${item.g}" required><div class="entry-preview"><span>Calories (estimate)</span><b id="food-est">—</b><span>Protein · Carbs · Fats · Fibre</span><b id="food-macros">—</b></div>`;
            const inp=document.getElementById('food-g');
            function upd(){const f=Number(inp.value)/item.g;document.getElementById('food-est').textContent=Math.round((4*item.protein+4*item.carbs+9*item.fats+2*item.fibre)*f)+' kcal';document.getElementById('food-macros').textContent=[item.protein,item.carbs,item.fats,item.fibre].map(v=>(v*f).toFixed(1)+'g').join(' / ');}
            inp.addEventListener('input',upd);upd();document.getElementById('food-submit').disabled=false;
          });results.append(b);
        });
      };
      search.addEventListener('input',renderResults);renderResults();
      document.getElementById('food-form').addEventListener('submit',e=>{
        e.preventDefault();if(!selectedFood)return;
        const qty=Number(document.getElementById('food-g').value);if(qty<=0||!Number.isFinite(qty))return;
        const f=qty/selectedFood.g;const macros={protein:today.protein+selectedFood.protein*f,carbs:today.carbs+selectedFood.carbs*f,fats:today.fats+selectedFood.fats*f,fibre:today.fibre+selectedFood.fibre*f};
        for(const [k,v] of Object.entries(macros))today[k]=Math.round(v*10)/10;
        today.calories=Math.round(4*today.protein+4*today.carbs+9*today.fats+2*today.fibre);
        today.water+=Math.round(selectedFood.water*f);
        dismissEntry();draw();
      });
    }
  }
  // On touchscreen Chrome, the first user interaction may start fullscreen.
  // Browsers cannot auto-enter fullscreen on page load without user activation.
  let triedFullscreen=false;
  document.addEventListener('pointerup',e=>{
    if(triedFullscreen||!e.isTrusted||navigator.maxTouchPoints<1||!document.documentElement.requestFullscreen)return;
    triedFullscreen=true;
    if(document.fullscreenElement)return;
    document.documentElement.requestFullscreen().then(()=>{
      // Orientation is user-controlled: the same graph supports both portrait and landscape.
    }).catch(()=>{});
  },{capture:true});


  // Editable sample data. The packaged CSV is read automatically on GitHub Pages.
  // Local CSV import overrides it only on this device (demo mode).
  const CSV_COLUMNS=['date','weight','targetWeight','calories','budgetLow','budgetHigh','budget',
    'protein','proteinGoal','carbs','fats','fibre','fibreGoal','steps','stepsGoal','water','waterGoal','partial'];
  function cellsOfCsvLine(line){
    const result=[];let value='',quoted=false;
    for(let i=0;i<line.length;i++){
      const char=line[i];
      if(char==='"'){
        if(quoted&&line[i+1]==='"'){value+='"';i++}else quoted=!quoted;
      }else if(char===','&&!quoted){result.push(value.trim());value=''}else value+=char;
    }
    result.push(value.trim());return result;
  }
  function parseDummyCsv(text){
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
    if(!lines.length)throw new Error('CSV is empty');
    const header=cellsOfCsvLine(lines.shift());
    if(!CSV_COLUMNS.every(k=>header.includes(k)))throw new Error('CSV must contain: '+CSV_COLUMNS.join(', '));
    const parsed=lines.map((line,n)=>{
      const cells=cellsOfCsvLine(line),record={};
      header.forEach((key,i)=>{
        if(key==='date')record.date=cells[i];
        else if(key==='partial')record.partial=/^(true|1|yes)$/i.test(cells[i]||'');
        else record[key]=cells[i]===''||cells[i]==null?null:Number(cells[i].replace(/,/g,''));
      });
      if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||!Number.isFinite(Date.parse(record.date+'T00:00:00Z')))
        throw new Error('Invalid date on CSV row '+(n+2));
      for(const k of CSV_COLUMNS.filter(k=>!['date','partial','weight'].includes(k))){
        if(!Number.isFinite(record[k]))throw new Error('Invalid '+k+' on CSV row '+(n+2));
      }
      if(record.weight!==null&&!Number.isFinite(record.weight))throw new Error('Invalid weight on CSV row '+(n+2));
      return record;
    });
    if(parsed.length<2)throw new Error('CSV needs at least two dated records');
    parsed.sort((a,b)=>a.date.localeCompare(b.date));
    if(parsed.some((row,i)=>i>0&&row.date===parsed[i-1].date))throw new Error('Duplicate dates in CSV');
    return parsed;
  }
  function adoptDummyData(csv){
    const next=parseDummyCsv(csv);
    DATA=next;
    weighed=DATA.filter(d=>Number.isFinite(d.weight)).map(d=>({t:Date.parse(d.date+'T00:00:00Z'),weight:d.weight}));
    daysVisible=Math.min(30,DATA.length);
    draw();
    return next.length;
  }
  const SETTINGS_KEY='pieChartDemoCsvOverride';
  document.querySelector('.settings-button').addEventListener('click',()=>{
    showEntry('Load editable dummy data',`<div class="entry-form">
      <p>Edit <strong>dummy-data.csv</strong> in a spreadsheet or text editor. Changes to the CSV on GitHub Pages are read when the app loads. You can also import it here for immediate testing.</p>
      <label for="csv-file">Choose dummy-data.csv</label><input type="file" id="csv-file" accept=".csv,text/csv">
      <p id="csv-result" aria-live="polite"></p>
      <button type="button" class="entry-affirm" id="csv-reset">Use bundled data</button>
    </div>`);
    document.getElementById('csv-file').addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const csv=await file.text(),count=adoptDummyData(csv);
        let persisted=false;
        try{localStorage.setItem(SETTINGS_KEY,csv);persisted=true;}catch{}
        document.getElementById('csv-result').textContent='Loaded '+count+' dated records'+
          (persisted?' and saved on this device.':' for this session. Upload the CSV with the app for automatic loading.');
      }catch(error){document.getElementById('csv-result').textContent='Import failed: '+error.message;}
    });
    document.getElementById('csv-reset').addEventListener('click',async()=>{
      try{localStorage.removeItem(SETTINGS_KEY)}catch{}
      try{const res=await fetch('./dummy-data.csv',{cache:'no-store'});if(!res.ok)throw new Error();adoptDummyData(await res.text());}
      catch{DATA=window.DEMO_DATA||[];weighed=DATA.filter(d=>Number.isFinite(d.weight)).map(d=>({t:Date.parse(d.date+'T00:00:00Z'),weight:d.weight}));draw()}
      dismissEntry();
    });
  });
  async function loadPackagedCsv(){
    try{
      const override=localStorage.getItem(SETTINGS_KEY);
      if(override){adoptDummyData(override);return;}
    }catch{}
    if(!/^https?:$/.test(location.protocol))return; // standalone HTML fallback stays usable
    try{
      const response=await fetch('./dummy-data.csv',{cache:'no-store'});
      if(response.ok)adoptDummyData(await response.text());
    }catch(error){console.warn('Using included demo data:',error.message)}
  }

  new ResizeObserver(draw).observe(host);
  portraitView.addEventListener('change',()=>requestAnimationFrame(draw));
  draw();
  loadPackagedCsv();
})();
