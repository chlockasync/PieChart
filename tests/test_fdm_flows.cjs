/* Pure Food/Dish/Meal editor contracts: node --test tests/test_fdm_flows.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const {createSaveDecision,createLibraryViews}=require('../piechart-fdm-flows.js');
test('new definition saves without a variation prompt',()=>{
  const gate=createSaveDecision(); let prompts=0,writes=0;
  gate.submit({needsChoice:false,offer:()=>prompts++,commit:()=>{writes++;return true;}});
  assert.equal(prompts,0);assert.equal(writes,1);
});
test('changed Food, Dish, and Meal definitions require exactly one deliberate update choice',()=>{
  for(const kind of ['Food Item','Dish','Meal']){
    const gate=createSaveDecision();let writes=0,dialogCount=0;let approve=null;
    gate.submit({needsChoice:true,offer:c=>{dialogCount++;approve=c;},commit:()=>writes++});
    assert.equal(dialogCount,1,kind);assert.equal(writes,0,kind);
    approve();gate.submit({needsChoice:true,offer:()=>dialogCount++,commit:()=>writes++});
    assert.equal(dialogCount,1,kind);assert.equal(writes,1,kind);
    gate.submit({needsChoice:true,offer:()=>dialogCount++,commit:()=>writes++});
    assert.equal(dialogCount,2,kind);assert.equal(writes,1,kind);
  }
});
test('Record/Save as new choice does not accidentally authorise Update original',()=>{
  const gate=createSaveDecision();let confirmed=0,writes=0;
  gate.submit({needsChoice:true,offer:()=>confirmed++,commit:()=>writes++});
  gate.submit({needsChoice:true,offer:()=>confirmed++,commit:()=>writes++});
  assert.equal(confirmed,2);assert.equal(writes,0);
});
test('nested Food views preserve editable draft and original submit callback',()=>{
  // Lightweight real-DOM shape mock; browser integration checks actual nodes.
  function panel(){return {hidden:false,firstChild:null,ownerDocument:{createDocumentFragment:()=>({children:[],append(node){this.children.push(node);}})},replaceChildren(nodes){this.restored=nodes;},onsubmit:null};}
  const panels={browse:panel(),review:panel(),compose:panel()};
  const heading={textContent:'Food library'},content={scrollTop:19};
  const views=createLibraryViews({panels,heading,scrollContainer:content});
  views.enter('compose','Make a Dish');
  assert.equal(views.current,'compose');assert.equal(views.depth,1);
  const originalSubmit=()=>{};panels.compose.onsubmit=originalSubmit;
  views.enter('review','Food Item');
  assert.equal(views.current,'review');assert.equal(panels.compose.hidden,true);
  views.back();assert.equal(views.current,'compose');assert.equal(panels.compose.onsubmit,originalSubmit);
  views.enter('compose','Make a Meal');
  assert.equal(views.current,'compose');assert.equal(panels.compose.onsubmit,null);
  views.back();assert.equal(panels.compose.onsubmit,originalSubmit);
  views.reset();assert.equal(views.depth,0);assert.equal(views.current,'browse');
  assert.equal(panels.browse.hidden,false);
});
test('invalid Food panel cannot silently overwrite the current draft',()=>{
  const panels=Object.fromEntries(['browse','compose','review'].map(k=>[k,{hidden:false}]));
  const views=createLibraryViews({panels,heading:{textContent:''},scrollContainer:{scrollTop:0}});
  assert.throws(()=>views.enter('other','Invalid'),/Unknown/);
  assert.equal(views.current,'browse');assert.equal(views.depth,0);
});
