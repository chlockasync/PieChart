"""End-to-end FDM editor regression tests with simulated signed-in Firestore.
Requires Python Playwright and Chromium. Never modifies a real library.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
for name in ['nz-concise-2021.js','au-afcd-r3.js','usda-foundation-2026.js',
             'activity-math.js','calorie-budget.js','piechart-shared.js',
             'piechart-entry-flows.js','piechart-fdm-flows.js','piechart-chart-data.js']:
    source=(root/name).read_text().replace('</script','<\\/script')
    html,count=re.subn(r'<script src="'+re.escape(name)+r'\?[^"]+"></script>',
                       lambda m:'<script>'+source+'</script>',html)
    assert count==1,(name,count)
html,count=re.subn(r'<script type="module" src="piechart-db.js\?[^"]+"></script>','',html)
assert count==1
fixture='''<script>(function(){
Object.defineProperty(window.crypto,'randomUUID',{value:(()=>{let n=0;return ()=> 'test-food-id-'+(++n);})()});
const rice={id:'food-rice-12345',type:'Food Item',name:'Brown Rice',approved:true,baseUnit:'g',favorite:true,
 source:'Manual entry',values:{calories:115,energyKj:481,protein:2.3,fats:0.9,carbs:24,fibre:1.8}};
const apple={id:'food-apple-12345',type:'Food Item',name:'Apple',approved:true,baseUnit:'g',favorite:false,
 source:'Manual entry',values:{calories:52,energyKj:218,protein:0.3,fats:0.2,carbs:14,fibre:2.4}};
const dish={id:'dish-existing-123',type:'Dish',name:'Rice Bowl',approved:true,baseUnit:'g',source:'User recipe',favorite:true,
 linked:false,components:[{key:'row-rice',itemId:rice.id,quantity:100,unit:'base'}],
 values:{calories:115,energyKj:481,protein:2.3,fats:0.9,carbs:24,fibre:1.8},totalWeight:100};
const st={mode:'connected',uid:'food-editor-test',initialRemoteFoods:true,foods:[rice,apple,dish],activityLibrary:[],activityLibraryLoaded:true,
 libraryRevision:1,graphRevision:1,favoritesLoaded:true,targetsLoaded:true,targets:{},details:{heightCm:176},
 weights:[],waters:[],foodEntries:[],activityDays:[],stepDays:[],noomDays:[],
 weightsLoaded:true,watersLoaded:true,foodEntriesLoaded:true,activityDaysLoaded:true,stepDaysLoaded:true};
const subscribers=new Set();const notify=()=>{window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:st}));subscribers.forEach(f=>f(st));};
window.__writes={library:[],record:[]};
window.PieChartDB={state:st,subscribe(f){subscribers.add(f);f(st);return()=>subscribers.delete(f);},
 saveFoodChanges(previous,next){window.__writes.library.push({previous,next:structuredClone(next)});st.foods=structuredClone(next);return true;},
 recordFood(date,payload){window.__writes.record.push({date,payload});st.foodEntries.push({...payload,date,id:'serving-1',createdAt:new Date().toISOString()});st.graphRevision++;notify();return 'serving-1';},
 saveFavorite(){},deleteFoodEntry(){},deleteWaterEntry(){},recordWater(){},recordWeight(){}
};
})();</script>'''
html,count=re.subn(r'<script>/\* PieChart v0\.1\.108 — historical data preparation separated from graph drawing',lambda m:fixture+'<script>/* PieChart v0.1.108 — historical data preparation separated from graph drawing',html)
assert count==1,count
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    def setup():
        page=browser.new_page(viewport={'width':390,'height':850});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded',timeout=30000)
        page.evaluate("window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:window.PieChartDB.state}))")
        page.locator('.settings-button:not(.date-button)').first.click()
        page.locator('#settings-food-library').click()
        return page,errors
    def click_result(page,name):
        page.locator('#food-library-search').fill(name)
        page.locator('#food-result-groups .food-result').filter(has=page.locator('.food-result-title',has_text=name)).first.click()
    def open_item(page):
        click_result(page,'Brown Rice')
        assert page.locator('#food-review').is_visible()
    def assert_clean(errors):
        assert not errors,errors
    # A changed shared Food Item opens the exact three existing choices, and
    # choosing Record never changes the shared definition.
    page,errors=setup();open_item(page)
    page.locator('#food-n-protein').dblclick()
    page.locator('#food-n-protein').fill('3.8')
    page.locator('#food-approve').click()
    assert page.locator('.fdm-save-dialog').count()==1
    assert page.locator('.fdm-save-dialog [data-action]').all_text_contents()==[
        'Record serving with these values','Update original Food Item','Save as new Food Item']
    page.locator('.fdm-save-dialog [data-action="record"]').click()
    assert page.locator('#food-record-form').count()==1
    assert not page.evaluate('window.__writes.library')
    page.locator('#food-record-form button[type=submit]').click()
    assert len(page.evaluate('window.__writes.record'))==1
    assert not page.evaluate('window.__writes.library')
    assert_clean(errors);print('PASS Food Item: changed draft -> Record, shared library untouched');page.close()
    # Update original only after the explicit confirmation; same identifier retained.
    page,errors=setup();open_item(page)
    page.locator('#food-n-protein').dblclick();page.locator('#food-n-protein').fill('3.8')
    page.locator('#food-approve').click()
    page.locator('.fdm-save-dialog [data-action="update"]').click()
    writes=page.evaluate('window.__writes')
    assert len(writes['library'])==1,writes
    original=[f for f in writes['library'][0]['next'] if f['id']=='food-rice-12345'][0]
    assert original['values']['protein']==3.8,original
    assert not writes['record']
    assert_clean(errors);print('PASS Food Item: Update original saves same ID without diary record');page.close()
    # Save as new creates a distinct Food Item (no unapproved overwrites).
    page,errors=setup();open_item(page)
    page.locator('#food-n-protein').dblclick();page.locator('#food-n-protein').fill('3.8')
    page.locator('#food-approve').click()
    page.locator('.fdm-save-dialog [data-action="new"]').click()
    assert page.locator('#library-new-name').input_value()=='Brown Rice'
    page.locator('#library-new-name').fill('Brown Rice Variation')
    page.locator('.fdm-save-dialog .fdm-new-submit').click()
    writes=page.evaluate('window.__writes')
    assert len(writes['library'])==1,writes
    names=[f['name'] for f in writes['library'][0]['next']]
    assert 'Brown Rice' in names and 'Brown Rice Variation' in names,names
    assert page.locator('#food-record-form').count()==1
    assert_clean(errors);print('PASS Food Item: Save as new preserves original and offers recording');page.close()
    # Nested recipe: adding a new ingredient opens Food Item review, then Back
    # restores the in-progress recipe's name, ingredient list, and submit handler.
    page,errors=setup()
    page.locator('#food-library-search').fill('Garden Dish')
    page.locator('#food-make-dish').click()
    assert page.locator('#recipe-name').count()==1
    page.locator('#recipe-name').fill('Garden Dish')
    page.locator('#recipe-item-search').fill('Apple')
    page.locator('#recipe-pick-list .food-result').filter(has_text='Apple').first.click()
    assert page.locator('#recipe-lines .recipe-line').count()==1
    page.locator('#recipe-item-search').fill('New Pumpkin')
    page.locator('#recipe-pick-list .food-create-row').first.click()
    assert page.locator('#food-review').is_visible()
    page.locator('#food-back').click()
    assert page.locator('#recipe-name').input_value()=='Garden Dish'
    assert page.locator('#recipe-lines .recipe-line').count()==1
    page.locator('#recipe-save').click()
    assert page.locator('#food-record-form').count()==1
    writes=page.evaluate('window.__writes')
    assert len(writes['library'])==1,writes
    dish=[f for f in writes['library'][0]['next'] if f['name']=='Garden Dish'][0]
    assert dish['type']=='Dish' and len(dish['components'])==1,dish
    assert not writes['record']
    assert_clean(errors);print('PASS Dish: nested ingredient editor Back restores draft and Save records separately');page.close()
    # Recipe variation must remain linked to its parent and must not replace it.
    page,errors=setup();click_result(page,'Rice Bowl')
    assert page.locator('#recipe-name').input_value()=='Rice Bowl'
    page.locator('#recipe-name').fill('Rice Bowl Special')
    page.locator('#recipe-save').click()
    assert page.locator('.fdm-save-dialog').count()==1
    page.locator('.fdm-save-dialog [data-action="new"]').click()
    page.locator('#library-new-name').fill('Rice Bowl Special')
    page.locator('.fdm-save-dialog .fdm-new-submit').click()
    writes=page.evaluate('window.__writes')
    assert len(writes['library'])==1,writes
    recipes=[f for f in writes['library'][0]['next'] if f['type']=='Dish']
    original=next(f for f in recipes if f['id']=='dish-existing-123')
    variant=next(f for f in recipes if f['name']=='Rice Bowl Special')
    assert original['name']=='Rice Bowl' and variant['id']!=original['id']
    assert variant['linked'] and variant['parentId']==original['id'],variant
    assert page.locator('#food-record-form').count()==1
    assert_clean(errors);print('PASS Dish: Save as new variation linked to parent, original intact');page.close()
    # Meal may contain a saved Dish as a whole component.
    page,errors=setup()
    page.locator('#food-library-search').fill('Lunch Platter')
    page.locator('#food-make-meal').click()
    page.locator('#recipe-name').fill('Lunch Platter')
    page.locator('#recipe-item-search').fill('Rice Bowl')
    page.locator('#recipe-pick-list .food-result').filter(has_text='Rice Bowl').first.click()
    assert page.locator('#recipe-lines .recipe-line').count()==1
    page.locator('#recipe-save').click()
    writes=page.evaluate('window.__writes')
    meal=next(f for f in writes['library'][0]['next'] if f['name']=='Lunch Platter')
    assert meal['type']=='Meal' and len(meal['components'])==1,meal
    assert meal['components'][0]['itemId']=='dish-existing-123',meal
    assert meal['components'][0]['unit']=='whole',meal
    assert page.locator('#food-record-form').count()==1
    assert_clean(errors);print('PASS Meal: nested Dish stored as whole component and recording separate');page.close()
    browser.close()
