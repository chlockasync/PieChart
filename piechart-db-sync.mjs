/* PieChart Firestore synchronization primitives, v0.1.109.
 * Pure data transformations only: no Firebase, DOM, network, or local storage.
 * The adapter remains responsible for access checks, document paths, writes,
 * snapshot subscriptions, and exposing the existing PieChartDB UI API.
 */
export function sameExceptSavedAt(previous,current){
  const before={...previous},after={...current};
  delete before.savedAt;delete after.savedAt;
  return JSON.stringify(before)===JSON.stringify(after);
}

// Validate and prepare the ENTIRE change set before executing any write.
// Previously, favourites could be written before a later invalid library
// record caused the actual library save to throw.
export function planLibraryChanges(previous,next,cleanRecord,errorLimit){
  const before=new Map((previous||[]).map(item=>[item.id,item]));
  const after=new Map((next||[]).map(item=>[item.id,item]));
  const changes=[];
  for(const [id,item] of after){
    const clean=cleanRecord(item);
    const old=before.has(id)?cleanRecord(before.get(id)):null;
    if(!old||!sameExceptSavedAt(old,clean))changes.push(['put',id,clean]);
  }
  for(const id of before.keys())if(!after.has(id))changes.push(['delete',id]);
  if(changes.length>400)throw new Error(errorLimit);
  const favoriteChanges=[];
  const remaining=new Map(before);
  for(const item of after.values()){
    const old=remaining.get(item.id);
    if(!!old?.favorite!==!!item.favorite)favoriteChanges.push([item.id,!!item.favorite]);
    remaining.delete(item.id);
  }
  for(const item of remaining.values())if(item.favorite)favoriteChanges.push([item.id,false]);
  return {changes,favoriteChanges};
}

// Doc-change projections are shared by all private diary listeners. Retain
// existing Map insertion order and row identity on metadata-only snapshots.
export function applyDocumentChanges(records,changes){
  const affected=new Set();
  for(const change of changes){
    const id=change.doc.id;
    const previous=records.get(id);
    if(previous?.date)affected.add(previous.date);
    if(change.type==='removed')records.delete(id);
    else{
      const record={...change.doc.data(),id};
      records.set(id,record);
      if(record.date)affected.add(record.date);
    }
  }
  return [...affected];
}

export function partitionDailyTotals(documents){
  const validDay=record=>/^\d{4}-\d{2}-\d{2}$/.test(record.date||'');
  return {
    stepDays:documents.filter(row=>validDay(row)&&Number.isInteger(row.steps)&&
      row.steps>=0&&row.steps<=100000&&row.source==='health_connect'&&
      typeof row.complete==='boolean'),
    noomDays:documents.filter(row=>validDay(row)&&row.noom&&
      typeof row.noom==='object'&&!Array.isArray(row.noom))
  };
}

export function privateWritesPending(state){
  return ['weights','waters','foodEntries','activityDays','stepDays','targets','favorites']
    .some(key=>state[key+'Pending']===true);
}
