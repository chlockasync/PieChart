/* Actual piechart-db.js adapter integration tests, with simulated Firestore API.
 * No Firebase SDK or live project needed. Node VM injects dependencies only in
 * test context, leaving deployed module exports and global API unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as sync from '../piechart-db-sync.mjs';

const src=readFileSync(new URL('../piechart-db.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
const nextTick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej});return {promise,resolve,reject};};
function fixture(){
  const notifications=[];
  const window={dispatchEvent:event=>notifications.push({name:event.type,detail:event.detail}),addEventListener:()=>{}};
  const sandbox={window,navigator:{onLine:true},CustomEvent:class{constructor(type,data){this.type=type;this.detail=data.detail}},
    crypto:{randomUUID:()=> 'generated-12345678'},console,Promise,Date,Number,Object,Map,Set,String,JSON,Error,RegExp,
    firebaseConfig:{},...sync};
  vm.createContext(sandbox);
  vm.runInContext(src+`
window.__adapterTest={
  inject(store){sdkStore=store;db='MOCK';authEpoch=1;state.mode='connected';state.uid='account-one';state.favoritesLoaded=true;},
  switchAccount(uid){authEpoch++;stopSubscriptions();clearAccount();state.mode='connected';state.uid=uid;state.favoritesLoaded=true;},
  watchPersonal,watchFoods,watchFavorites,stopAccountSubscriptions,
  clearAccount,getEpoch:()=>authEpoch,
  auth:{signOutMock(){auth={};sdkAuth={signOut:async()=>true};}}
};`,sandbox);
  const events={batches:[],single:[],subscriptions:new Map(),deferredCommits:[],failCommits:false,deferSingle:false};
  const store={
    doc:(_db,...path)=>path.join('/'),collection:(_db,...path)=>path.join('/'),
    deleteField:()=>({__delete:true}),
    writeBatch(){const operations=[];return {
      set:(path,data,options)=>operations.push({op:'set',path,data,options}),
      delete:path=>operations.push({op:'delete',path}),
      commit(){events.batches.push(operations);if(events.failCommits)return Promise.reject(Object.assign(Error('Permission denied'),{code:'permission-denied'}));return Promise.resolve();}
    }},
    setDoc(path,data,options){const entry={op:'set',path,data,options};events.single.push(entry);
      if(events.deferSingle){entry.deferred=deferred();return entry.deferred.promise;}
      return Promise.resolve();},
    deleteDoc(path){events.single.push({op:'delete',path});return Promise.resolve()},
    updateDoc(path,data){events.single.push({op:'update',path,data});return Promise.resolve()},
    onSnapshot(path,_options,onChange,onError){const slot={path,onChange,onError,stopped:false};events.subscriptions.set(path,slot);return ()=>{slot.stopped=true;};}
  };
  window.__adapterTest.inject(store);
  const emit=(path,snapshot)=>{const sub=events.subscriptions.get(path);assert.ok(sub,`Missing subscription: ${path}`);sub.onChange(snapshot);};
  const standardMeta={fromCache:false,hasPendingWrites:false};
  const collection=(docs,changes=docs.map(doc=>({type:'added',doc})),metadata=standardMeta)=>({
    docs,metadata,docChanges:()=>changes
  });
  const document=(id,value)=>({id,data:()=>value});
  return {api:window.PieChartDB,testHooks:window.__adapterTest,events,notifications,emit,collection,document,standardMeta};
}

const food=(name='Banana',favorite=false)=>({id:'food-abc12345',name,type:'Food Item',approved:true,baseUnit:'g',favorite,
  values:{calories:80,protein:1,carbs:17,fats:0.1,fibre:2}});
const activity=(favorite=false)=>({id:'activity-abc12345',name:'Walk',type:'Walking',minutes:30,distanceKm:null,steps:null,intensity:'moderate',favorite});

test('invalid shared library item cannot make even a private favourite write',()=>{
  const f=fixture();
  const existing=food('Banana',false),bad=food('',true);
  assert.throws(()=>f.api.saveFoodChanges([existing],[bad]),/Invalid/);
  assert.equal(f.events.batches.length,0);
  assert.equal(f.events.single.length,0);
});
test('shared Activity and private favourite are queued atomically under unchanged paths and formats',async()=>{
  const f=fixture();
  assert.equal(f.api.saveActivityLibraryChanges([], [activity(true)]),true);
  assert.equal(f.events.batches.length,1);
  const ops=f.events.batches[0];
  assert.equal(ops.length,2);
  assert.equal(ops[0].path,'approvedActivities/activity-abc12345');
  assert.equal(ops[0].data.favorite,false,'shared compatibility field remains fixed false');
  assert.equal(ops[1].path,'users/account-one/settings/favorites');
  assert.equal(ops[1].options.merge,true);
  assert.equal(ops[1].data.activities['activity-abc12345'],true);
  assert.equal(f.api.state.activityLibrary[0].favorite,true);
  await nextTick();
  assert.equal(f.api.state.error,'');
});
test('Food favourite-only save uses owner-private write and never overwrites shared Food definition',async()=>{
  const f=fixture();
  assert.equal(f.api.saveFoodChanges([food('Banana',false)],[food('Banana',true)]),true);
  assert.equal(f.events.batches.length,1);
  assert.equal(f.events.batches[0].length,1);
  assert.equal(f.events.batches[0][0].path,'users/account-one/settings/favorites');
  assert.equal(f.events.batches[0][0].data.foods['food-abc12345'],true);
  await nextTick();
});
test('server rejects entire library/favourites batch and reports an error',async()=>{
  const f=fixture();f.events.failCommits=true;let message='';
  f.api.saveActivityLibraryChanges([], [activity(true)],{onError:text=>message=text});
  await nextTick();
  assert.match(f.api.state.error,/Access denied/);
  assert.match(message,/Access denied/);
});
test('queued write cannot silently sign out before its server acknowledgement',async()=>{
  const f=fixture();f.events.deferSingle=true;
  f.api.saveFavorite('foods','food-abc12345',true);
  await assert.rejects(f.api.signOut(),/waiting to sync/);
  f.events.single[0].deferred.resolve();await nextTick();
  // The test fixture has no Firebase Auth instance; with no pending writes,
  // signOut now completes instead of blocking.
  await f.api.signOut();
});
test('old account write rejection never changes the new account state or calls old UI callback',async()=>{
  const f=fixture();f.events.deferSingle=true;let shown='';
  f.api.saveFavorite('foods','food-abc12345',true,{onWriteError:m=>shown=m});
  f.api.state.foodsFromCache=true;
  f.testHooks.switchAccount('account-two');
  assert.equal(f.api.state.foodsFromCache,false,'a new account cannot inherit old cache status');
  f.events.single[0].deferred.reject(Object.assign(Error('Permission denied'),{code:'permission-denied'}));
  await nextTick();
  assert.equal(f.api.state.error,'');
  assert.equal(shown,'');
  assert.equal(f.api.state.uid,'account-two');
  assert.deepEqual(Object.keys(f.api.state.favorites.foods),[]);
});
test('private changes update only affected chart dates; metadata-only snapshots do not invalidate graph',()=>{
  const f=fixture();f.testHooks.watchPersonal('account-one',1);
  const doc=f.document('entry-1',{date:'2026-11-25',kg:70});
  f.emit('users/account-one/weightEntries',f.collection([doc]));
  const state=f.api.state;
  assert.equal(state.weights[0].kg,70);
  assert.equal(state.graphChange.kind,'weightEntries');
  assert.equal(state.graphChange.dates[0],'2026-11-25');
  const rev=state.graphRevision;
  const first=state.weights;
  f.emit('users/account-one/weightEntries',f.collection([doc],[],{fromCache:true,hasPendingWrites:false}));
  assert.equal(state.graphRevision,rev);
  assert.equal(state.weights,first);
});
test('dailyTotals keep Noom and Health Connect in separate projections',()=>{
  const f=fixture();f.testHooks.watchPersonal('account-one',1);
  const doc=f.document('2026-11-26',{date:'2026-11-26',source:'health_connect',steps:5542,complete:true,noom:{calories:1789}});
  f.emit('users/account-one/dailyTotals',f.collection([doc]));
  assert.equal(f.api.state.stepDays[0].steps,5542);
  assert.equal(f.api.state.noomDays[0].noom.calories,1789);
});
test('favourites pending metadata blocks sign out and clears when server confirms',async()=>{
  const f=fixture();f.testHooks.watchFavorites('account-one',1);
  const path='users/account-one/settings/favorites';
  const snap=pending=>({exists:()=>true,data:()=>({foods:{'food-abc12345':true}}),metadata:{fromCache:false,hasPendingWrites:pending}});
  f.emit(path,snap(true));
  assert.equal(f.api.state.privatePending,true);
  await assert.rejects(f.api.signOut(),/waiting to sync/);
  f.emit(path,snap(false));
  assert.equal(f.api.state.privatePending,false);
  await f.api.signOut();
});
test('revoked membership stops all private subscriptions, including Health Connect dailyTotals',()=>{
  const f=fixture();f.testHooks.watchPersonal('account-one',1);
  f.testHooks.stopAccountSubscriptions();
  for(const sub of f.events.subscriptions.values())assert.equal(sub.stopped,true,sub.path);
  const oldSteps=f.events.subscriptions.get('users/account-one/dailyTotals');
  oldSteps.onChange(f.collection([f.document('2026-11-27',{
    date:'2026-11-27',steps:1234,complete:false,source:'health_connect'
  })]));
  assert.equal(f.api.state.stepDays.length,0,'late callback after revocation must be discarded');
});
