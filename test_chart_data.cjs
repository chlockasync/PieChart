/* Chart model contract tests: run node --test tests/test_chart_data.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const {createTimelineModel,calendarRange,metricScales,affectedBands}=require('../piechart-chart-data.js');
const today='2026-11-27';
const validDay=(date,last)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=last;
function create(){
  const calls=[];
  const model=createTimelineModel({
    validDay,
    augmentStepDays:(days)=>days,
    calculateBudget:params=>{calls.push(params);return {low:2200,high:2350,maintenance:2275,provisional:false}},
    getNutrientKeys:()=>['calories','protein','carbs','fats','fibre']
  });
  return {model,calls};
}
const state=()=>({
  targetsLoaded:true,targets:{weight:67,steps:8000,water:2,protein:75,fibre:25},
  details:{heightCm:172,sex:'male',dateOfBirth:'1985-06-20'},
  noomDays:[
    {date:'2026-11-20',noom:{calories:1800,steps:4900,calorieBudgetLowKcal:1730,calorieBudgetHighKcal:1900}},
    {date:'2026-11-24',noom:{calories:1900,protein:55,waterMl:700,calorieBudgetKcal:1950}},
  ],
  weights:[{date:'2026-11-17',kg:68,createdAt:'2026-11-17T08:00:00Z',id:'weight1'}],
  stepDays:[{date:'2026-11-20',steps:5300,complete:true,source:'health-connect'}],
  waters:[{date:'2026-11-24',ml:250}],
  foodEntries:[{date:'2026-11-24',nutrition:{calories:220,protein:8,fibre:5},waterMl:120}],
  activityDays:[{date:'2026-11-24',name:'Walking',minutes:32,stepRelation:'additional',stepOrigin:'manual',stepsIncluded:650,mets:3}]
});
const day=(result,date)=>result.rows.find(r=>r.date===date);

test('Noom archive retains missing budgets and independent nutrient lower bounds',()=>{
  const {model,calls}=create();
  const result=model.rebuild({state:state(),today});
  const first=day(result,'2026-11-20');
  assert.equal(first.budgetLow,1730);assert.equal(first.budgetHigh,1900);
  assert.equal(first.budgetSource,'noom');
  assert.equal(first.steps,5300,'Health Connect steps override Noom steps');
  const gap=day(result,'2026-11-22');
  assert.equal(gap.budgetLow,null);assert.equal(gap.budgetHigh,null);
  assert.equal(gap.budgetSource,'noom');
  assert.equal(gap.calories,null);
  const combined=day(result,'2026-11-24');
  assert.equal(combined.calories,2120);
  assert.equal(combined.protein,63);
  assert.equal(combined.water,1070);
  assert.equal(combined.fibre,5);
  assert(combined.incompleteNutrients.includes('fibre'));
  assert.equal(combined.steps,650);
  assert.equal(combined.activityCount,1);
  const ordinary=day(result,'2026-11-26');
  assert.equal(ordinary.budgetSource,'calculated');
  assert.equal(ordinary.budgetLow,2200);
  assert(!calls.some(c=>c.date>='2026-11-20'&&c.date<='2026-11-24'),
    'The model must not recalculate imported Noom budget gaps');
});

test('incremental updates retain the date array and unaffected row identities',()=>{
  const {model,calls}=create(),s=state();
  const initial=model.rebuild({state:s,today});
  const originalRows=initial.rows;
  const originalUnchanged=day(initial,'2026-11-21');
  const originalAffected=day(initial,'2026-11-24');
  const originalCalls=calls.length;
  s.foodEntries.push({date:'2026-11-24',nutrition:{calories:80,protein:2},waterMl:50});
  const next=model.rebuild({state:s,today,all:false,dates:new Set(['2026-11-24']),
    kinds:new Set(['foodEntries']),rows:initial.rows,weighed:initial.weighed,
    previousVisibleStart:'2026-11-17',previousVisibleEnd:'2026-11-26'});
  assert.strictEqual(next.rows,originalRows);
  assert.strictEqual(day(next,'2026-11-21'),originalUnchanged);
  assert.notStrictEqual(day(next,'2026-11-24'),originalAffected);
  assert.equal(day(next,'2026-11-24').calories,2200);
  assert.equal(day(next,'2026-11-24').water,1120);
  assert.equal(next.all,false);
  assert.equal(next.redrawNeeded,true);
  assert.equal(calls.length-originalCalls,0,'No model budget calls for an archived day');
  const same=model.rebuild({state:s,today,all:false,dates:new Set(),kinds:new Set(),
    rows:next.rows,weighed:next.weighed,previousVisibleStart:'2026-11-17',previousVisibleEnd:'2026-11-26'});
  assert.strictEqual(same.rows,next.rows);
  assert.strictEqual(day(same,'2026-11-24'),day(next,'2026-11-24'));
  assert.equal(same.redrawNeeded,false);
});

test('model reset on account switch clears source history and cache',()=>{
  const {model}=create();
  const first=model.rebuild({state:state(),today});
  assert.equal(day(first,'2026-11-24').calories,2120);
  model.reset();
  const second=model.rebuild({state:{targetsLoaded:true,targets:{},details:{},noomDays:[],
    weights:[],waters:[],foodEntries:[],activityDays:[],stepDays:[]},today});
  assert.equal(day(second,'2026-11-24').calories,null);
  assert.equal(day(second,'2026-11-24').water,null);
  assert.equal(day(second,'2026-11-24').budgetSource,'calculated');
});

test('calendar range stays date-aligned and never plots today',()=>{
  const rows=[{date:'2026-11-24',calories:400},{date:'2026-11-26',calories:600},
    {date:'2026-11-27',calories:700,partial:true}];
  const visible=calendarRange({rows,today,daysVisible:7,minDays:7,availableGraphDays:7});
  assert.equal(visible.length,7);
  assert.equal(visible.at(-1).date,'2026-11-26');
  assert.equal(visible.at(-1).calories,600);
  assert.equal(visible.find(d=>d.date==='2026-11-25').calories,undefined);
  assert(!visible.some(d=>d.date===today));
});

test('chart scales keep weight goals out of natural weight bounds',()=>{
  const rows=[{weight:67,targetWeight:40,water:1000,waterGoal:2000}];
  const base={keys:['weight','water'],shown:()=>true,
    valueFor:(k,d)=>k==='water'?d.water/1000:d.weight,
    goalFor:(k,d)=>k==='weight'?d.targetWeight:d.waterGoal/1000,
    extremaForWeight:()=>[{lo:66.5,hi:67.5}]};
  const scales=metricScales(rows,base);
  assert.equal(scales.weight.offset,67);
  assert.equal(scales.water.offset,1.5);
});

test('incremental band mapping retains explicit source dependency boundaries',()=>{
  assert.deepEqual([...affectedBands(new Set(['foodEntries']))],
    ['water','calories','fibre','protein','fats','carbs']);
  assert.deepEqual([...affectedBands(new Set(['weightEntries']))],['weight','calories']);
  assert.equal(affectedBands(new Set(['targetChange'])),null);
});
