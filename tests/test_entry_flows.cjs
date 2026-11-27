/* Run: node --test tests/test_entry_flows.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const route=require('../piechart-entry-flows.js');
const library={id:'activity-12345',name:'Walk',type:'Walking'};
const record={id:'record-12345',libraryId:library.id,name:'Walk',date:'2026-11-27'};

test('Today search and favourites share one private recording route',()=>{
  const selected=route.activitySelection(library,true);
  assert.equal(selected.intent,'record-new');
  assert.equal(route.describeActivity(selected).saveLabel,'Record');
  assert.equal(route.describeActivity(selected).fromToday,true);
});
test('Standalone Activity Library selection edits reusable definition only',()=>{
  const selected=route.activitySelection(library,false);
  assert.equal(selected.intent,'edit-library');
  assert.equal(route.describeActivity(selected).saveLabel,'Save changes');
  assert.equal(route.describeActivity(selected).isRecording,false);
});
test('A diary row edits its existing private entry, not library',()=>{
  const editing=route.activityRecording(record,library);
  assert.equal(editing.intent,'edit-record');
  assert.equal(editing.record.id,record.id);
  assert.equal(route.describeActivity(editing).title,'Edit recorded activity');
  assert.equal(route.describeActivity(editing).isLibraryEdit,false);
});
test('Creating a definition from either context has no recording date',()=>{
  for(const fromToday of [true,false]){
    const creating=route.activityCreation('New Walk',fromToday);
    assert.equal(creating.intent,'create-library');
    assert.equal(creating.record,null);
    assert.equal(route.describeActivity(creating).saveLabel,'Add to library');
    const recording=route.activityAfterLibrarySave(library,creating.origin);
    assert.equal(recording.intent,'record-new');
    assert.equal(recording.origin,creating.origin);
  }
});
test('Invalid mixed routes are rejected instead of silently entering wrong form',()=>{
  assert.throws(()=>route.activity('record-new'),/required/);
  assert.throws(()=>route.activity('edit-record',{item:library}),/required/);
  assert.throws(()=>route.activity('create-library',{item:library}),/Conflicting/);
  assert.throws(()=>route.activity('edit-library',{item:library,record}),/Conflicting/);
});
