/* PieChart v0.1.075 — shared libraries with personal favourites, private activity records and step sync.
   Firestore uses owner-private personal collections and member-only approved food and activity libraries.
   No private key belongs in a GitHub Pages app. An administrator manually provisions
   the initial two membership documents through Firebase Console. */
import {firebaseConfig} from './firebase-config.js';

const listeners=new Set();
const state={mode:'local',configured:false,uid:'',displayName:'',email:'',error:'',
  foods:[],activityLibrary:[],favorites:{foods:{},activities:{}},favoritesLoaded:false,favoritesFromCache:true,activityLibraryLoaded:false,activityLibraryFromCache:true,activityLibraryPending:false,foodsFromCache:false,pending:false,online:navigator.onLine,
  weights:[],waters:[],foodEntries:[],activityDays:[],stepDays:[],targets:{},details:{},targetsLoaded:false,targetsFromCache:true,
  weightsLoaded:false,watersLoaded:false,foodEntriesLoaded:false,activityDaysLoaded:false,stepDaysLoaded:false,privateFromCache:true,privatePending:false,
  weightsPending:false,watersPending:false,foodEntriesPending:false,activityDaysPending:false,stepDaysPending:false,targetsPending:false,initialRemoteFoods:false};
let app,auth,db,sdkAuth,sdkStore;
let stopMember=null,stopFoods=null,stopActivityLibrary=null,stopFavorites=null,stopWeights=null,stopWaters=null,stopFoodEntries=null,stopActivities=null,stopSteps=null,stopTargets=null;
let authEpoch=0;
// The original favourites were on shared library documents. During migration,
// seed each member's new private favourites once, then disregard those flags.
let sharedFoods=[],sharedActivities=[];
let gotRemoteFoods=false,gotRemoteActivities=false,needsFavoriteMigration=false,favoriteMigrationPending=false;
function favouriteFlags(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter(([id,on])=>/^[a-zA-Z0-9_-]{5,128}$/.test(id)&&on===true));
}
function overlayPrivateFavorites(){
  state.foods=sharedFoods.map(item=>({...item,favorite:state.favoritesLoaded&&state.favorites.foods[item.id]===true}));
  state.activityLibrary=sharedActivities.map(item=>({...item,favorite:state.favoritesLoaded&&state.favorites.activities[item.id]===true}));
}
function maybeMigrateFavourites(uid,epoch){
  if(epoch!==authEpoch||!needsFavoriteMigration||favoriteMigrationPending||!gotRemoteFoods||!gotRemoteActivities||!state.uid)return;
  favoriteMigrationPending=true;
  // Copy only the old flags visible at the first authenticated read. This is a
  // one-time starting point; each member's selections diverge independently.
  const foods=Object.fromEntries(sharedFoods.filter(x=>x.favorite===true).map(x=>[x.id,true]));
  const activities=Object.fromEntries(sharedActivities.filter(x=>x.favorite===true).map(x=>[x.id,true]));
  const ref=sdkStore.doc(db,'users',uid,'settings','favorites');
  sdkStore.runTransaction(db,async transaction=>{
    const current=await transaction.get(ref);
    if(!current.exists())transaction.set(ref,{foods,activities,initialized:true});
  }).catch(error=>{if(epoch===authEpoch){favoriteMigrationPending=false;state.error=friendly(error);broadcast();}});
}
function watchFavorites(uid,epoch){
  stopFavorites=sdkStore.onSnapshot(sdkStore.doc(db,'users',uid,'settings','favorites'),{includeMetadataChanges:true},snapshot=>{
    if(epoch!==authEpoch)return;
    state.favoritesFromCache=snapshot.metadata.fromCache;
    if(snapshot.exists()){
      const data=snapshot.data()||{};
      state.favorites={foods:favouriteFlags(data.foods),activities:favouriteFlags(data.activities)};
      state.favoritesLoaded=true;needsFavoriteMigration=false;favoriteMigrationPending=false;
    }else if(!snapshot.metadata.fromCache){
      // Don't treat missing offline cache data as an empty personal selection.
      needsFavoriteMigration=true;
      maybeMigrateFavourites(uid,epoch);
    }
    overlayPrivateFavorites();broadcast();
  },error=>{if(epoch===authEpoch){state.error=friendly(error);broadcast();}});
}
function saveFavorite(kind,id,on,{silent=false}={}){
  requireMembership();
  if(!state.favoritesLoaded)throw new Error('Your personal favourites have not finished loading.');
  if(!['foods','activities'].includes(kind)||typeof id!=='string'||!/^[a-zA-Z0-9_-]{5,128}$/.test(id))throw new Error('Invalid favourite item.');
  if(on===true)state.favorites[kind][id]=true;else delete state.favorites[kind][id];
  overlayPrivateFavorites();if(!silent)broadcast();
  const ref=sdkStore.doc(db,'users',state.uid,'settings','favorites');
  // Merge only this ID, rather than replacing the list and racing another tab.
  const change=on===true?true:sdkStore.deleteField();
  sdkStore.setDoc(ref,{[kind]:{[id]:change}},{merge:true})
    .catch(error=>{state.error=friendly(error);broadcast()});
  return true;
}
function saveFavouriteDifferences(previous,next,kind){
  const prior=new Map((previous||[]).map(x=>[x.id,x]));
  for(const item of next||[]){
    const old=prior.get(item.id);
    if(!!old?.favorite!==!!item.favorite)saveFavorite(kind,item.id,!!item.favorite,{silent:true});
    prior.delete(item.id);
  }
  // Remove personal flags when the shared library item is deleted.
  for(const old of prior.values())if(old.favorite)saveFavorite(kind,old.id,false,{silent:true});
}

