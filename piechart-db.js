/* PieChart v0.1.041 — personal records, targets, and nutrient precision.
   Firestore uses owner-private personal collections and a member-only approved food library.
   No private key belongs in a GitHub Pages app. An administrator manually provisions
   the initial two membership documents through Firebase Console. */
import {firebaseConfig} from './firebase-config.js';

const listeners=new Set();
const state={mode:'local',configured:false,uid:'',displayName:'',email:'',error:'',
  foods:[],foodsFromCache:false,pending:false,online:navigator.onLine,
  weights:[],waters:[],targets:{},targetsLoaded:false,targetsFromCache:true,
  weightsLoaded:false,watersLoaded:false,privateFromCache:true,privatePending:false,
  weightsPending:false,watersPending:false,targetsPending:false,initialRemoteFoods:false};
let app,auth,db,sdkAuth,sdkStore;
let stopMember=null,stopFoods=null,stopWeights=null,stopWaters=null,stopTargets=null;
let authEpoch=0;

function broadcast(){
  window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:state}));
  for(const callback of listeners){try{callback(state)}catch(error){console.error(error)}}
}
function setMode(mode,error=''){state.mode=mode;state.error=error;broadcast();}
function stopSubscriptions(){
  for(const stop of [stopMember,stopFoods,stopWeights,stopWaters,stopTargets])try{stop?.()}catch{}
  stopMember=stopFoods=stopWeights=stopWaters=stopTargets=null;
}
function clearAccount(){
  state.uid='';state.displayName='';state.email='';state.foods=[];state.weights=[];
  state.waters=[];state.targets={};state.targetsLoaded=false;state.targetsFromCache=true;
  state.weightsLoaded=false;state.watersLoaded=false;state.privatePending=false;
  state.weightsPending=false;state.watersPending=false;state.targetsPending=false;
  state.initialRemoteFoods=false;state.pending=false;state.privateFromCache=true;
}
function friendly(error){
  if(!error)return 'Unknown database error';
  const codes={
    'auth/popup-blocked':'Google sign-in pop-up was blocked. Allow pop-ups for this site and try again.',
    'auth/popup-closed-by-user':'Google sign-in was cancelled.',
    'auth/unauthorized-domain':'Add this GitHub Pages domain to Firebase Authentication → Settings → Authorized domains.',
    'permission-denied':'Access denied. Check membership and Firestore security rules.',
    'unavailable':'Firebase is temporarily unreachable. Cached data may remain available offline.'
  };
  return codes[error.code]||error.message||String(error);
}
const configured=['apiKey','authDomain','projectId','appId'].every(k=>typeof firebaseConfig[k]==='string'&&firebaseConfig[k].trim());
state.configured=!!configured;

