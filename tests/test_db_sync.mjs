import test from 'node:test';
import assert from 'node:assert/strict';
import {planLibraryChanges,applyDocumentChanges,partitionDailyTotals,privateWritesPending} from '../piechart-db-sync.mjs';

const clean=x=>{if(!x?.id||!x?.name)throw Error('Invalid library item');return {id:x.id,name:x.name,savedAt:x.savedAt||''};};
test('all shared records validate before any write plan is returned',()=>{
  assert.throws(()=>planLibraryChanges([], [
    {id:'valid12345',name:'Valid',favorite:true},
    {id:'invalid',name:'',favorite:true}
  ],clean,'too many'),/Invalid/);
});
test('plan keeps timestamp-only updates and unchanged favourites out of write batch',()=>{
  const before=[{id:'food-abc12345',name:'Fruit',savedAt:'yesterday',favorite:false}];
  const next=[{id:'food-abc12345',name:'Fruit',savedAt:'today',favorite:false}];
  const plan=planLibraryChanges(before,next,clean,'too many');
  assert.deepEqual(plan.changes,[]);
  assert.deepEqual(plan.favoriteChanges,[]);
});
test('shared and private operations are computed independently without copying favourites into library data',()=>{
  const previous=[{id:'food-abc12345',name:'Rice',favorite:true}];
  const next=[{id:'food-abc12345',name:'Rice',favorite:false},{id:'food-abc98765',name:'Corn',favorite:true}];
  const plan=planLibraryChanges(previous,next,clean,'too many');
  assert.equal(plan.changes.length,1);
  assert.equal(plan.changes[0][2].favorite,undefined);
  assert.deepEqual(plan.favoriteChanges,[['food-abc12345',false],['food-abc98765',true]]);
});
test('deleting favourited item clears only its personal favourite, without other keys',()=>{
  const plan=planLibraryChanges([{id:'food-abc12345',name:'Rice',favorite:true}],[],clean,'too many');
  assert.deepEqual(plan.changes,[['delete','food-abc12345']]);
  assert.deepEqual(plan.favoriteChanges,[['food-abc12345',false]]);
});
test('doc-change processing preserves metadata-only snapshots and identifies old/new dates',()=>{
  const old={date:'2026-11-25',value:10};
  const records=new Map([['food-abc12345',old]]);
  assert.deepEqual(applyDocumentChanges(records,[]),[]);
  assert.strictEqual(records.get('food-abc12345'),old);
  assert.deepEqual(applyDocumentChanges(records,[{type:'modified',doc:{id:'food-abc12345',data:()=>({date:'2026-11-26',value:12})}}]),
    ['2026-11-25','2026-11-26']);
  assert.deepEqual(applyDocumentChanges(records,[{type:'removed',doc:{id:'food-abc12345'}}]),['2026-11-26']);
  assert.equal(records.size,0);
});
test('Health Connect and Noom fields of a single document stay independent',()=>{
  const rows=[{date:'2026-11-25',source:'health_connect',steps:7412,complete:true,noom:{calories:1200}},
    {date:'2026-11-26',noom:{calories:1300}},
    {date:'2026-11-27',source:'health_connect',steps:0,complete:false},
    {date:'invalid',source:'health_connect',steps:800,complete:true}];
  const v=partitionDailyTotals(rows);
  assert.deepEqual(v.stepDays.map(x=>x.date),['2026-11-25','2026-11-27']);
  assert.deepEqual(v.noomDays.map(x=>x.date),['2026-11-25','2026-11-26']);
  assert.equal(v.noomDays[0].noom.calories,1200);
});
test('pending flags include personal favourites, targets, and every private collection',()=>{
  for(const key of ['favorites','targets','weights','waters','foodEntries','activityDays','stepDays']){
    assert.equal(privateWritesPending({[key+'Pending']:true}),true,key);
  }
  assert.equal(privateWritesPending({}),false);
});
