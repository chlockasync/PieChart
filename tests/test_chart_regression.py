"""Frozen, signed-in chart regression against unchanged v0.1.108 graph results.
Uses a deterministic clock, simulated Firebase, and Chromium. This protects
Noom gaps, independently imported fields, chart rendering, and incremental
source updates; it does not test live Firestore or phone display hardware.
Run: python tests/test_chart_regression.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,hashlib,sys
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
sources=['nz-concise-2021.js','au-afcd-r3.js','usda-foundation-2026.js',
         'activity-math.js','calorie-budget.js','piechart-shared.js',
         'piechart-entry-flows.js','piechart-fdm-flows.js']
if 'piechart-chart-data.js' in html:sources.append('piechart-chart-data.js')
for name in sources:
    source=(root/name).read_text().replace('</script','<\\/script')
    html,count=re.subn(r'<script src="'+re.escape(name)+r'\?[^\"]+\"></script>',lambda m:'<script>'+source+'</script>',html)
    assert count==1,(name,count)
html,count=re.subn(r'<script type="module" src="piechart-db.js\?[^\"]+\"></script>','',html)
assert count==1
fixture='''<script>
(function(){
const today='2026-11-27';
const st={mode:'connected',uid:'chart-test-account',displayName:'Chart Test',initialRemoteFoods:true,
 foods:[],activityLibrary:[],activityLibraryLoaded:true,libraryRevision:1,graphRevision:1,
 graphChange:{all:true},favorites:{foods:{},activities:{}},favoritesLoaded:true,
 targetsLoaded:true,targets:{weight:67.5,steps:8400,water:2.1,protein:75,fibre:24,goalIntensity:'moderate'},
 details:{dateOfBirth:'1981-03-15',heightCm:175,sex:'male'},
 weights:[{id:'w1',date:'2026-11-14',kg:68.2,createdAt:'2026-11-14T08:00:00Z'},
          {id:'w2',date:'2026-11-21',kg:67.8,createdAt:'2026-11-21T08:00:00Z'},
          {id:'w3',date:today,kg:67.7,createdAt:'2026-11-27T08:00:00Z'}],
 waters:[{id:'wday',date:today,ml:350},{id:'whist',date:'2026-11-20',ml:300}],
 foodEntries:[{id:'fe1',date:'2026-11-24',nutrition:{calories:380,protein:15,fats:9,carbs:60,fibre:4},waterMl:40},
   {id:'fe2',date:today,nutrition:{calories:470,protein:34,fats:14,carbs:53,fibre:7},waterMl:220}],
 activityDays:[{id:'a1',date:'2026-11-21',name:'Walk',type:'Walking',minutes:45,netKcalPerKg:1.2,mets:3,
   stepOrigin:'manual',stepRelation:'additional',stepsIncluded:700}],
 stepDays:[{date:'2026-11-19',steps:7850,complete:true,source:'health-connect'},
   {date:'2026-11-21',steps:6020,complete:true,source:'health-connect'},
   {date:today,steps:1920,complete:false,source:'health-connect'}],
 noomDays:[
   {date:'2026-11-18',noom:{calories:1600,protein:72,fats:70,waterMl:1650,steps:4500,calorieBudgetKcal:1850}},
   {date:'2026-11-19',noom:{calories:1750,protein:76,fibre:27,calorieBudgetLowKcal:1740,calorieBudgetHighKcal:1920}},
   {date:'2026-11-20',noom:{calories:1640,fats:63,carbs:178,waterMl:900,calorieBudgetLowKcal:1700,calorieBudgetHighKcal:1900}},
   {date:'2026-11-22',noom:{calories:1710,calorieBudgetKcal:1880}},
   {date:'2026-11-24',noom:{calories:1800,protein:75,fibre:20,calorieBudgetLowKcal:1600,calorieBudgetHighKcal:2050}},
   {date:'2026-11-25',noom:{calories:1900,protein:78,fibre:22,calorieBudgetKcal:2000}}
 ],
 weightsLoaded:true,watersLoaded:true,foodEntriesLoaded:true,activityDaysLoaded:true,stepDaysLoaded:true,targetsLoaded:true};
 const subs=new Set();
 const notify=()=>{window.dispatchEvent(new CustomEvent('piechart-db-state',{detail:st}));subs.forEach(fn=>fn(st));};
 window.PieChartDB={state:st,subscribe(fn){subs.add(fn);fn(st);return()=>subs.delete(fn)},
   recordFood(){},recordWater(){},recordWeight(){},saveActivity(){},deleteActivity(){},saveFoodChanges(){}};
 window.testState=st;window.chartNotify=notify;
})();
</script>'''
html,count=re.subn(r'<script>/\* PieChart v0\.1\.10[789] — historical data preparation separated from graph drawing',lambda m:fixture+m.group(0),html)
assert count==1,count
fixed_clock='''
(()=>{const OriginalDate=Date,instant=new OriginalDate('2026-11-26T21:10:00.000Z');
 function FixedDate(...args){return new OriginalDate(...(args.length?args:[instant.getTime()]));}
 FixedDate.now=()=>instant.getTime();FixedDate.parse=OriginalDate.parse;FixedDate.UTC=OriginalDate.UTC;
 FixedDate.prototype=OriginalDate.prototype;globalThis.Date=FixedDate;
})();'''

def run(page):
    observations=[]
    def snapshot(label):
        page.wait_for_timeout(140)
        output=page.evaluate('''() => ({
            svg:document.getElementById('chart').outerHTML,
            readouts:Object.fromEntries(['weight','steps','water','calories','protein','fibre','fats','carbs'].map(k=>[k,[
                document.getElementById(k+'-reading')?.textContent,
                document.getElementById(k+'-percent')?.textContent,
                document.getElementById(k+'-target')?.textContent,
                document.querySelector('.metric[data-key="'+k+'"]')?.style.getPropertyValue('--ratio')]])),
            date:document.getElementById('axis-yesterday')?.textContent,
            bands:document.querySelectorAll('[data-series]').length,
            marks:document.querySelectorAll('.day-mark').length
        })''')
        svg=output.pop('svg')
        output['svg_sha256']=hashlib.sha256(svg.encode()).hexdigest()
        output['svg_bytes']=len(svg)
        output['label']=label
        observations.append(output)
    page.evaluate('window.chartNotify()');snapshot('initial')
    updates=[
     ("added food to noom day",'''s.foodEntries.push({id:'f3',date:'2026-11-19',nutrition:{calories:90,fibre:3,protein:5},waterMl:60});''','foodEntries',['2026-11-19']),
     ("added weight near envelope",'''s.weights.push({id:'w4',date:'2026-11-20',kg:67.6,createdAt:'2026-11-20T08:00:00Z'});''','weightEntries',['2026-11-20']),
     ("added water",'''s.waters.push({id:'w3',date:'2026-11-24',ml:210});''','waterEntries',['2026-11-24']),
     ("changed noom archive",'''s.noomDays.find(d=>d.date==='2026-11-24').noom.calories=1835;''','dailyTotals',['2026-11-24']),
     ("added activity",'''s.activityDays.push({id:'a2',date:'2026-11-26',name:'Walk',type:'Walking',minutes:30,mets:3,netKcalPerKg:1.1,stepOrigin:'none',stepRelation:'included',stepsIncluded:0});''','exerciseEntries',['2026-11-26']),
     ("changed today food",'''s.foodEntries.push({id:'f4',date:'2026-11-27',nutrition:{calories:100,protein:8,carbs:15,fibre:2,fats:1},waterMl:0});''','foodEntries',['2026-11-27']),
    ]
    for label,mutation,kind,dates in updates:
        page.evaluate('''([mutation,kind,dates])=>{const s=window.testState;new Function('s',mutation)(s);s.graphRevision++;s.graphChange={kind,dates};window.chartNotify();}''',[mutation,kind,dates])
        snapshot(label)
    # Verify a source-free notification never triggers a changed daily graph.
    snapshot('unchanged state')
    page.evaluate('''()=>{const s=window.testState;s.uid='';s.mode='signed-out';s.graphRevision++;window.chartNotify();}''')
    snapshot('signed out')
    return observations

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':850},timezone_id='Pacific/Auckland')
    page.add_init_script(fixed_clock)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html,wait_until='domcontentloaded')
    observations=run(page)
    assert errors==[],errors
    fixture_path=root/'tests'/'fixtures'/'chart_v107_golden.json'
    if '--write-golden' in sys.argv:
        fixture_path.parent.mkdir(parents=True,exist_ok=True)
        fixture_path.write_text(json.dumps(observations,indent=2)+'\n')
        print('Wrote golden',fixture_path)
    else:
        expected=json.loads(fixture_path.read_text())
        assert observations==expected, '\n'.join(f"{a['label']}: {a['svg_sha256']} expected {b['svg_sha256']}" for a,b in zip(observations,expected) if a!=b)
        print('PASS: Exact chart SVG and readings match v0.1.108 across',len(observations),'states')
    browser.close()