function subscribe(callback){
  listeners.add(callback);callback(state);return ()=>listeners.delete(callback);
}
function requireMembership(){
  if(state.mode!=='connected')throw new Error('Sign in with an approved account before saving shared data.');
}
function safeFood(food){
  if(!food||food.approved!==true||!['Food Item','Dish','Meal'].includes(food.type||'Food Item')||
     typeof food.id!=='string'||!/^[a-zA-Z0-9_-]{5,128}$/.test(food.id)||
     !food.name||typeof food.name!=='string')throw new Error('Invalid approved food record.');
  const values=food.values||{};
  if(!['calories','protein','carbs','fats','fibre'].every(k=>typeof values[k]==='number'&&Number.isFinite(values[k])&&values[k]>=0))
    throw new Error('Approved foods require all five nutrients.');
  const copy=JSON.parse(JSON.stringify({...food,type:food.type||'Food Item'}));
  // Enforce a maximum of two decimals on every approved nutritional value,
  // irrespective of the precision supplied by a reference database.
  for(const k of ['calories','energyKj','protein','carbs','fats','fibre']){
    if(Number.isFinite(copy.values[k]))copy.values[k]=Number(copy.values[k].toFixed(2));
  }
  if(JSON.stringify(copy).length>40000)throw new Error('Food record is too large.');
  return copy;
}
function saveFoodChanges(previous,next){
  requireMembership();
  const was=new Map((previous||[]).map(item=>[item.id,item]));
  const now=new Map((next||[]).map(item=>[item.id,item]));
  const changes=[];
  for(const [id,item] of now){
    const before=was.get(id);
    if(!before||JSON.stringify(before)!==JSON.stringify(item))changes.push(['put',id,safeFood(item)]);
  }
  for(const id of was.keys())if(!now.has(id))changes.push(['delete',id]);
  if(!changes.length)return;
  if(changes.length>400)throw new Error('Too many changes in a single save.');
  const batch=sdkStore.writeBatch(db);
  for(const [action,id,item] of changes){
    const reference=sdkStore.doc(db,'approvedFoods',id);
    if(action==='put')batch.set(reference,item);else batch.delete(reference);
  }
  // Firestore immediately applies queued writes to its persistent offline cache.
  // commit() only resolves after server acknowledgment, so do not await it in UI.
  batch.commit().catch(error=>setMode('connected',friendly(error)));
}
function normalize(text){return String(text||'').trim().toLocaleLowerCase('en-NZ');}
function uploadLocalFoods(localItems){
  requireMembership();
  if(state.foodsFromCache||!state.initialRemoteFoods)throw new Error('Connect to the server before transferring local foods.');
  const remote=state.foods;
  const knownIds=new Set(remote.map(x=>x.id));
  const matches=remote.slice();
  const accepted=[],skipped=[],blocked=[];
  for(const input of localItems||[]){
    let item;
    try{item=safeFood(input);}catch{blocked.push(String(input?.name||'Unknown item'));continue;}
    const duplicate=matches.some(x=>x.id===item.id||
      (item.barcode&&x.barcode&&normalize(item.barcode)===normalize(x.barcode))||
      (normalize(item.name)===normalize(x.name)&&normalize(item.brand)===normalize(x.brand)&&x.type===item.type));
    if(duplicate){skipped.push(item.name);continue;}
    accepted.push(item);matches.push(item);knownIds.add(item.id);
  }
  // Never import a recipe whose ingredient or parent was skipped/renamed and
  // therefore would point to a missing ID. No automatic ID rewrites or substitutions.
  let changed=true;
  while(changed){
    changed=false;
    for(let i=accepted.length-1;i>=0;i--){
      const food=accepted[i];if(food.type==='Food Item')continue;
      const dependencies=[...(food.components||[]),...(food.additions||[]),...Object.values(food.overrides||{}).filter(Boolean)]
        .map(row=>row.itemId).filter(Boolean);
      if(food.parentId)dependencies.push(food.parentId);
      if(dependencies.some(id=>!knownIds.has(id))){
        blocked.push(food.name+' (missing linked ingredient)');knownIds.delete(food.id);
        accepted.splice(i,1);changed=true;
      }
    }
  }
  if(accepted.length>400)throw new Error('Transfer in groups of fewer than 400 foods.');
  if(accepted.length){
    const batch=sdkStore.writeBatch(db);
    for(const item of accepted)batch.set(sdkStore.doc(db,'approvedFoods',item.id),item);
    batch.commit().catch(error=>setMode('connected',friendly(error)));
  }
  return {queued:accepted.length,skipped:skipped.length,blocked};
}

