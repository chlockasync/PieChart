from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
assets=root
for name in ['nz-concise-2021.js','au-afcd-r3.js','usda-foundation-2026.js','activity-math.js','calorie-budget.js','piechart-shared.js','piechart-entry-flows.js']:
    js=(assets/name).read_text().replace('</script','<\\/script')
    html,n=re.subn(r'<script src="'+re.escape(name)+r'\?[^\"]+"></script>',lambda m:'<script>'+js+'</script>',html)
    assert n==1,(name,n)
html,n=re.subn(r'<script type="module" src="piechart-db.js\?[^\"]+"></script>','',html)
assert n==1,n
stub='''<script>
(function(){
const today=window.PieChartShared.localDay();
const item={id:'a1234567890',name:'Evening Walk',type:'Walking',minutes:30,distanceKm:null,steps:null,intensity:'moderate',favorite:true};
const st={mode:'connected',uid:'my-account',displayName:'Test',initialRemoteFoods:true,
foods:[],activityLibrary:[item],activityLibraryLoaded:true,libraryRevision:1,graphRevision:1,
favorites:{foods:{},activities:{a1234567890:true}},favoritesLoaded:true,targetsLoaded:true,targets:{},details:{heightCm:176},
weights:[],waters:[],foodEntries:[],activityDays:[],stepDays:[],noomDays:[],
weightsLoaded:true,watersLoaded:true,foodEntriesLoaded:true,activityDaysLoaded:true,stepDaysLoaded:true};
const subs=new Set(); const notify=()=>{window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:st}));subs.forEach(fn=>fn(st));};
window.__calls={library:[],record:[],savedAt:[]};
window.PieChartDB={state:st,subscribe(f){subs.add(f);f(st);return()=>subs.delete(f)},
saveActivityLibraryChanges(previous,next){window.__calls.library.push({previous,next});st.activityLibrary=next;st.libraryRevision++;notify();},
saveActivity(a,id){window.__calls.record.push({a,id});if(id){const i=st.activityDays.findIndex(x=>x.id===id);if(i<0)throw new Error('Unknown record id');st.activityDays[i]={...st.activityDays[i],...a,id};}else{st.activityDays.push({...a,id:'new-record',createdAt:new Date().toISOString()});}st.graphRevision++;notify();return id||'new-record';},
saveFavorite(){throw Error('Unexpected favourite change')},deleteActivity(){}
};
})();
</script>'''
html,n=re.subn(r'<script>/\* PieChart v0\.1\.106',lambda m:stub+'<script>/* PieChart v0.1.106',html)
assert n==1,n
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    def setup():
        page=browser.new_page(viewport={'width':390,'height':850});errs=[]
        page.on('pageerror',lambda e:errs.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded',timeout=30000)
        page.wait_for_timeout(100)
        page.evaluate("window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:window.PieChartDB.state}))")
        return page,errs
    def today(page):
        page.locator('.metric[data-key="steps"]').dblclick()
        assert page.locator('#activity-search').count()==1
    def assert_record_form(page):
        assert page.locator('#entry-heading').inner_text().startswith('Record activity'),page.locator('#entry-heading').inner_text()
        assert page.locator('#activity-date').count()==1
        assert page.locator('#activity-library-delete').count()==0
        assert page.locator('#activity-favourite').count()==0
        assert page.locator('#activity-library-save').inner_text()=='Record'
        assert page.locator('#activity-minutes').input_value()=='30'
    # 1: tapping personal favourite from Today opens Record, writes private record only.
    page,errs=setup();today(page)
    fav=page.locator('#activity-favourites-results .activity-library-result')
    assert fav.count()==1,fav.count()
    fav.click();assert_record_form(page)
    page.locator('#activity-minutes').dblclick();page.locator('#activity-minutes').fill('38')
    page.locator('#activity-library-save').click()
    calls=page.evaluate('window.__calls')
    assert len(calls['record'])==1,calls
    assert calls['record'][0]['id'] is None,calls
    assert calls['record'][0]['a']['minutes']==38,calls
    assert calls['record'][0]['a']['libraryId']=='a1234567890',calls
    assert len(calls['library'])==0,calls
    assert page.locator('#activity-today-records').count()==1
    assert 'Evening Walk' in page.locator('#activity-today-records').inner_text()
    assert not errs,errs
    print('PASS Today favourite -> Record -> private diary; shared library unchanged')
    page.close()
    # 2: tapping search result from Today also records.
    page,errs=setup();today(page)
    page.locator('#activity-search').fill('Evening')
    page.locator('#activity-results .activity-library-result').first.click()
    assert_record_form(page)
    page.locator('#activity-library-save').click()
    calls=page.evaluate('window.__calls')
    assert len(calls['record'])==1 and len(calls['library'])==0,calls
    assert not errs,errs
    print('PASS Today search result -> Record -> private diary')
    page.close()
    # 3: editing recorded entry still routes into private editor only.
    page,errs=setup();page.evaluate('''()=>{const st=window.PieChartDB.state;st.activityDays.push({id:'old-record',libraryId:'a1234567890',name:'Evening Walk',type:'Walking',date:window.PieChartShared.localDay(),minutes:21,distanceKm:null,stepsCount:null,stepOrigin:'none',stepRelation:'none',stepIncluded:0,intensity:'moderate',mets:3,netKcalPerKg:1,createdAt:new Date().toISOString()});st.graphRevision++;window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:st}));}''')
    today(page);page.locator('#activity-today-records .food-diary-row').first.click()
    assert page.locator('#entry-heading').inner_text()=='Edit recorded activity'
    assert page.locator('#activity-minutes').input_value()=='21'
    assert page.locator('#activity-library-delete').count()==0
    page.locator('#activity-library-save').click()
    calls=page.evaluate('window.__calls')
    assert len(calls['record'])==1 and calls['record'][0]['id']=='old-record' and not calls['library'],calls
    assert not errs,errs
    print('PASS Recorded diary row -> Edit recorded private activity (same id)')
    page.close()
    # 4: standalone library browsing edits definition, not a private recording.
    page,errs=setup()
    page.locator('.settings-button:not(.date-button)').first.click()
    page.locator('#settings-activity-library').click()
    page.locator('#activity-results .activity-library-result').first.click()
    assert page.locator('#activity-date').count()==0
    assert page.locator('#activity-favourite').count()==1
    assert page.locator('#activity-library-delete').count()==1
    assert page.locator('#activity-library-save').inner_text()=='Save changes'
    assert page.locator('#activity-record-top').count()==1
    assert not errs,errs
    print('PASS Settings Activity library -> shared definition editor')
    page.close()
    # 5: clicking Cancel on favourite recording returns to Today without saving.
    page,errs=setup();today(page)
    page.locator('#activity-favourites-results .activity-library-result').first.click()
    page.locator('#activity-editor-back').click()
    assert page.locator('#activity-today-records').count()==1
    assert page.evaluate('window.__calls.record')==[]
    assert not errs,errs
    print('PASS Cancel record -> Today without writing')
    browser.close()
