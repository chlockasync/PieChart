"""Actual DOM tests for Activity definition -> separate Record -> diary.
Requires Playwright and Chromium; storage calls are simulated.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
for name in ['nz-concise-2021.js','au-afcd-r3.js','usda-foundation-2026.js',
             'activity-math.js','calorie-budget.js','piechart-shared.js','piechart-entry-flows.js','piechart-fdm-flows.js','piechart-chart-data.js']:
    source=(root/name).read_text().replace('</script','<\\/script')
    html,count=re.subn(r'<script src="'+re.escape(name)+r'\?[^\"]+"></script>',
                        lambda m:'<script>'+source+'</script>',html)
    assert count==1,(name,count)
html,count=re.subn(r'<script type="module" src="piechart-db.js\?[^\"]+"></script>','',html)
assert count==1
stub='''<script>(function(){
Object.defineProperty(window.crypto,'randomUUID',{value:()=> 'activity-test-123456'});
const st={mode:'connected',uid:'test-user',initialRemoteFoods:true,foods:[],activityLibrary:[],
 activityLibraryLoaded:true,libraryRevision:1,graphRevision:1,favoritesLoaded:true,
 favorites:{foods:{},activities:{}},targetsLoaded:true,targets:{},details:{heightCm:176},
 weights:[],waters:[],foodEntries:[],activityDays:[],stepDays:[],noomDays:[],
 weightsLoaded:true,watersLoaded:true,foodEntriesLoaded:true,activityDaysLoaded:true,stepDaysLoaded:true};
let serial=0;const subs=new Set();const notify=()=>{window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:st}));subs.forEach(fn=>fn(st));};
window.__calls={library:[],record:[]};window.PieChartDB={state:st,
 subscribe(fn){subs.add(fn);fn(st);return()=>subs.delete(fn);},
 saveActivityLibraryChanges(previous,next){window.__calls.library.push({previous,next});
 st.activityLibrary=next;st.libraryRevision++;notify();return true;},
 saveActivity(payload,id){window.__calls.record.push({payload,id});const record={...payload,id:id||'record-'+(++serial),
 createdAt:'2026-11-27T09:00:00'};st.activityDays.push(record);st.graphRevision++;notify();return record.id;},
 saveFavorite(){throw Error('Favourite should be written by shared library save');},deleteActivity(){}}
})();</script>'''
html,count=re.subn(r'<script>/\* PieChart v0\.1\.108 — historical data preparation separated from graph drawing',lambda m:stub+'<script>/* PieChart v0.1.108 — historical data preparation separated from graph drawing',html)
assert count==1
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':850});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded',timeout=30000)
    page.evaluate("window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:window.PieChartDB.state}))")
    # Start from Today. Creating a library item must NOT record anything by itself.
    page.locator('.metric[data-key="steps"]').dblclick()
    page.locator('#activity-search').fill('New Garden Walk')
    page.get_by_text('+ Add new activity').click()
    assert page.locator('#activity-date').count()==0
    page.locator('#activity-minutes').dblclick()
    page.locator('#activity-minutes').fill('0.5')
    page.locator('#activity-favourite').check()
    page.locator('#activity-library-save').click()
    assert page.evaluate('window.__calls.library.length')==1
    assert page.evaluate('window.__calls.record.length')==0
    assert page.locator('#activity-date').count()==1
    assert page.locator('#activity-minutes').input_value()=='0.5'
    # Cancel recording: the definition remains in the private user's favourites,
    # but no diary record was added.
    page.locator('#activity-editor-back').click()
    assert page.evaluate('window.__calls.record.length')==0
    page.locator('#activity-search').fill('')
    page.locator('#entry-heading').click()
    assert 'New Garden Walk' in page.locator('#activity-favourites-results').inner_text()
    # Select the favourite and explicitly Record: one private recording only.
    page.locator('#activity-favourites-results .activity-library-result').first.click()
    assert page.locator('#activity-library-save').inner_text()=='Record'
    page.locator('#activity-library-save').click()
    assert page.evaluate('window.__calls.record.length')==1
    assert page.evaluate('window.__calls.library.length')==1
    assert 'New Garden Walk' in page.locator('#activity-today-records').inner_text()
    assert not errors,errors
    print('PASS Today create -> shared library favourite -> Cancel record -> favourite -> private Record')
    browser.close()