function watchPersonal(uid,epoch){
  const collections=[['weightEntries','weights'],['waterEntries','waters']];
  for(const [name,key] of collections){
    const stop=sdkStore.onSnapshot(sdkStore.collection(db,'users',uid,name),{includeMetadataChanges:true},snapshot=>{
      if(epoch!==authEpoch)return;
      state[key]=snapshot.docs.map(x=>({id:x.id,...x.data()}));
      state[key+'Loaded']=true;
      state.privateFromCache=snapshot.metadata.fromCache;
      state[key+'Pending']=snapshot.metadata.hasPendingWrites;
      state.privatePending=state.weightsPending||state.watersPending||state.targetsPending;
      broadcast();
    },error=>{if(epoch===authEpoch){state.error=friendly(error);broadcast();}});
    if(name==='weightEntries')stopWeights=stop;else stopWaters=stop;
  }
  stopTargets=sdkStore.onSnapshot(sdkStore.doc(db,'users',uid,'settings','targets'),
    {includeMetadataChanges:true},snapshot=>{
      if(epoch!==authEpoch)return;
      const values=snapshot.data()||{};
      state.targets=Object.fromEntries(['weight','water','steps','protein','fibre'].map(k=>
        [k,Number.isFinite(values[k])&&values[k]>0?values[k]:null]));
      // A missing document on an unprimed offline cache is NOT confirmation
      // that the account has no saved targets. Avoid overwriting unknown goals.
      state.targetsLoaded=snapshot.exists()||!snapshot.metadata.fromCache;
      state.targetsFromCache=snapshot.metadata.fromCache;
      state.targetsPending=snapshot.metadata.hasPendingWrites;
      state.privatePending=state.weightsPending||state.watersPending||state.targetsPending;
      broadcast();
    },error=>{if(epoch===authEpoch){state.error=friendly(error);broadcast();}});
}
function watchFoods(uid,epoch){
  stopFoods=sdkStore.onSnapshot(sdkStore.collection(db,'approvedFoods'),{includeMetadataChanges:true},snapshot=>{
    if(epoch!==authEpoch)return;
    state.foods=snapshot.docs.map(x=>{
      const item={...x.data(),id:x.id};
      if(item.values)item.values=Object.fromEntries(Object.entries(item.values).map(([k,v])=>
        [k,Number.isFinite(v)?Number(v.toFixed(2)):v]));
      return item;
    });
    state.foodsFromCache=snapshot.metadata.fromCache;
    state.pending=snapshot.metadata.hasPendingWrites;
    state.initialRemoteFoods=true;
    if(state.mode!=='connected')state.mode='connected';
    broadcast();
  },error=>{if(epoch===authEpoch)setMode('error',friendly(error));});
  watchPersonal(uid,epoch);
}
async function initialize(){
  setMode('connecting');
  try{
    // Pinned modular SDK. No bundler, Firebase Hosting, or API server required.
    const base='https://www.gstatic.com/firebasejs/13.3.0/';
    const [core,authLib,storeLib]=await Promise.all([
      import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
    sdkAuth=authLib;sdkStore=storeLib;
    app=core.initializeApp(firebaseConfig);
    auth=authLib.getAuth(app);
    db=storeLib.initializeFirestore(app,{localCache:storeLib.persistentLocalCache({tabManager:storeLib.persistentMultipleTabManager()})});
    authLib.onAuthStateChanged(auth,user=>{
      ++authEpoch;const epoch=authEpoch;
      stopSubscriptions();clearAccount();
      if(!user){setMode('signed-out');return;}
      state.uid=user.uid;state.email=user.email||'';state.displayName=user.displayName||'';
      setMode('checking-membership');
      stopMember=storeLib.onSnapshot(storeLib.doc(db,'members',user.uid),{includeMetadataChanges:true},membership=>{
        if(epoch!==authEpoch)return;
        if(!membership.exists()||membership.data().active!==true){
          if(stopFoods){stopFoods();stopFoods=null;}
          if(stopWeights){stopWeights();stopWeights=null;}
          if(stopWaters){stopWaters();stopWaters=null;}
          if(stopTargets){stopTargets();stopTargets=null;}
          state.foods=[];state.weights=[];state.waters=[];state.targets={};state.targetsLoaded=false;
          state.weightsLoaded=false;state.watersLoaded=false;
          setMode(membership.metadata.fromCache?'checking-membership':'not-authorized');return;
        }
        if(!stopFoods)watchFoods(user.uid,epoch);
      },error=>{if(epoch===authEpoch)setMode('error',friendly(error));});
    },error=>setMode('error',friendly(error)));
  }catch(error){setMode('error',friendly(error));}
}
async function signIn(){
  if(!state.configured)throw new Error('Firebase has not been configured.');
  if(!auth)throw new Error('Firebase is still starting.');
  try{state.error='';await sdkAuth.signInWithPopup(auth,new sdkAuth.GoogleAuthProvider());}
  catch(error){state.error=friendly(error);broadcast();throw new Error(state.error);}
}
async function signOut(){
  if(state.pending||state.privatePending)throw new Error('Changes are waiting to sync. Reconnect before signing out.');
  if(auth)await sdkAuth.signOut(auth);
}
function createPrivateEntry(collection,record){
  requireMembership();
  if(!['weightEntries','waterEntries'].includes(collection))throw new Error('Unsupported private record.');
  const id=crypto.randomUUID();
  const payload={...record,id,createdAt:new Date().toISOString()};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(payload.date))throw new Error('Invalid local record date.');
  if(collection==='weightEntries'&&(!Number.isFinite(payload.kg)||payload.kg<20||payload.kg>400))throw new Error('Invalid weight.');
  if(collection==='waterEntries'&&(!Number.isInteger(payload.ml)||payload.ml<=0||payload.ml>10000))throw new Error('Invalid water amount.');
  const task=sdkStore.setDoc(sdkStore.doc(db,'users',state.uid,collection,id),payload);
  task.catch(error=>{state.error=friendly(error);broadcast()});
  return id;
}
function recordWeight(date,kg){return createPrivateEntry('weightEntries',{date,kg});}
function recordWater(date,ml){return createPrivateEntry('waterEntries',{date,ml});}
const TARGET_LIMITS={weight:[20,400],water:[.1,15],steps:[1,100000],protein:[1,1000],fibre:[1,300]};
function saveTargets(values){
  requireMembership();
  if(!state.targetsLoaded)throw new Error('Targets have not finished loading. Reconnect before editing them.');
  if(!values||typeof values!=='object'||Object.keys(values).some(k=>!Object.hasOwn(TARGET_LIMITS,k)))
    throw new Error('Invalid target fields.');
  const clean={};
  for(const [key,value] of Object.entries(values)){
    if(value===null){clean[key]=null;continue;}
    const [min,max]=TARGET_LIMITS[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||
       (key==='steps'&&!Number.isInteger(value)))throw new Error('Invalid '+key+' target.');
    clean[key]=value;
  }
  const task=sdkStore.setDoc(sdkStore.doc(db,'users',state.uid,'settings','targets'),clean,{merge:true});
  task.catch(error=>{state.error=friendly(error);broadcast()});
  return true; // queued locally; server acknowledgement may follow when back online
}
window.addEventListener('online',()=>{state.online=true;broadcast()});
window.addEventListener('offline',()=>{state.online=false;broadcast()});
window.PieChartDB={state,subscribe,signIn,signOut,saveFoodChanges,uploadLocalFoods,recordWeight,recordWater,saveTargets};
broadcast();
if(configured)initialize();