function broadcast(){
  window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:state}));
  for(const callback of listeners){try{callback(state)}catch(error){console.error(error)}}
}
function setMode(mode,error=''){state.mode=mode;state.error=error;broadcast();}
function stopSubscriptions(){
  for(const stop of [stopMember,stopFoods,stopActivityLibrary,stopFavorites,stopWeights,stopWaters,stopFoodEntries,stopActivities,stopSteps,stopTargets])try{stop?.()}catch{}
  stopMember=stopFoods=stopActivityLibrary=stopFavorites=stopWeights=stopWaters=stopFoodEntries=stopActivities=stopSteps=stopTargets=null;
}
function clearAccount(){
  sharedFoods=[];sharedActivities=[];gotRemoteFoods=gotRemoteActivities=false;needsFavoriteMigration=favoriteMigrationPending=false;
  state.uid='';state.displayName='';state.email='';state.foods=[];state.activityLibrary=[];state.favorites={foods:{},activities:{}};state.favoritesLoaded=false;state.favoritesFromCache=true;state.activityLibraryLoaded=false;state.activityLibraryFromCache=true;state.activityLibraryPending=false;state.weights=[];
  state.waters=[];state.foodEntries=[];state.activityDays=[];state.stepDays=[];state.targets={};state.details={};state.targetsLoaded=false;state.targetsFromCache=true;
  state.weightsLoaded=false;state.watersLoaded=false;state.foodEntriesLoaded=false;state.activityDaysLoaded=false;state.stepDaysLoaded=false;state.privatePending=false;
  state.weightsPending=false;state.watersPending=false;state.foodEntriesPending=false;state.activityDaysPending=false;state.stepDaysPending=false;state.targetsPending=false;
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
  if(state.mode!=='connected')throw new Error('Sign in with an authorised account before saving shared data.');
}
function safeFood(food){
  if(!food||food.approved!==true||!['Food Item','Dish','Meal'].includes(food.type||'Food Item')||
     typeof food.id!=='string'||!/^[a-zA-Z0-9_-]{5,128}$/.test(food.id)||
     !food.name||typeof food.name!=='string')throw new Error('Invalid food library record.');
  const values=food.values||{};
  if(!['calories','protein','carbs','fats','fibre'].every(k=>typeof values[k]==='number'&&Number.isFinite(values[k])&&values[k]>=0))
    throw new Error('Food Items require all five nutrients.');
  const copy=JSON.parse(JSON.stringify({...food,type:food.type||'Food Item'}));
  delete copy.favorite; // Never store an individual's selection in shared Foods.
  if(JSON.stringify(copy).length>40000)throw new Error('Food record is too large.');
  return copy;
}
// Shared-library persistence is identical for Foods and Activities: sanitise
// records, ignore timestamp-only edits, write changed records in one batch,
// and keep each member's favourites exclusively in their own settings.
function saveSharedLibraryChanges(previous,next,{collection,kind,cleanRecord,errorLimit}){
  requireMembership();
  const before=new Map((previous||[]).map(item=>[item.id,item]));
  const after=new Map((next||[]).map(item=>[item.id,item]));
  const changes=[];
  for(const [id,item] of after){
    const clean=cleanRecord(item);
    const prior=before.has(id)?cleanRecord(before.get(id)):null;
    if(!prior||!sameExceptSavedAt(prior,clean))changes.push(['put',id,clean]);
  }
  for(const id of before.keys())if(!after.has(id))changes.push(['delete',id]);
  if(changes.length>400)throw new Error(errorLimit);
  saveFavouriteDifferences(previous,next,kind);
  if(!changes.length)return false;
  const batch=sdkStore.writeBatch(db);
  for(const [action,id,item] of changes){
    const ref=sdkStore.doc(db,collection,id);
    if(action==='put')batch.set(ref,item);else batch.delete(ref);
  }
  // Offline writes are queued by Firestore immediately. Show later rejection
  // without blocking the editor waiting for the server to acknowledge the batch.
  batch.commit().catch(error=>{state.error=friendly(error);broadcast();});
  return true;
}
function sameExceptSavedAt(before,after){
  const b={...before},a={...after};
  delete b.savedAt;delete a.savedAt;
  return JSON.stringify(b)===JSON.stringify(a);
}
function saveFoodChanges(previous,next){
  return saveSharedLibraryChanges(previous,next,{
    collection:'approvedFoods',kind:'foods',cleanRecord:safeFood,
    errorLimit:'Too many changes in a single save.'
  });
}
// Activity Library is shared by the same two authorised members as approved foods.
// It contains reusable, named activity instances; recorded events remain owner-private.
const LIBRARY_ACTIVITY_TYPES=['Walking','Running','Cycling','Swimming','Weights','Gardening','Housework','Hiking','Yoga','Sport','Other'];
function validOptionalNumber(value,min,max){return value===null||value===undefined||(Number.isFinite(value)&&value>=min&&value<=max);}
function safeLibraryActivity(input){
  if(!input||typeof input!=='object'||typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{5,128}$/.test(input.id)||
     typeof input.name!=='string'||!input.name.trim()||input.name.length>160||!LIBRARY_ACTIVITY_TYPES.includes(input.type)||
     !validOptionalNumber(input.minutes,1,720)||!validOptionalNumber(input.distanceKm,.01,1000)||
     !validOptionalNumber(input.steps,1,100000)||!['light','moderate','vigorous'].includes(input.intensity||'moderate'))
    throw new Error('Check the activity name, type, and measurements.');
  const copy={id:input.id,name:input.name.trim(),type:input.type,
    minutes:input.minutes??null,distanceKm:input.distanceKm??null,steps:input.steps??null,
    intensity:input.intensity||'moderate',favorite:false, // Required by existing rules; never a shared personal preference.
    savedAt:typeof input.savedAt==='string'?input.savedAt:new Date().toISOString()};
  if(copy.minutes===null&&copy.distanceKm===null&&copy.steps===null)
    throw new Error('Save at least one of duration, distance, or steps.');
  return copy;
}
function saveActivityLibraryChanges(previous,next){
  return saveSharedLibraryChanges(previous,next,{
    collection:'approvedActivities',kind:'activities',cleanRecord:safeLibraryActivity,
    errorLimit:'Too many activity library changes at once.'
  });
}
function watchPersonal(uid,epoch){
  const collections=[['weightEntries','weights'],['waterEntries','waters'],['foodEntries','foodEntries'],['exerciseEntries','activityDays'],['dailyTotals','stepDays']];
  for(const [name,key] of collections){
    const stop=sdkStore.onSnapshot(sdkStore.collection(db,'users',uid,name),{includeMetadataChanges:true},snapshot=>{
      if(epoch!==authEpoch)return;
      // dailyTotals is an owner-private collection shared with future daily summaries.
      // Accept only genuine, explicit Health Connect step records. An absent day is
      // unknown, not zero. Never infer a step count from sample history.
      state[key]=name==='dailyTotals'
        ?snapshot.docs.map(x=>({id:x.id,...x.data()})).filter(row=>
          /^\d{4}-\d{2}-\d{2}$/.test(row.date||'')&&
          Number.isInteger(row.steps)&&row.steps>=0&&row.steps<=100000&&
          row.source==='health_connect'&&typeof row.complete==='boolean')
        :snapshot.docs.map(x=>({id:x.id,...x.data()}));
      state[key+'Loaded']=true;
      state.privateFromCache=snapshot.metadata.fromCache;
      state[key+'Pending']=snapshot.metadata.hasPendingWrites;
      state.privatePending=state.weightsPending||state.watersPending||state.foodEntriesPending||state.activityDaysPending||state.stepDaysPending||state.targetsPending;
      broadcast();
    },error=>{if(epoch===authEpoch){state.error=friendly(error);broadcast();}});
    if(name==='weightEntries')stopWeights=stop;else if(name==='waterEntries')stopWaters=stop;else if(name==='foodEntries')stopFoodEntries=stop;else if(name==='exerciseEntries')stopActivities=stop;else stopSteps=stop;
  }
  stopTargets=sdkStore.onSnapshot(sdkStore.doc(db,'users',uid,'settings','targets'),
    {includeMetadataChanges:true},snapshot=>{
      if(epoch!==authEpoch)return;
      const values=snapshot.data()||{};
      state.targets=Object.fromEntries(['weight','water','steps','protein','fibre'].map(k=>
        [k,Number.isFinite(values[k])&&values[k]>0?values[k]:null]));
      // An unset intensity in an older account defaults to Moderate; never overwrite
      // Firestore merely because the older document did not contain the new field.
      state.targets.goalIntensity=['gentle','moderate','strong'].includes(values.goalIntensity)
        ?values.goalIntensity:'moderate';
      const details=values.details||{};
      state.details={
        dateOfBirth:typeof details.dateOfBirth==='string'&&isValidDateOfBirth(details.dateOfBirth)?details.dateOfBirth:null,
        heightCm:Number.isFinite(details.heightCm)&&details.heightCm>=80&&details.heightCm<=250?details.heightCm:null,
        sex:['female','male'].includes(details.sex)?details.sex:null
      };
      // A missing document on an unprimed offline cache is NOT confirmation
      // that the account has no saved targets. Avoid overwriting unknown goals.
      state.targetsLoaded=snapshot.exists()||!snapshot.metadata.fromCache;
      state.targetsFromCache=snapshot.metadata.fromCache;
      state.targetsPending=snapshot.metadata.hasPendingWrites;
      state.privatePending=state.weightsPending||state.watersPending||state.foodEntriesPending||state.activityDaysPending||state.stepDaysPending||state.targetsPending;
      broadcast();
    },error=>{if(epoch===authEpoch){state.error=friendly(error);broadcast();}});
}
function watchFoods(uid,epoch){
  stopFoods=sdkStore.onSnapshot(sdkStore.collection(db,'approvedFoods'),{includeMetadataChanges:true},snapshot=>{
    if(epoch!==authEpoch)return;
    sharedFoods=snapshot.docs.map(x=>({...x.data(),id:x.id}));
    gotRemoteFoods=!snapshot.metadata.fromCache;
    overlayPrivateFavorites();
    maybeMigrateFavourites(uid,epoch);
    state.foodsFromCache=snapshot.metadata.fromCache;
    state.pending=snapshot.metadata.hasPendingWrites;
    state.initialRemoteFoods=true;
    if(state.mode!=='connected')state.mode='connected';
    broadcast();
  },error=>{if(epoch===authEpoch)setMode('error',friendly(error));});
  stopActivityLibrary=sdkStore.onSnapshot(sdkStore.collection(db,'approvedActivities'),{includeMetadataChanges:true},snapshot=>{
    if(epoch!==authEpoch)return;
    sharedActivities=snapshot.docs.map(x=>({...x.data(),id:x.id}));
    gotRemoteActivities=!snapshot.metadata.fromCache;
    overlayPrivateFavorites();
    maybeMigrateFavourites(uid,epoch);
    state.activityLibraryLoaded=true;
    state.activityLibraryFromCache=snapshot.metadata.fromCache;
    state.activityLibraryPending=snapshot.metadata.hasPendingWrites;
    broadcast();
  },error=>{if(epoch===authEpoch){state.error=friendly(error);broadcast();}});
  watchPersonal(uid,epoch);
  watchFavorites(uid,epoch);
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
          if(stopActivityLibrary){stopActivityLibrary();stopActivityLibrary=null;}
          if(stopFavorites){stopFavorites();stopFavorites=null;}
          if(stopWeights){stopWeights();stopWeights=null;}
          if(stopWaters){stopWaters();stopWaters=null;}
          if(stopTargets){stopTargets();stopTargets=null;}
          if(stopFoodEntries){stopFoodEntries();stopFoodEntries=null;}
          if(stopActivities){stopActivities();stopActivities=null;}
          state.foods=[];state.activityLibrary=[];state.favorites={foods:{},activities:{}};state.favoritesLoaded=false;state.activityLibraryLoaded=false;state.weights=[];state.waters=[];state.foodEntries=[];state.activityDays=[];state.stepDays=[];state.targets={};state.details={};state.targetsLoaded=false;
          state.weightsLoaded=false;state.watersLoaded=false;state.foodEntriesLoaded=false;state.activityDaysLoaded=false;
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
  if(state.pending||state.activityLibraryPending||state.privatePending)throw new Error('Changes are waiting to sync. Reconnect before signing out.');
  if(auth)await sdkAuth.signOut(auth);
}
function validateFoodEntry(payload){
  if(typeof payload.itemId!=='string'||!payload.itemId||typeof payload.name!=='string'||!payload.name||
     !Number.isFinite(payload.quantity)||payload.quantity<=0||payload.quantity>100000||
     !Number.isFinite(payload.waterMl)||payload.waterMl<0||payload.waterMl>100000||
     !['Food Item','Dish','Meal'].includes(payload.type)||
     !['g','mL','whole'].includes(payload.unit)||
     !['calories','protein','carbs','fats','fibre','energyKj'].every(k=>Number.isFinite(payload.nutrition?.[k])&&payload.nutrition[k]>=0))
    throw new Error('Invalid food record.');
}
function createPrivateEntry(collection,record,{onWriteError=null}={}){
  requireMembership();
  if(!['weightEntries','waterEntries','foodEntries'].includes(collection))throw new Error('Unsupported private record.');
  const id=crypto.randomUUID();
  const payload={...record,id,createdAt:new Date().toISOString()};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(payload.date))throw new Error('Invalid local record date.');
  if(collection==='weightEntries'&&(!Number.isFinite(payload.kg)||payload.kg<20||payload.kg>400))throw new Error('Invalid weight.');
  if(collection==='waterEntries'&&(!Number.isInteger(payload.ml)||payload.ml<=0||payload.ml>10000))throw new Error('Invalid water amount.');
  if(collection==='foodEntries')validateFoodEntry(payload);
  const task=sdkStore.setDoc(sdkStore.doc(db,'users',state.uid,collection,id),payload);
  task.catch(error=>{
    state.error=friendly(error);broadcast();
    if(typeof onWriteError==='function'){
      try{onWriteError(state.error)}catch(callbackError){console.error(callbackError)}
    }
  });
  return id;
}
function recordWeight(date,kg){return createPrivateEntry('weightEntries',{date,kg});}
// Private-event deletion is the same owner-only operation for recorded food,
// weight, and activity. Keep each public wrapper for a stable UI API.
function deletePrivateEntry(collection,key,id,label){
  requireMembership();
  if(typeof id!=='string'||!state[key].some(e=>e.id===id))
    throw new Error(label+' record not found.');
  sdkStore.deleteDoc(sdkStore.doc(db,'users',state.uid,collection,id))
    .catch(error=>{state.error=friendly(error);broadcast();});
  return true;
}
function deleteWeight(id){return deletePrivateEntry('weightEntries','weights',id,'Weight');}
function deleteFoodEntry(id){return deletePrivateEntry('foodEntries','foodEntries',id,'Food entry');}
function deleteWaterEntry(id){return deletePrivateEntry('waterEntries','waters',id,'Water');}
// Each newly-recorded glass of water is a Food Item consumption, not a second
// independent water counter. Old waterEntries are read-only history and remain counted.
function recordFood(date,entry,options){
  return createPrivateEntry('foodEntries',{date,...entry},options);
}
// Edit the original private diary record, preserving its nutrition snapshot,
// identity and creation timestamp. The same validation applies as on recording.
function updateFoodEntry(id,changes){
  requireMembership();
  const entry=state.foodEntries.find(e=>e.id===id);
  if(!entry)throw new Error('Food entry not found in this account.');
  if(!changes||Object.keys(changes).some(k=>!['date','quantity','nutrition','waterMl'].includes(k)))
    throw new Error('Only date, quantity, nutrition and water can be edited.');
  const updated={...entry,...changes};
  if(typeof updated.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(updated.date)||
     !Number.isFinite(Date.parse(updated.date+'T00:00:00Z'))||
     new Date(updated.date+'T00:00:00Z').toISOString().slice(0,10)!==updated.date)
    throw new Error('Invalid food entry date.');
  validateFoodEntry(updated);
  const task=sdkStore.updateDoc(sdkStore.doc(db,'users',state.uid,'foodEntries',id),{
    ...changes,updatedAt:new Date().toISOString()
  });
  task.catch(error=>{state.error=friendly(error);broadcast();});
  return true;
}
function recordWater(date,ml,waterFood,options){
  if(!Number.isInteger(ml)||ml<=0||ml>10000)throw new Error('Invalid water amount.');
  if(!waterFood||waterFood.type!=='Food Item'||String(waterFood.name).trim().toLowerCase()!=='water')
    throw new Error('Add a Food Item named Water to the shared library first.');
  const values=waterFood.values||{};
  const nutrition={};
  for(const k of ['calories','protein','carbs','fats','fibre']){
    if(!Number.isFinite(values[k])||values[k]<0)throw new Error('The Water Food Item has incomplete nutrition.');
    nutrition[k]=Math.round(values[k]*ml)/100; // two decimal places for a per-100 mL quantity
  }
  nutrition.energyKj=Math.round((Number.isFinite(values.energyKj)?values.energyKj:values.calories*4.184)*ml)/100;
  return recordFood(date,{itemId:waterFood.id,name:waterFood.name,type:'Food Item',unit:'mL',
    quantity:ml,waterMl:ml,nutrition,source:'water-shortcut'},options);
}
// Owner-private logged exercise. Existing deployed Firestore rules already allow
// users/{uid}/exerciseEntries; no rule or data migration is needed.
function checkActivityEntry(input){
  if(!input||typeof input!=='object'||!LIBRARY_ACTIVITY_TYPES.includes(input.type)||
     typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||
     !Number.isFinite(Date.parse(input.date+'T00:00:00Z'))||
     new Date(input.date+'T00:00:00Z').toISOString().slice(0,10)!==input.date||
     input.date>new Date().toLocaleDateString('sv-SE'))throw new Error('Check the activity date and type.');
  const minutes=input.minutes??null,distanceKm=input.distanceKm??null,stepsCount=input.stepsCount??null;
  if(!validOptionalNumber(minutes,1,720)||!validOptionalNumber(distanceKm,.01,1000)||
     !validOptionalNumber(stepsCount,1,100000)||
     (minutes===null&&distanceKm===null&&stepsCount===null)||
     !Number.isFinite(input.mets)||input.mets<1||input.mets>23||
     !validOptionalNumber(input.netKcalPerKg,0,2000)||
     !['light','moderate','vigorous'].includes(input.intensity||'moderate'))
      throw new Error('Enter valid time, distance, or steps.');
  const origin=input.stepOrigin||'none',relation=input.stepRelation||'none';
  if(!['none','manual','estimated'].includes(origin)||!['none','included','additional'].includes(relation)||
     !Number.isInteger(input.stepsIncluded)||input.stepsIncluded<0||input.stepsIncluded>100000||
     (origin==='none'&&relation!=='none')||(origin!=='none'&&relation==='none')||
     (relation==='none'&&input.stepsIncluded!==0)||
     (relation!=='none'&&input.stepsIncluded<=0))throw new Error('Confirm whether activity steps are additional to Health Connect.');
  return {date:input.date,type:input.type,name:String(input.name||input.type).trim().slice(0,160),
    libraryId:typeof input.libraryId==='string'?input.libraryId:'',
    minutes,distanceKm,stepsCount,
    intensity:input.intensity||'moderate',mets:input.mets,
    netKcalPerKg:input.netKcalPerKg??null,
    stepOrigin:origin,stepRelation:relation,
    stepOverlap:relation!=='none',stepsIncluded:input.stepsIncluded};
}
function saveActivity(input,id=null){
  requireMembership();
  const record=checkActivityEntry(input);
  if(id!==null&&(typeof id!=='string'||!/^[a-zA-Z0-9_-]{5,128}$/.test(id)))throw new Error('Invalid activity record.');
  const identifier=id||crypto.randomUUID();
  const existing=id?state.activityDays.find(r=>r.id===id):null;
  if(id&&!existing)throw new Error('Activity not found in this account.');
  const payload={...record,id:identifier,
    createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  sdkStore.setDoc(sdkStore.doc(db,'users',state.uid,'exerciseEntries',identifier),payload)
    .catch(error=>{state.error=friendly(error);broadcast()});
  return identifier;
}
function deleteActivity(id){
  if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{5,128}$/.test(id))throw new Error('Activity not found in this account.');
  return deletePrivateEntry('exerciseEntries','activityDays',id,'Activity');
}
const TARGET_LIMITS={weight:[20,400],water:[.1,15],steps:[1,100000],protein:[1,1000],fibre:[1,300]};
// Date of birth and stature are stored in the account-private settings document.
// No age, calorie budget, or activity level is guessed from missing fields.
function isValidDateOfBirth(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(year,month-1,day);
  const today=new Date();
  return year>=1900&&date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day&&
    date.getTime()<=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
}
function cleanDetails(values){
  if(!values||typeof values!=='object'||Object.keys(values).some(k=>!['dateOfBirth','heightCm','sex'].includes(k)))
    throw new Error('Invalid personal details.');
  const {dateOfBirth=null,heightCm=null,sex=null}=values;
  if(dateOfBirth!==null&&!isValidDateOfBirth(dateOfBirth))throw new Error('Check the date of birth.');
  if(heightCm!==null&&(typeof heightCm!=='number'||!Number.isFinite(heightCm)||heightCm<80||heightCm>250))
    throw new Error('Check the height.');
  if(sex!==null&&!['female','male'].includes(sex))throw new Error('Check the sex used for the energy estimate.');
  return {dateOfBirth,heightCm,sex};
}
function cleanTargets(values){
  if(!values||typeof values!=='object'||Object.keys(values).some(k=>k!=='goalIntensity'&&!Object.hasOwn(TARGET_LIMITS,k)))
    throw new Error('Invalid target fields.');
  const clean={};
  for(const [key,value] of Object.entries(values)){
    if(key==='goalIntensity'){
      if(!['gentle','moderate','strong'].includes(value))throw new Error('Choose a valid goal intensity.');
      clean.goalIntensity=value;
      continue;
    }
    if(value===null){clean[key]=null;continue;}
    const [min,max]=TARGET_LIMITS[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||
       (key==='steps'&&!Number.isInteger(value)))throw new Error('Invalid '+key+' target.');
    clean[key]=value;
  }
  return clean;
}
function saveDetailsAndTargets(values){
  requireMembership();
  if(!state.targetsLoaded)throw new Error('Details & Targets have not finished loading. Reconnect before editing them.');
  const targets=cleanTargets(values?.targets);
  const details=cleanDetails(values?.details);
  // Same settings/targets document and owner-only rules as previous releases.
  // Single atomic write avoids saving only half a form.
  const task=sdkStore.setDoc(sdkStore.doc(db,'users',state.uid,'settings','targets'),
    {...targets,details},{merge:true});
  task.catch(error=>{state.error=friendly(error);broadcast()});
  return true;
}

window.addEventListener('online',()=>{state.online=true;broadcast()});
window.addEventListener('offline',()=>{state.online=false;broadcast()});
window.PieChartDB={state,subscribe,signIn,signOut,saveFavorite,saveFoodChanges,saveActivityLibraryChanges,recordWeight,deleteWeight,recordWater,deleteWaterEntry,recordFood,updateFoodEntry,deleteFoodEntry,saveActivity,deleteActivity,saveDetailsAndTargets};
broadcast();
if(configured)initialize();
