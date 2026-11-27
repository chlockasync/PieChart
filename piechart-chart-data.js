/* PieChart v0.1.108 — historical data and chart-preparation model.
 * No DOM, SVG drawing, navigation, or Firestore calls. Source indexing,
 * per-day budgets, calendar ranges, and band scale calculations retain the
 * existing v0.1.107 behaviour. Presentation remains in index.html.
 */
(function(root){
'use strict';
const MS_DAY=86400000;
const dayUTC=d=>Date.parse(d+'T00:00:00Z');
function createTimelineModel({validDay,augmentStepDays,calculateBudget,getNutrientKeys}){
  if(typeof validDay!=='function'||typeof augmentStepDays!=='function'||
     typeof getNutrientKeys!=='function')throw new Error('Missing timeline model dependency.');
  let lastNoomRange='',historySourceCache=null;
  return Object.freeze({
    reset(){lastNoomRange='';historySourceCache=null;},
    rebuild({state={},today,all=true,dates=new Set(),kinds=new Set(),rows=[],weighed=[],
      previousVisibleStart=null,previousVisibleEnd=null}){
      let DATA=rows;
      const nutrientKeys=getNutrientKeys();
      const validDate=date=>validDay(date,today);
      const validMeasurement=(value,max=100000)=>Number.isFinite(value)&&value>=0&&value<=max;
      // Reuse source indexes for unaffected collections. Firestore has already
      // supplied per-document changes; a food write must not rescan thousands
      // of Noom days, weigh-ins, or activities.
      const cache=historySourceCache;
      const changed=kind=>all||!cache||kinds.has(kind);
      const noomByDate=changed('dailyTotals')?new Map((state.noomDays||[]).filter(d=>validDate(d.date)&&
        d.noom&&typeof d.noom==='object'&&!Array.isArray(d.noom)).map(d=>[d.date,d.noom])):cache.noomByDate;
      // A historical import is a dated archive, not a classification for every
      // record entered before today. Missing Noom days inside its archive are
      // intentionally budgetless; other members retain PieChart calculations.
      const archiveDates=changed('dailyTotals')?[...noomByDate.keys()].sort():cache.archiveDates;
      const noomFirst=archiveDates[0]||null,noomLast=archiveDates.at(-1)||null;
      const inNoomPeriod=date=>noomFirst!==null&&date>=noomFirst&&date<=noomLast;
      const noomRange=(noomFirst||'')+'|'+(noomLast||'');
      if(lastNoomRange!==noomRange){all=true;lastNoomRange=noomRange;}

      const weightEvents=changed('weightEntries')?(state.weights||[]).filter(e=>validDate(e.date)&&Number.isFinite(e.kg)&&e.kg>=20&&e.kg<=400)
        .sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id))):cache.weightEvents;
      const foodEvents=changed('foodEntries')?(state.foodEntries||[]).filter(e=>validDate(e.date)&&e.nutrition&&typeof e.nutrition==='object'):cache.foodEvents;
      const weightsByDate=changed('weightEntries')?new Map(weightEvents.map(e=>[e.date,e.kg])):cache.weightsByDate;
      const waterChanged=changed('waterEntries')||changed('foodEntries');
      const waterByDate=waterChanged?new Map():cache.waterByDate;
      if(waterChanged){
        for(const e of (state.waters||[]).filter(e=>validDate(e.date)&&Number.isFinite(e.ml)&&e.ml>0))
          waterByDate.set(e.date,(waterByDate.get(e.date)||0)+e.ml);
        for(const e of foodEvents)if(Number.isFinite(e.waterMl)&&e.waterMl>0)
          waterByDate.set(e.date,(waterByDate.get(e.date)||0)+e.waterMl);
      }
      const foodByDate=changed('foodEntries')?new Map():cache.foodByDate;
      if(changed('foodEntries'))for(const e of foodEvents){
        if(!foodByDate.has(e.date))foodByDate.set(e.date,{});
        const totals=foodByDate.get(e.date);
        for(const key of nutrientKeys)if(validMeasurement(e.nutrition?.[key],1000000))
          totals[key]=(totals[key]||0)+e.nutrition[key];
      }
      // Health Connect takes precedence over imported Noom steps for the same
      // date. Source records are not merged or rewritten in Firestore.
      const stepsChanged=changed('dailyTotals');
      const mergedStepsByDate=stepsChanged?new Map([...noomByDate].filter(([,n])=>Number.isInteger(n.steps)&&
        n.steps>=0&&n.steps<=100000).map(([date,n])=>[date,{date,steps:n.steps,complete:date<today,source:'noom'}])):cache.mergedStepsByDate;
      if(stepsChanged)for(const s of Array.isArray(state.stepDays)?state.stepDays:[])
        if(validDate(s.date)&&Number.isInteger(s.steps)&&s.steps>=0&&s.steps<=100000)mergedStepsByDate.set(s.date,s);
      const additionalStepsByDate=changed('exerciseEntries')?new Map():cache.additionalStepsByDate;
      // An activity is a recorded event even when its duration, steps, distance,
      // and energy expenditure are unknown. Those optional measurements must
      // never determine whether its date gets an activity marker or count badge.
      const activities=changed('exerciseEntries')?(Array.isArray(state.activityDays)?state.activityDays:[]).filter(a=>
        a&&validDate(a.date)):cache.activities;
      const activityEventsByDate=changed('exerciseEntries')?new Map():cache.activityEventsByDate;
      const activityByDate=changed('exerciseEntries')?new Map():cache.activityByDate;
      if(changed('exerciseEntries'))for(const a of activities){
        if(!activityEventsByDate.has(a.date))activityEventsByDate.set(a.date,[]);
        activityEventsByDate.get(a.date).push(a);
        const daily=activityByDate.get(a.date)||{load:0,minutes:0,knownDurations:0,count:0};
        daily.count++;
        if(Number.isFinite(a.minutes)&&a.minutes>0){daily.minutes+=a.minutes;daily.knownDurations++;}
        // Unmeasured energy is not estimated merely to display a marker.
        if(Number.isFinite(a.netKcalPerKg))daily.load+=a.netKcalPerKg*60;
        else if(Number.isFinite(a.mets)&&Number.isFinite(a.minutes)&&a.minutes>0)
          daily.load+=Math.max(0,a.mets-1)*a.minutes;
        activityByDate.set(a.date,daily);
        if(a.stepOrigin!=='estimated'&&a.stepRelation==='additional'&&Number.isInteger(a.stepsIncluded)&&a.stepsIncluded>0){
          const steps=additionalStepsByDate.get(a.date)||{measured:0,estimated:0};
          steps[a.stepOrigin==='estimated'?'estimated':'measured']+=a.stepsIncluded;
          additionalStepsByDate.set(a.date,steps);
        }
      }
      const augmentedStepDays=stepsChanged||changed('exerciseEntries')
        ?augmentStepDays([...mergedStepsByDate.values()],activities)
        :cache.augmentedStepDays;
      historySourceCache={noomByDate,archiveDates,weightEvents,foodEvents,weightsByDate,waterByDate,foodByDate,
        mergedStepsByDate,additionalStepsByDate,activities,activityEventsByDate,activityByDate,augmentedStepDays};
      // Historical totals, imported weights, and actual diary records all extend
      // the calendar; no public sample or invented measurements are involved.
      const recordedDates=[...noomByDate.keys(),...weightsByDate.keys(),...waterByDate.keys(),
        ...foodByDate.keys(),...mergedStepsByDate.keys(),...additionalStepsByDate.keys(),
        ...activityByDate.keys()].sort();
      const todayMs=dayUTC(today);
      const firstRecorded=recordedDates[0]||null;
      const earliest=Math.min(todayMs-100*86400000,firstRecorded?dayUTC(firstRecorded):todayMs);
      const first=Math.max(earliest,todayMs-3650*86400000);
      const numberOfDays=Math.round((todayMs-first)/86400000)+1;
      const goals=state.targets||{};
      const details=state.details||{};
      // Reuse the cached daily rows. Only a new account, a changed archive
      // boundary or a longer calendar range allocates a new timeline.
      if(DATA.length!==numberOfDays||DATA[0]?.date!==new Date(first).toISOString().slice(0,10))all=true;
      const weightChangeDates=kinds.has('weightEntries')?[...dates].sort():[];
      const weightsChangedFrom=weightChangeDates[0]||null;
      const updateTodayForStepHistory=(kinds.has('dailyTotals')||kinds.has('exerciseEntries'))&&[...dates].some(date=>
        dayUTC(today)-dayUTC(date)<=21*86400000&&date<=today);
      if(updateTodayForStepHistory)dates.add(today);
      const redrawNeeded=all||weightsChangedFrom!==null||
        [...dates].some(date=>previousVisibleStart&&date>=previousVisibleStart&&date<=previousVisibleEnd);
      if(all)DATA=Array.from({length:numberOfDays},(_,i)=>({
        date:new Date(first+i*86400000).toISOString().slice(0,10)
      }));
      const changedIndices=all?DATA.map((_,i)=>i):[...new Set([
        ...dates,
        ...(weightsChangedFrom?DATA.filter(row=>row.date>=weightsChangedFrom).map(row=>row.date):[])
      ])].filter(date=>date>=DATA[0]?.date&&date<=today).map(date=>
        Math.round((dayUTC(date)-first)/86400000)).filter(i=>i>=0&&i<DATA.length).sort((a,b)=>a-b);
      const dayProgress=(new Date().getHours()*60+new Date().getMinutes())/1440;
      for(const i of changedIndices){
        const date=DATA[i].date;
        // Look backwards only for the applicable weight and bounded model
        // windows. No unrelated daily row is recalculated or replaced.
        let mostRecentPrivateWeight=null;
        for(let j=weightEvents.length-1;j>=0;j--){
          if(weightEvents[j].date<=date){mostRecentPrivateWeight=weightEvents[j].kg;break;}
        }
        const weightCutoff=new Date(dayUTC(date)-14*86400000).toISOString().slice(0,10);
        const stepCutoff=new Date(dayUTC(date)-21*86400000).toISOString().slice(0,10);
        const privateWeightWindow=weightEvents.filter(e=>e.date>=weightCutoff&&e.date<=date)
          .map(e=>({date:e.date,weightKg:e.kg}));
        const stepWindow=augmentedStepDays.filter(e=>e.date>=stepCutoff&&e.date<=date);
        const noom=noomByDate.get(date)||null;
        const totals=foodByDate.get(date)||{};
        // An imported Noom summary with some nutritional measurements but a
        // missing nutrient cannot yield a complete total for that nutrient.
        // New food entries add to known Noom values, but do not make unknown
        // portions of the imported day's nutrition magically become zero.
        const hasNoomNutrition=!!noom&&nutrientKeys.some(k=>
          validMeasurement(noom[k],k==='calories'?100000:10000));
        const incompleteNutrients=[];
        const nutritionTotal=(key,max)=>{
          const imported=validMeasurement(noom?.[key],max)?noom[key]:null;
          const added=Number.isFinite(totals[key])?totals[key]:null;
          if(imported!==null)return imported+(added??0);
          if(added!==null){
            if(hasNoomNutrition)incompleteNutrients.push(key);
            return added; // Known PieChart contribution, not a fabricated Noom zero.
          }
          return null;
        };
        const noomBudget=validMeasurement(noom?.calorieBudgetKcal,100000)?noom.calorieBudgetKcal:null;
        const importedLow=validMeasurement(noom?.calorieBudgetLowKcal,100000)?noom.calorieBudgetLowKcal:noomBudget;
        const importedHigh=validMeasurement(noom?.calorieBudgetHighKcal,100000)?noom.calorieBudgetHighKcal:noomBudget;
        // Noom's own historic calorie budgets are authoritative. Missing values
        // remain unknown on Noom days; estimates are only for ordinary app days.
        const isArchiveDay=inNoomPeriod(date);
        const estimate=!isArchiveDay&&state.targetsLoaded&&calculateBudget?.({
          date,dateOfBirth:details.dateOfBirth,heightCm:details.heightCm,sex:details.sex,
          weightKg:mostRecentPrivateWeight,goalWeightKg:goals.weight,
          goalIntensity:goals.goalIntensity||'moderate',weightHistory:privateWeightWindow,
          stepDays:stepWindow,activities:activityEventsByDate.get(date)||[],
          allowStepProjection:date===today,
          dayProgress:date===today?dayProgress:1
        });
        const activity=activityByDate.get(date);
        const additional=additionalStepsByDate.get(date);
        const observedSteps=mergedStepsByDate.get(date)?.steps;
        const stepsPresent=Number.isInteger(observedSteps)||!!additional;
        const budgetLow=isArchiveDay?importedLow:(Number.isFinite(estimate?.low)?estimate.low:null);
        const budgetHigh=isArchiveDay?importedHigh:(Number.isFinite(estimate?.high)?estimate.high:null);
        DATA[i]={date,
          weight:weightsByDate.get(date)??null,
          water:validMeasurement(noom?.waterMl,15000)||waterByDate.has(date)
            ?(validMeasurement(noom?.waterMl,15000)?noom.waterMl:0)+(waterByDate.get(date)||0):null,
          targetWeight:goals.weight??null,waterGoal:Number.isFinite(goals.water)?Math.round(goals.water*1000):null,
          stepsGoal:goals.steps??null,proteinGoal:goals.protein??null,fibreGoal:goals.fibre??null,
          steps:stepsPresent?(observedSteps||0)+(additional?.measured||0)+(additional?.estimated||0):null,
          stepsAdditionalMeasured:additional?.measured||0,
          stepsAdditionalEstimated:additional?.estimated||0,
          activityLoad:activity?.load??null,
          activityMinutes:activity?.knownDurations?activity.minutes:null,activityCount:activity?.count??0,
          calories:nutritionTotal('calories',100000),
          protein:nutritionTotal('protein',10000),
          fibre:nutritionTotal('fibre',10000),
          carbs:nutritionTotal('carbs',10000),
          fats:nutritionTotal('fats',10000),
          incompleteNutrients,
          budgetLow,budgetHigh,
          budget:Number.isFinite(budgetLow)&&Number.isFinite(budgetHigh)?(budgetLow+budgetHigh)/2:null,
          budgetSource:isArchiveDay?'noom':'calculated',
          budgetProvisional:!isArchiveDay&&!!estimate?.provisional,
          budgetReason:isArchiveDay?null:estimate?.reason||null,
          budgetGuardLimited:!isArchiveDay&&!!estimate?.guardLimited,
          budgetActivityBasis:isArchiveDay?'Original recorded Noom budget':estimate?.activityBasis||null,
          budgetMaintenance:isArchiveDay?null:estimate?.maintenance??null,
          partial:date===today
        };
      }
      if(all||kinds.has('weightEntries'))weighed=DATA.filter(d=>Number.isFinite(d.weight)).map(d=>({t:dayUTC(d.date),weight:d.weight}));
      return {rows:DATA,weighed,all,redrawNeeded,dates};
    }
  });
}
// Chart preparation remains independent of SVG drawing or visible DOM.
function calendarRange({rows,today,daysVisible,minDays,availableGraphDays}){
    // Reserve one x-column for each actual calendar day, ending yesterday.
    // Never compact sparse records into adjacent columns: that silently
    // misaligns measurements with the date axis and historical-date picker.
    // Today and missing records remain blank.
    const yesterday=dayUTC(today)-MS_DAY;
    const count=Math.max(minDays,Math.min(availableGraphDays,Math.round(daysVisible)));
    const byDate=new Map(rows.filter(d=>d.date<today&&!d.partial).map(d=>[d.date,d]));
    return Array.from({length:count},(_,i)=>{
      const date=new Date(yesterday-(count-1-i)*MS_DAY).toISOString().slice(0,10);
      return byDate.get(date)||{date};
    });
}
function metricScales(rows,{keys,shown,valueFor,goalFor,extremaForWeight}){
    const visible=keys.filter(shown), n=visible.length, out={};
    if(!n)return out;
    const band=1/n;
    visible.forEach((k,index)=>{
      const centre=1-(index+.5)*band;
      const vals=rows.map(r=>valueFor(k,r)).filter(Number.isFinite);
      if(['steps','water','protein','fibre'].includes(k))vals.push(...rows.map(r=>goalFor(k,r)).filter(Number.isFinite));
      if(k==='calories')vals.push(...rows.flatMap(r=>[r.budgetLow,r.budgetHigh]).filter(Number.isFinite));
      if(k==='weight')vals.push(...extremaForWeight(rows).flatMap(r=>[r.lo,r.hi]).filter(Number.isFinite));
      const lo=vals.length?Math.min(...vals):0,hi=vals.length?Math.max(...vals):1;
      const minHalf={weight:.65,steps:1650,water:.21,calories:155,protein:11,fibre:4,carbs:35,fats:10}[k]||1;
      const half=Math.max((hi-lo)/2,minHalf);
      // Match the reference: the marks occupy the middle and upper portions of a distinct band.
      // Leave room for shadows beneath them rather than mapping extrema edge-to-edge.
      const amplitude=band*({weight:.305,steps:.37,water:.34,calories:.35,fibre:.345,protein:.335,fats:.34,carbs:.34}[k]||.33);
      const verticalOffset={weight:-.015,steps:.105,water:.11,calories:.07,protein:.12,fibre:.12,carbs:.11,fats:.11}[k]||0;
      const biasedCentre=centre+band*verticalOffset;
      out[k]={centre:biasedCentre,offset:(lo+hi)/2,scale:amplitude/(half*1.025),
        band,index,top:index*band,bottom:(index+1)*band,amplitude};
    });
    return out;
}
// A series only repaints when its source can affect that band.
// Unknown changes are structural and must request a full redraw.
function affectedBands(kinds){
  const series=new Set();
  for(const kind of kinds){
    if(kind==='foodEntries')for(const k of ['water','calories','fibre','protein','fats','carbs'])series.add(k);
    else if(kind==='waterEntries')series.add('water');
    else if(kind==='weightEntries')for(const k of ['weight','calories'])series.add(k);
    else if(kind==='exerciseEntries')for(const k of ['steps','calories'])series.add(k);
    else if(kind==='dailyTotals')for(const k of ['steps','water','calories','fibre','protein','fats','carbs'])series.add(k);
    else return null;
  }
  return series;
}
const api=Object.freeze({createTimelineModel,calendarRange,metricScales,affectedBands});
root.PieChartChartData=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
