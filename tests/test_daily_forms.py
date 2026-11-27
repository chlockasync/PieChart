"""Cross-domain browser smoke tests. Requires Playwright and Chromium.
Run: python tests/test_daily_forms.py
Firestore is simulated; this does not test live permissions or phone input.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
for name in ('nz-concise-2021.js','au-afcd-r3.js','usda-foundation-2026.js',
             'activity-math.js','calorie-budget.js','piechart-shared.js','piechart-entry-flows.js'):
    source=(root/name).read_text().replace('</script','<\\/script')
    html,count=re.subn(r'<script src="'+re.escape(name)+r'\?[^\"]+"></script>',lambda m:'<script>'+source+'</script>',html)
    assert count==1,(name,count)
html,count=re.subn(r'<script type="module" src="piechart-db.js\?[^\"]+"></script>','',html)
assert count==1
fixture='''<script>
(function(){
const food={id:'food-abcdef123456',type:'Food Item',name:'Brown Rice',approved:true,baseUnit:'g',favorite:true,
 values:{calories:115,energyKj:481,protein:2.3,fats:0.9,carbs:24,fibre:1.8}};
const water={id:'water-abcdef12345',type:'Food Item',name:'Water',approved:true,baseUnit:'mL',favorite:false,
 countsTowardsWater:true,waterPercent:100,values:{calories:0,energyKj:0,protein:0,fats:0,carbs:0,fibre:0}};
const today=window.PieChartShared.localDay();
const st={mode:'connected',uid:'test-user',initialRemoteFoods:true,foods:[food,water],activityLibrary:[],activityLibraryLoaded:true,
 libraryRevision:1,graphRevision:1,favoritesLoaded:true,targetsLoaded:true,targets:{},details:{heightCm:176},
 weights:[],waters:[],foodEntries:[],activityDays:[],stepDays:[],noomDays:[],
 weightsLoaded:true,watersLoaded:true,foodEntriesLoaded:true,activityDaysLoaded:true,stepDaysLoaded:true};
const subscribers=new Set(); const notify=()=>{st.graphRevision++;
 window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:st}));subscribers.forEach(fn=>fn(st));};
window.__writes={food:[],water:[],weight:[]};
window.PieChartDB={state:st,subscribe(fn){subscribers.add(fn);fn(st);return()=>subscribers.delete(fn)},
 recordFood(date,payload){window.__writes.food.push({date,payload});st.foodEntries.push({...payload,id:'record-food',date,
 createdAt:new Date().toISOString()});notify();return 'record-food';},
 recordWater(date,ml,item){window.__writes.water.push({date,ml,item:item.id});return 'record-water';},
 recordWeight(date,kg){window.__writes.weight.push({date,kg});return 'record-weight';},
 deleteFoodEntry(){},deleteWaterEntry(){},deleteWeight(){},saveFavorite(){},saveFoodChanges(){return true;}};
})();
</script>'''
html,count=re.subn(r'<script>/\* PieChart v0\.1\.106',lambda m:fixture+'<script>/* PieChart v0.1.106',html)
assert count==1
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':850});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded',timeout=30000)
    page.evaluate("window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:window.PieChartDB.state}))")
    def open_metric(name):
        page.locator(f'.metric[data-key="{name}"]').dblclick()
        assert not page.locator('#entry-backdrop').is_hidden()
    # Food entry, backwards navigation, and diary restoration.
    open_metric('calories')
    assert page.locator('#food-library-search').count()==1
    assert page.locator('#diary-records').count()==1
    page.locator('#diary-favourites-results .food-result').first.click()
    assert page.locator('#food-review').is_visible()
    page.locator('#entry-close').click()
    assert page.locator('#food-library-search').is_visible()
    page.locator('#diary-favourites-results .food-result').first.click()
    page.locator('#food-record-serving').click()
    assert page.locator('#food-record-form').count()==1
    page.locator('#food-record-form button[type=submit]').click()
    assert page.evaluate('window.__writes.food.length')==1
    assert 'Brown Rice' in page.locator('#diary-records').inner_text()
    page.locator('#entry-close').click()
    assert page.locator('#entry-backdrop').is_hidden()
    print('PASS Food: Today -> favourite -> review -> Back -> record serving -> private diary')
    # Water shortcut retains shared dialog lifecycle, not affected by Activity routing.
    open_metric('water')
    assert page.locator('#water-recents').count()==1
    page.locator('#water-recents button').first.click()
    assert page.evaluate('window.__writes.water.length')==1
    assert page.locator('#entry-backdrop').is_hidden()
    print('PASS Water: Today -> quick amount -> private recording')
    # Weight entry with cancel should not record or leave stale screen history.
    open_metric('weight')
    assert page.locator('#weight-form').count()==1
    page.locator('#weight-cancel').click()
    assert page.evaluate('window.__writes.weight.length')==0
    assert page.locator('#entry-backdrop').is_hidden()
    print('PASS Weight: form -> Cancel without recording')
    assert errors==[],errors
    print('PASS no JavaScript page errors')
    browser.close()
