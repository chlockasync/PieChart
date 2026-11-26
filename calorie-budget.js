/* PieChart v0.1.096 — no IO or data storage.
 * NASEM 2023 adult EER coefficients: Health Canada Dietary Reference Intakes.
 * Step energy: ACSM level-walking net O2 cost 0.1 ml/kg/m (~5 kcal/L O2).
 * Step category, stride length, flexible activity bounds, and intensity tiers
 * are disclosed product heuristics, not validated personalised predictions.
 * EER includes resting energy, ordinary life and digestion. Do NOT add TEF.
 */
(function(root){
'use strict';
const DAY=86400000,REFERENCE_STEPS=3000,ROUND=25;
const CO={
 male:{inactive:[753.07,-10.83,6.50,14.10],lowActive:[581.47,-10.83,8.30,14.94],active:[1004.82,-10.83,6.52,15.91],veryActive:[-517.88,-10.83,15.61,19.11]},
 female:{inactive:[584.90,-7.01,5.72,11.71],lowActive:[575.77,-7.01,6.60,12.14],active:[710.25,-7.01,6.54,12.34],veryActive:[511.83,-7.01,9.07,12.56]}
};
const RATE={
 lose:{gentle:[.05,.10],moderate:[.10,.15],strong:[.15,.20]},
 gain:{gentle:[.02,.05],moderate:[.05,.08],strong:[.08,.11]},
 maintain:{gentle:[-.025,.025],moderate:[-.025,.025],strong:[-.025,.025]}
};
const finite=Number.isFinite;
// Reuse the Activity Library's walking-stride estimate. Both the daily budget
// and recorded activities must interpret the same steps identically.
const walkingStrideMetres=heightCm=>root.PieChartActivityMath.strideMetres(heightCm,'Walking');
const clamp=(n,l,h)=>Math.min(h,Math.max(l,n));
function dateValue(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;
 const n=Date.parse(s+'T00:00:00Z');
 return finite(n)&&new Date(n).toISOString().slice(0,10)===s?n:NaN;
}
function ageOn(birth,date){
 if(!finite(dateValue(birth))||!finite(dateValue(date))||dateValue(birth)>dateValue(date))return null;
 const [y,m,d]=birth.split('-').map(Number),[Y,M,D]=date.split('-').map(Number);
 return Y-y-((M<m||(M===m&&D<d))?1:0);
}
function eer({age,heightCm,weightKg,sex},category='inactive'){
 const p=CO[sex]?.[category];
 return p?p[0]+p[1]*age+p[2]*heightCm+p[3]*weightKg:null;
}
function quantile(sorted,p){
 if(!sorted.length)return null;
 const i=(sorted.length-1)*p,k=Math.floor(i);
 return sorted[k]+(sorted[Math.min(sorted.length-1,k+1)]-sorted[k])*(i-k);
}
function collectSteps(rows,date){
 const d=dateValue(date),found=new Map();
 for(const row of Array.isArray(rows)?rows:[]){
  const t=dateValue(row?.date);
  if(!finite(t)||t>d||t<d-21*DAY||!Number.isInteger(row.steps)||row.steps<0||row.steps>100000)continue;
  found.set(row.date,{date:row.date,steps:row.steps,complete:row.complete===true});
 }
 const recent=[...found.values()].filter(s=>s.date<date&&s.complete).sort((a,b)=>a.date.localeCompare(b.date)).slice(-14);
 const sorted=recent.map(s=>s.steps).sort((a,b)=>a-b);
 return {today:found.get(date)||null,count:sorted.length,p20:quantile(sorted,.2),median:quantile(sorted,.5),p80:quantile(sorted,.8)};
}
function walkingNetKcal(steps,weightKg,heightCm){
 if(!finite(steps)||!finite(weightKg)||!finite(heightCm))return 0;
 const strideM=walkingStrideMetres(heightCm);
 return Math.max(0,steps-REFERENCE_STEPS)*strideM*weightKg*.0005;
}
function exerciseNetKcal(activity,weightKg){
 if(!activity||!finite(weightKg)||weightKg<=0)return null;
 // New distance/pace/step events store a single net-energy estimate per kg.
 // This is independent of whether duration was supplied. Older entries retain
 // the previous MET × minutes calculation for backward compatibility.
 if(finite(activity.netKcalPerKg)&&activity.netKcalPerKg>=0&&activity.netKcalPerKg<=2000)
    return activity.netKcalPerKg*weightKg;
 if(!finite(activity.minutes)||activity.minutes<=0||activity.minutes>1440||
    !finite(activity.mets)||activity.mets<1||activity.mets>23)return null;
 return (activity.mets-1)*weightKg*activity.minutes/60;
}
function exerciseExtra(rows,date,weightKg,stepEnergy,perStep){
 let independent=0,overlap=0,overlapSteps=0,unknown=false;
 for(const a of Array.isArray(rows)?rows:[]){
  if(a?.date!==date)continue;
  const kcal=exerciseNetKcal(a,weightKg);
  if(kcal===null)continue;
  if(a.stepOverlap===false)independent+=kcal;
  else if(a.stepOverlap===true){
   overlap+=kcal;
   // Legacy auto-generated activity steps are not measured and must not
   // be used as an exact overlap count after removing invented steps.
   if(a.stepOrigin==='estimated')unknown=true;
   else if(Number.isInteger(a.stepsIncluded)&&a.stepsIncluded>=0)overlapSteps+=a.stepsIncluded;
   else unknown=true;
  }
  // Unclassified activities are deliberately ignored to prevent double-counting.
 }
 const covered=unknown?stepEnergy:Math.min(stepEnergy,overlapSteps*perStep);
 return {kcal:independent+Math.max(0,overlap-covered),unknownOverlap:unknown};
}
function trendWeight(rows,date){
 const d=dateValue(date),vals=(Array.isArray(rows)?rows:[]).filter(r=>
    finite(dateValue(r?.date))&&dateValue(r.date)<=d&&dateValue(r.date)>=d-14*DAY&&
    finite(r.weightKg)&&r.weightKg>=20&&r.weightKg<=400)
  .map(r=>r.weightKg).sort((a,b)=>a-b);
 return vals.length>=3?quantile(vals,.5):null;
}
function calculate(input){
 const {date,dateOfBirth,heightCm,sex,weightKg,goalWeightKg,goalIntensity='moderate',
   stepDays=[],activities=[],weightHistory=[],dayProgress=1,allowStepProjection=false}=input||{};
 if(!finite(dateValue(date)))return {reason:'details'};
 if(!finite(goalWeightKg)||goalWeightKg<20||goalWeightKg>400)return {reason:'goal'};
 if(!finite(weightKg)||weightKg<20||weightKg>400)return {reason:'weight'};
 const age=ageOn(dateOfBirth,date);
 if(age===null||!finite(heightCm)||heightCm<80||heightCm>250||!CO[sex])return {reason:'details'};
 if(age<19)return {reason:'age'};
 if(age>110)return {reason:'details'};
 const bmi=weightKg/(heightCm/100)**2,goalBmi=goalWeightKg/(heightCm/100)**2;
 const measuredTrend=trendWeight(weightHistory,date);
 const difference=goalWeightKg-(measuredTrend??weightKg);
 const direction=Math.abs(difference)<=.25?'maintain':difference>0?'gain':'lose';
 if((direction==='lose'&&(bmi<18.5||goalBmi<18.5))||
    (direction==='maintain'&&bmi<18.5))return {reason:'underweight'};
 const base={age,heightCm,weightKg,sex};
 const inactive=eer(base,'inactive'),lowActive=eer(base,'lowActive');
 if(!finite(inactive)||!finite(lowActive)||inactive<500)return {reason:'details'};
 const recent=collectSteps(stepDays,date),current=recent.today;
 const frac=clamp(finite(dayProgress)?dayProgress:1,0,1);
 let stepsMid,stepsLo,stepsHi,activityCoverage='unknown',activityBasis;
 // Only today may project unobserved steps using earlier completed days.
 // Historical days use their own recorded steps (including partial totals),
 // never projections derived from the step history of nearby dates.
 if(current?.complete||(!allowStepProjection&&current)){
  stepsMid=stepsLo=stepsHi=current.steps;
  activityCoverage=current.complete?'complete':'historical-recorded';
  activityBasis=current.complete
   ?'Completed step count for this day; other activity may be unrecorded.'
   :'Recorded steps for this historical day only; no unrecorded steps projected.';
 }else if(allowStepProjection&&recent.count>=3){
  const seen=current?.steps??0,left=current?1-frac:1;
  stepsMid=seen+recent.median*left;
  stepsLo=seen+recent.p20*left;
  stepsHi=seen+recent.p80*left;
  activityCoverage=current?'partial':'history-only';
  activityBasis='Recorded steps plus previous 21 days of completed step counts for the unrecorded portion.';
 }else if(allowStepProjection&&current){
  const left=1-frac;
  stepsMid=current.steps+REFERENCE_STEPS*left;
  stepsLo=current.steps;
  stepsHi=current.steps+8000*left;
  activityCoverage='partial-sparse-history';
  activityBasis='Recorded steps; very little completed-day activity history.';
 }else{
  // Unknown activity is represented as a wide INACTIVE-to-LOW-ACTIVE EER
  // envelope, not an invented step reading or a claim of daily activity.
  stepsMid=stepsLo=stepsHi=REFERENCE_STEPS;
  activityBasis=allowStepProjection
   ?'No private step data: inactive-to-low-active energy envelope.'
   :'No steps recorded for this historical day; no steps projected from other dates.';
 }
 const walk=s=>walkingNetKcal(s,weightKg,heightCm);
 const walkMid=walk(stepsMid),perStep=walkingStrideMetres(heightCm)*weightKg*.0005;
 const exercise=exerciseExtra(activities,date,weightKg,walkMid,perStep);
 const exerciseLo=exerciseExtra(activities,date,weightKg,walk(stepsLo),perStep);
 const exerciseHi=exerciseExtra(activities,date,weightKg,walk(stepsHi),perStep);
 const maintainCentre=inactive+walkMid+exercise.kcal;
 const maintainLow=inactive+walk(stepsLo)+exerciseLo.kcal;
 const maintainHigh=inactive+walk(stepsHi)+exerciseHi.kcal+
    (activityCoverage==='unknown'?Math.max(0,lowActive-inactive):0);
 const bands=RATE[direction],rates=bands[goalIntensity]||bands.moderate;
 let low,high,preferred;
 if(direction==='lose'){
  low=maintainLow*(1-rates[1]);high=maintainHigh*(1-rates[0]);
  preferred=maintainCentre*(1-(rates[0]+rates[1])/2);
 }else if(direction==='gain'){
  low=maintainLow*(1+rates[0]);high=maintainHigh*(1+rates[1]);
  preferred=maintainCentre*(1+(rates[0]+rates[1])/2);
 }else{
  low=maintainLow*(1-.025);high=maintainHigh*(1+.025);
  preferred=maintainCentre;
 }
 // NICE: <1200 kcal/d is a low-energy diet needing specialist support.
 // Block rather than silently clip or shift the calculated range.
 if(low<1200)return {reason:'lowEnergy',estimatedLow:Math.round(low)};
 const displayLow=Math.floor(low/ROUND)*ROUND,displayHigh=Math.ceil(high/ROUND)*ROUND;
 return {low:displayLow,high:displayHigh,midpoint:Math.round((displayLow+displayHigh)/2),
   goalCentre:Math.round(preferred),adjustment:Math.round(preferred-maintainCentre),
   maintenance:Math.round(maintainCentre),maintenanceLow:Math.round(maintainLow),
   maintenanceHigh:Math.round(maintainHigh),inactiveEer:Math.round(inactive),
   provisional:true,activityBasis,activityCoverage,historyDays:recent.count,
   stepsEstimated:(current||(allowStepProjection&&recent.count>=3))?Math.round(stepsMid):null,
   stepExtraKcal:Math.round(walkMid),exerciseExtraKcal:Math.round(exercise.kcal),
   direction,intensity:goalIntensity,age,trendWeight:measuredTrend,
   source:'NASEM-2023-EER',calibrationApplied:false,guardLimited:false,
   assumptions:{referenceSteps:REFERENCE_STEPS,rateBand:rates,roundingKcal:ROUND}};
}
root.PieChartCalorieBudget={calculate,ageOn,eer,walkingNetKcal,exerciseNetKcal,collectSteps};
if(typeof module==='object'&&module.exports)module.exports=root.PieChartCalorieBudget;
})(typeof window==='object'?window:globalThis);
