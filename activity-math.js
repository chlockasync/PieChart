/* PieChart v0.1.067 — saved activity measurements and step reconciliation.
 * Named Library entries and recorded events use the same estimates. Activity
 * distance / step estimates are heuristics (not clinical energy measurements).
 * Health Connect's original step days are NEVER modified here.
 */
(function(root){
'use strict';
const TYPES={
  Walking:{mets:[2.8,3.8,4.8],speed:[[2.5,2.8],[4,3.3],[5,3.8],[6,4.8],[7,6.5]],perKm:.52,steps:true},
  Running:{mets:[6,8.3,11],speed:[[6,6],[8,8.3],[10,10],[12,11.5],[15,14.5]],perKm:1,steps:true},
  Cycling:{mets:[4,7,9],speed:[[9,4],[16,6],[20,7.5],[25,9],[30,12]],perKm:.3},
  Swimming:{mets:[4,6,9],speed:[[1,4],[1.5,6],[2,8],[3,10]],perKm:2.5},
  Weights:{mets:[3,5,6]},Gardening:{mets:[2.5,3.8,5]},
  Housework:{mets:[2.3,3.3,4.3]},
  Hiking:{mets:[4,6,8],speed:[[2,3.5],[3,4.6],[4,6],[5.5,8]],perKm:.75,steps:true},
  Yoga:{mets:[2,3.3,4]},Sport:{mets:[3.5,6,8]},Other:{mets:[2.5,4,7]}
};
const INTERVALS=['light','moderate','vigorous'];
const CADENCE={Walking:[70,100,125],Running:[130,155,175],Hiking:[70,95,115]};
const clamp=(v,l,h)=>Math.min(h,Math.max(l,v));
function interpolatedMets(speed,points){
 if(!Number.isFinite(speed)||speed<=0)return null;
 if(speed<=points[0][0])return points[0][1];
 for(let i=1;i<points.length;i++)if(speed<=points[i][0]){
  const [a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(speed-a)/(b-a);
 }
 return points.at(-1)[1];
}
function strideMetres(heightCm,type){
 // Height-based walking stride is provisional; faster running uses a longer
 // stride factor. An unknown height uses a clearly estimated 70cm fallback.
 if(!Number.isFinite(heightCm)||heightCm<80||heightCm>250)return .70;
 return heightCm/100*(type==='Running'?.65:.415);
}
function estimateActivity(input,{heightCm=null}={}){
 const type=input?.type,definition=TYPES[type];if(!definition)throw new Error('Choose an activity type.');
 const optional=(x)=>x===null||x===undefined||x===''?null:Number(x);
 const minutes=optional(input.minutes),distanceKm=optional(input.distanceKm),steps=optional(input.steps);
 if((minutes!==null&&(!Number.isFinite(minutes)||minutes<=0||minutes>720))||
    (distanceKm!==null&&(!Number.isFinite(distanceKm)||distanceKm<=0||distanceKm>1000))||
    (steps!==null&&(!Number.isInteger(steps)||steps<=0||steps>100000))||
    (minutes===null&&distanceKm===null&&steps===null))
    throw new Error('Enter a valid duration, distance, or step count.');
 if(distanceKm!==null&&!definition.speed)throw new Error('Distance is not supported for this activity type.');
 if(steps!==null&&!definition.steps)throw new Error('Steps are not supported for this activity type.');
 const stride=strideMetres(heightCm,type);
 const index=Math.max(0,INTERVALS.indexOf(input.intensity||'moderate'));
 // Manual counts always win. Distance is more informative than a crude
 // cadence assumption; a time-only walk gets provisional cadence-based steps
 // solely for overlap handling, NOT as a substitute for objective pace.
 const stepsCount=steps!==null?steps:
   definition.steps&&distanceKm!==null?Math.min(100000,Math.round(distanceKm*1000/stride)):
   definition.steps&&minutes!==null?Math.min(100000,Math.round(minutes*CADENCE[type][index])):null;
 const stepOrigin=steps!==null?'manual':stepsCount!==null?'estimated':'none';
 const inferredDistance=distanceKm??(steps!==null?steps*stride/1000:null);
 let mets,netKcalPerKg,basis;
 if(minutes!==null&&inferredDistance!==null&&definition.speed){
   const kmh=inferredDistance*60/minutes;
   mets=interpolatedMets(kmh,definition.speed);
   netKcalPerKg=(mets-1)*minutes/60;
   basis=distanceKm!==null?'Pace calculated from distance and time':'Estimated pace from steps, stride, and time';
 }else if(inferredDistance!==null&&definition.perKm){
   // A distance is more informative than a subjective effort label. This
   // per-distance net-cost model intentionally does not invent an elapsed time.
   mets=definition.mets[1];
   netKcalPerKg=inferredDistance*definition.perKm;
   basis=distanceKm!==null?'Approximate distance-based net energy':'Approximate step-derived distance and net energy';
 }else if(minutes!==null){
   mets=definition.mets[index];netKcalPerKg=(mets-1)*minutes/60;
   basis='Duration and subjective intensity (no measured pace)';
 }else throw new Error('This activity needs duration or distance.');
 const relation=stepOrigin==='none'?'none':input.stepRelation;
 if(stepOrigin!=='none'&&!['included','additional'].includes(relation))
   throw new Error('Choose whether these steps are additional to Health Connect.');
 return {
   name:String(input.name||type).trim(),type,
   minutes,distanceKm,stepsCount,stepOrigin,
   stepRelation:relation,
   stepsIncluded:relation==='none'?0:stepsCount,
   // This flag retains the old calorie-budget adapter's understanding that
   // these steps are counted in the daily step expenditure after reconciliation.
   stepOverlap:relation!=='none',
   intensity:INTERVALS[index],mets:Math.round(clamp(mets,1,23)*100)/100,
   netKcalPerKg:Math.round(Math.max(0,netKcalPerKg)*10000)/10000,
   calculationBasis:basis,estimatedStrideMetres:stepOrigin==='estimated'&&distanceKm!==null||
     (steps!==null&&distanceKm===null)?stride:null
 };
}
function augmentStepDays(stepDays,activities){
 const dayMap=new Map();
 for(const s of Array.isArray(stepDays)?stepDays:[]){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')||!Number.isInteger(s.steps)||s.steps<0)continue;
   dayMap.set(s.date,{...s});
 }
 for(const a of Array.isArray(activities)?activities:[]){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(a?.date||''))continue;
   if(a.stepRelation!=='additional'||!Number.isInteger(a.stepsIncluded)||a.stepsIncluded<=0)continue;
   if(!dayMap.has(a.date))dayMap.set(a.date,{date:a.date,steps:0,complete:false,source:'recorded_activity'});
   dayMap.get(a.date).steps+=a.stepsIncluded;
 }
 return [...dayMap.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
const api={TYPES,estimateActivity,augmentStepDays,strideMetres,interpolatedMets};
root.PieChartActivityMath=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
