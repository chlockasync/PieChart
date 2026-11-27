/* PieChart Food/Dish/Meal editor flow primitives (v0.1.107).
 * Owns nested form navigation and the shared changed-definition save decision.
 * These functions do not read/write Firestore, interpret nutrients, or decide UX.
 */
(function(root){
'use strict';
function createLibraryViews({panels,heading,scrollContainer}){
  if(!panels?.browse||!panels?.review||!panels?.compose||!heading||!scrollContainer)
    throw new Error('Food editor navigation requires all three panels and a heading.');
  const history=[];
  let current='browse';
  function show(which){
    if(!Object.hasOwn(panels,which))throw new Error('Unknown Food Library panel.');
    for(const [key,panel] of Object.entries(panels))panel.hidden=key!==which;
    current=which;
  }
  return Object.freeze({
    get current(){return current;},
    get depth(){return history.length;},
    enter(which,title){
      if(!Object.hasOwn(panels,which))throw new Error('Unknown Food Library panel.');
      const panel=panels[current];
      const previous={view:current,title:heading.textContent,scroll:scrollContainer.scrollTop};
      if(current===which&&(which==='review'||which==='compose')){
        // Nested editing uses the same form element. Preserve the entire live
        // draft including handlers and submit callback until Back restores it.
        previous.nodes=panel.ownerDocument.createDocumentFragment();
        while(panel.firstChild)previous.nodes.append(panel.firstChild);
        previous.submit=panel.onsubmit;
        panel.onsubmit=null;
      }
      history.push(previous);
      show(which);heading.textContent=title;scrollContainer.scrollTop=0;
    },
    back(){
      if(!history.length)return false;
      const previous=history.pop();
      show(previous.view);
      if(previous.nodes){
        panels[previous.view].replaceChildren(previous.nodes);
        panels[previous.view].onsubmit=previous.submit;
      }
      heading.textContent=previous.title;scrollContainer.scrollTop=previous.scroll;
      return true;
    },
    reset(){
      history.length=0;
      show('browse');
    }
  });
}
function createSaveDecision(){
  let approvedUpdate=false;
  return Object.freeze({
    submit({needsChoice,offer,commit}){
      if(typeof offer!=='function'||typeof commit!=='function')
        throw new Error('FDM Save requires decision and commit handlers.');
      if(needsChoice&&!approvedUpdate){
        offer(()=>{approvedUpdate=true;});
        return false;
      }
      approvedUpdate=false;
      return commit();
    }
  });
}
const api=Object.freeze({createLibraryViews,createSaveDecision});
root.PieChartFdmFlows=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
