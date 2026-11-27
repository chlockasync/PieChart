/* PieChart entry-flow contracts.
 * A selection's origin determines whether it edits a reusable library definition
 * or a private dated recording. Keep this decision out of individual result rows.
 * No database writes, DOM access, or product defaults live in this module.
 */
(function(root){
'use strict';
const INTENTS=new Set(['create-library','edit-library','record-new','edit-record']);
const ORIGINS=new Set(['today','library']);
function activity(intent,{item=null,record=null,name='',origin='today'}={}){
  if(!INTENTS.has(intent)||!ORIGINS.has(origin))throw new Error('Invalid activity form route.');
  if((intent==='edit-library'||intent==='record-new')&&!item)
    throw new Error('An Activity Library item is required for this form.');
  if(intent==='edit-record'&&!record)
    throw new Error('A recorded Activity is required for this form.');
  if(intent==='create-library'&&(item||record)||intent==='edit-library'&&record||
     intent==='record-new'&&record||intent==='edit-record'&&!record)
    throw new Error('Conflicting Activity form route.');
  return Object.freeze({intent,item,record,name:String(name||''),origin});
}
function activitySelection(item,fromToday){
  return activity(fromToday?'record-new':'edit-library',{
    item,origin:fromToday?'today':'library'
  });
}
function activityCreation(name,fromToday){
  return activity('create-library',{name,origin:fromToday?'today':'library'});
}
function activityRecording(record,item=null){
  return activity('edit-record',{record,item,origin:'today'});
}
function activityAfterLibrarySave(item,origin){
  return activity('record-new',{item,origin});
}
function describeActivity(route){
  if(!route||!INTENTS.has(route.intent)||!ORIGINS.has(route.origin))
    throw new Error('Activity editor requires an explicit route.');
  const isRecording=route.intent==='record-new'||route.intent==='edit-record';
  const isRecordedEdit=route.intent==='edit-record';
  return Object.freeze({
    isRecording,isRecordedEdit,
    isLibraryEdit:route.intent==='edit-library',
    isLibraryCreation:route.intent==='create-library',
    fromToday:route.origin==='today',
    title:isRecordedEdit?'Edit recorded activity':isRecording?'Record activity':'Activity',
    saveLabel:isRecordedEdit?'Save changes':isRecording?'Record':
      route.intent==='edit-library'?'Save changes':'Add to library'
  });
}
// One navigation stack for the Food, Water, Activity, Weight, and Settings
// dialogs. It preserves live DOM nodes (and their handlers), but owns no
// business logic or subscriptions beyond disposing abandoned frames.
function createEntryStack({content,heading,backdrop}){
  if(!content||!heading||!backdrop)throw new Error('Entry stack requires dialog elements.');
  const frames=[];
  return Object.freeze({
    get depth(){return frames.length;},
    push({dailyNav=null,libraryBack=null,cleanup=null}={}){
      const nodes=content.ownerDocument.createDocumentFragment();
      while(content.firstChild)nodes.append(content.firstChild);
      frames.push({title:heading.textContent,nodes,scroll:content.scrollTop,
        weight:backdrop.classList.contains('weight-entry'),
        food:backdrop.classList.contains('food-library-entry'),
        diary:backdrop.classList.contains('food-diary-entry'),
        daily:backdrop.classList.contains('daily-entry-view'),
        dailyNav,libraryBack,cleanup});
    },
    pop(){
      if(!frames.length)return null;
      const previous=frames.pop();
      content.replaceChildren(previous.nodes);
      heading.textContent=previous.title;
      backdrop.classList.toggle('weight-entry',previous.weight);
      backdrop.classList.toggle('food-library-entry',previous.food);
      backdrop.classList.toggle('food-diary-entry',previous.diary);
      backdrop.classList.toggle('daily-entry-view',previous.daily);
      return {dailyNav:previous.dailyNav,libraryBack:previous.libraryBack,
        cleanup:previous.cleanup,scroll:previous.scroll};
    },
    clear(){
      for(const frame of frames)frame.cleanup?.();
      frames.length=0;
    }
  });
}
const api=Object.freeze({activity,activitySelection,activityCreation,
  activityRecording,activityAfterLibrarySave,describeActivity,createEntryStack});
root.PieChartEntryFlows=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
