/* PieChart automatic release detection. No service worker or app-shell cache.
 * Checks a tiny version marker after startup and while installed/online.
 * Reloads only for a newer deployed release and never interrupts a draft.
 */
(function(root){
'use strict';
const VERSION='0.1.110';
const CHECK_DELAY_MS=15000;
const CHECK_INTERVAL_MS=5*60*1000;
const RECHECK_ON_FOREGROUND_MS=60*1000;
const IDLE_MS=15000;
const RELOAD_RETRY_MS=5000;
const RELOAD_COOLDOWN_MS=90*1000;
const RELOAD_ATTEMPT_KEY='piechartReleaseReloadAttempt';
function compareVersions(a,b){
  if(!/^\d+\.\d+\.\d+$/.test(a)||!/^\d+\.\d+\.\d+$/.test(b))return null;
  const left=a.split('.').map(Number),right=b.split('.').map(Number);
  for(let i=0;i<3;i++){
    if(left[i]>right[i])return 1;
    if(left[i]<right[i])return -1;
  }
  return 0;
}
function createMonitor({win=root,doc=win.document,version=null,
    clock=()=>Date.now(),schedule=(f,ms)=>win.setTimeout(f,ms),
    unschedule=id=>win.clearTimeout(id),
    fetchVersion=()=>win.fetch(new URL('app-version.json',doc.baseURI),{cache:'no-store'}),
    reload=()=>win.location.reload()}={}){
  // The page title already carries the release number. Deriving it here means
  // a future version needs only the normal title and version-marker updates.
  const runningVersion=version||(/v(\d+\.\d+\.\d+)/.exec(doc?.title||'')||[])[1]||VERSION;
  let started=false,stopped=false,running=false,timer=null,retry=null;
  let lastCheck=0,lastInteraction=clock(),pendingVersion='';
  function readAttempt(){
    try{return JSON.parse(win.sessionStorage.getItem(RELOAD_ATTEMPT_KEY)||'null');}catch{return null;}
  }
  function writeAttempt(value){
    try{win.sessionStorage.setItem(RELOAD_ATTEMPT_KEY,JSON.stringify(value));}catch{}
  }
  function scanHandoffPending(){
    try{
      const saved=JSON.parse(win.localStorage.getItem('piechartFoodScanHandoffV1')||'null');
      return !!(saved&&Number.isFinite(saved.created)&&
        clock()>=saved.created-60000&&clock()-saved.created<30*60*1000);
    }catch{return false;}
  }
  function safeToReload(){
    const backdrop=doc.getElementById('entry-backdrop');
    if(backdrop&&!backdrop.hidden)return false;
    if(doc.getElementById('food-scanner'))return false;
    if(doc.querySelector('.fdm-save-dialog[open],.activity-save-popup[open],.activity-step-dialog[open]'))return false;
    if(doc.querySelector('.screen.history-view'))return false;
    if(win.location.hash.startsWith('#piechart-scan-'))return false;
    if(scanHandoffPending())return false;
    if(win.navigator?.onLine===false)return false;
    if(win.PieChartDB?.hasUnsyncedWrites?.())return false;
    const db=win.PieChartDB?.state;
    if(db&&(db.pending||db.privatePending||db.activityLibraryPending||db.favoritesPending||db.weightsPending||db.watersPending||db.foodEntriesPending||db.activityDaysPending||db.stepDaysPending||db.targetsPending))return false;
    // Updating a hidden idle page is safe; visible sessions should be idle.
    if(!doc.hidden&&clock()-lastInteraction<IDLE_MS)return false;
    return true;
  }
  function queueRetry(){
    if(retry!==null||stopped)return;
    retry=schedule(()=>{retry=null;tryReload();},RELOAD_RETRY_MS);
  }
  function tryReload(){
    if(stopped||!pendingVersion)return false;
    if(!safeToReload()){queueRetry();return false;}
    const previous=readAttempt();
    if(previous?.version===pendingVersion&&clock()-previous.at<RELOAD_COOLDOWN_MS){queueRetry();return false;}
    writeAttempt({version:pendingVersion,at:clock()});
    reload();
    return true;
  }
  async function check(){
    if(stopped||running)return;
    if(pendingVersion){tryReload();return;}
    running=true;
    try{
      const response=await fetchVersion();
      if(!response.ok)return;
      const info=await response.json();
      const latest=String(info?.version||'');
      if(compareVersions(latest,runningVersion)===1){pendingVersion=latest;tryReload();}
    }catch{/* Network unavailable: retain the running app and retry later. */}
    finally{lastCheck=clock();running=false;}
  }
  function scheduleNext(ms){
    if(stopped)return;
    if(timer!==null)unschedule(timer);
    timer=schedule(async()=>{
      timer=null;
      await check();
      scheduleNext(CHECK_INTERVAL_MS);
    },ms);
  }
  function onInteraction(){lastInteraction=clock();}
  function onForeground(){
    if(stopped||!started)return;
    if(pendingVersion){tryReload();return;}
    if(clock()-lastCheck>=RECHECK_ON_FOREGROUND_MS)scheduleNext(1200);
  }
  function start(){
    if(started)return;
    started=true;
    // No network request on the startup critical path.
    scheduleNext(CHECK_DELAY_MS);
    for(const event of ['pointerdown','keydown','touchstart','input','wheel'])
      doc.addEventListener(event,onInteraction,{passive:true});
    doc.addEventListener('visibilitychange',onForeground);
    win.addEventListener('focus',onForeground);
    win.addEventListener('pageshow',onForeground);
  }
  function stop(){
    stopped=true;
    if(timer!==null)unschedule(timer);
    if(retry!==null)unschedule(retry);
    for(const event of ['pointerdown','keydown','touchstart','input','wheel'])
      doc.removeEventListener(event,onInteraction);
    doc.removeEventListener('visibilitychange',onForeground);
    win.removeEventListener('focus',onForeground);
    win.removeEventListener('pageshow',onForeground);
  }
  return Object.freeze({start,stop,check,tryReload,get pendingVersion(){return pendingVersion;}});
}
const api=Object.freeze({VERSION,compareVersions,createMonitor});
if(typeof module==='object'&&module.exports)module.exports=api;
root.PieChartUpdates=api;
if(root.document&&root.location){
  const monitor=createMonitor();
  if(root.document.readyState==='complete')monitor.start();
  else root.addEventListener('load',()=>monitor.start(),{once:true});
}
})(typeof window==='object'?window:globalThis);
