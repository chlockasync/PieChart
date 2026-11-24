/* PieChart fibre group estimator, v1. Category-based reference matching only:
   NO calorie, carbohydrate, fat, or protein similarity scores.
   AFCD uses the official AUSNUT 2023 classification codes and the NZ FOODfiles
   descriptors identify food types and processing. These curated crosswalk labels
   are PieChart annotations, NOT claims to be official food-group names.
   Source nutrient values are never changed; calculated estimates are separate.
   NZ: https://foodcomposition.co.nz/terms/
   AU: https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd
*/
(function(global){'use strict';
  // Specific food types, rather than broad food groups, are the unit of comparison.
  // Earlier entries are more specific when phrases overlap (e.g. coconut milk vs milk).
  // [key, label, parent, distinctive name phrases, approximate fibre-relevance priority]
  const TYPES=[
    ['coconut_drink','Coconut milk drink','Plant-based drinks','coconut milk drink|coconut drink|coconut beverage|drink coconut milk|coconut milk ready to drink'],
    ['coconut_cream','Coconut cream','Coconut products','coconut cream|cream coconut'],
    ['coconut_milk','Coconut milk for cooking','Coconut products','coconut milk|milk coconut'],
    ['coconut_water','Coconut water','Coconut products','coconut water|water coconut'],
    ['coconut_flesh','Coconut flesh','Fruit and nuts','coconut flesh|coconut meat|desiccated coconut|shredded coconut|coconut dried|coconut fresh|coconut'],
    ['almond_drink','Almond milk drink','Plant-based drinks','almond milk|almond drink|almond beverage'],
    ['oat_drink','Oat milk drink','Plant-based drinks','oat milk|oat drink|oat beverage'],
    ['soy_drink','Soy milk drink','Plant-based drinks','soy milk|soya milk|soy drink|soya drink'],
    ['rice_drink','Rice milk drink','Plant-based drinks','rice milk|rice drink|rice beverage'],
    ['other_plant_drink','Other plant-based milk drink','Plant-based drinks','plant based milk|plant milk|nut milk'],
    ['cordial','Cordials and concentrates','Beverages','cordial|squash drink'],
    ['fruit_drink','Fruit drinks','Beverages','fruit drink|juice drink|fruit beverage'],
    ['fruit_juice_concentrate','Fruit juice concentrate','Beverages','juice concentrate|concentrated juice'],
    ['apple_juice','Apple juice','Fruit juices','apple juice|juice apple'],
    ['orange_juice','Orange juice','Fruit juices','orange juice|juice orange'],
    ['grape_juice','Grape juice','Fruit juices','grape juice|juice grape'],
    ['pineapple_juice','Pineapple juice','Fruit juices','pineapple juice|juice pineapple'],
    ['lemon_lime_juice','Lemon and lime juice','Fruit juices','lemon juice|lime juice|juice lemon|juice lime'],
    ['fruit_juice','Fruit juice','Beverages','fruit juice|apple juice|orange juice|grape juice|pineapple juice|lemon juice|lime juice|grapefruit juice|berry juice|nectar juice'],
    ['vegetable_juice','Vegetable juice','Beverages','vegetable juice|carrot juice|tomato juice|beetroot juice'],
    ['fruit_smoothie','Fruit smoothie','Beverages','fruit smoothie|smoothie'],
    ['coconut_yoghurt','Coconut yoghurt','Yoghurts','coconut yoghurt|coconut yogurt'],
    ['almond_yoghurt','Almond yoghurt','Yoghurts','almond yoghurt|almond yogurt|yoghurt almond|yogurt almond'],
    ['soy_yoghurt','Soy yoghurt','Yoghurts','soy yoghurt|soy yogurt'],
    ['dairy_yoghurt','Dairy yoghurt','Yoghurts','yoghurt|yogurt'],
    ['butter_nut','Nut butter','Nuts and seeds','peanut butter|almond butter|cashew butter|nut butter'],
    ['butter_dairy','Dairy butter','Dairy fats','butter'],
    ['sour_cream','Sour cream','Dairy and alternatives','sour cream'],
    ['ice_cream','Ice cream','Dairy and alternatives','ice cream|icecream|gelato'],
    ['dairy_cheese','Cheese','Dairy and alternatives','cheese'],
    ['dairy_cream','Dairy cream','Dairy and alternatives','fresh cream|thickened cream|whipping cream|double cream|cream dairy'],
    ['dairy_milk','Animal milk','Dairy and alternatives','cow milk|dairy milk|whole milk|skim milk|milk cow|milk goat|milk sheep|milk'],
    ['chickpea_flour','Chickpea flour','Flours','chickpea flour|besan|gram flour'],
    ['wheat_bran','Wheat bran','Bran and husks','wheat bran|bran wheat'],
    ['oat_bran','Oat bran','Bran and husks','oat bran|bran oat'],
    ['psyllium','Psyllium husk','Bran and husks','psyllium husk|psyllium'],
    ['cereal_bran','Other bran','Bran and husks','bran cereal|bran'],
    ['wheat_flour','Wheat flour','Flours','wheat flour|flour wheat|plain flour|self raising flour|self rising flour|strong flour'],
    ['rice_flour','Rice flour','Flours','rice flour|flour rice'],
    ['corn_flour','Corn flour','Flours','cornmeal|corn flour|maize flour|maize meal|polenta'],
    ['almond_flour','Almond flour','Flours','almond flour|almond meal'],
    ['other_flour','Other flour','Flours','flour'],
    ['rye_bread','Rye bread','Bread','rye bread|bread rye'],
    ['bagel','Bagels','Bread','bagel'],
    ['flatbread','Flatbreads and wraps','Bread','tortilla|flatbread|pita bread|pitta bread|chapati|naan bread|wrap bread'],
    ['bread','Bread','Bread','bread|bread roll|toast|loaf'],
    ['cracker','Crackers and crispbread','Biscuits and crackers','cracker|crispbread|rice cake|corn cake|ryvita'],
    ['cookie','Sweet biscuits and cookies','Biscuits and crackers','cookie|biscuit|shortbread'],
    ['cake','Cake and cupcakes','Cakes and pastries','cupcake|sponge cake|fruit cake|carrot cake|cake'],
    ['muffin','Muffins','Cakes and pastries','muffin'],
    ['pastry','Pastry','Cakes and pastries','croissant|pastry|danish pastry|puff pastry|shortcrust'],
    ['breakfast_cereal','Breakfast cereals','Cereals','breakfast cereal|corn flakes|cornflakes|wheat biscuits|wheat bix|weet bix|rice bubbles|cereal flakes'],
    ['muesli','Muesli and granola','Cereals','muesli|granola'],
    ['porridge','Porridge','Cereals','porridge|oatmeal'],
    ['oats','Oats','Grains','rolled oats|steel cut oats|oat flakes|oats|oat'],
    ['rice','Rice','Grains','brown rice|white rice|wild rice|basmati rice|jasmine rice|rice'],
    ['quinoa','Quinoa','Grains','quinoa'],
    ['barley','Barley','Grains','barley'],
    ['wheat_grain','Wheat grains','Grains','bulgur|bulghur|wheat grain|wheat berry|freekeh'],
    ['couscous','Couscous','Grains','couscous'],
    ['buckwheat','Buckwheat','Grains','buckwheat'],
    ['millet','Millet','Grains','millet'],
    ['pasta','Pasta and noodles','Pasta','pasta|spaghetti|macaroni|fusilli|penne|noodle|vermicelli'],
    ['popcorn','Popcorn','Snacks','popcorn'],
    ['potato_crisps','Potato crisps and chips','Snacks','potato chip|potato crisp|potato fry|potato fries|french fries|hot chip'],
    ['corn_crisps','Corn snacks','Snacks','corn chip|tortilla chip|corn crisp'],
    ['cereal_bar','Cereal and muesli bars','Snack bars','cereal bar|muesli bar|bar muesli|granola bar|oat bar|bar cereal'],
    ['protein_bar','Protein bars','Snack bars','protein bar'],
    ['nut_bar','Nut and seed bars','Snack bars','nut bar|seed bar'],
    ['chocolate','Chocolate','Confectionery','chocolate|cocoa'],
    ['jam','Jams and preserves','Sweet spreads','jam|marmalade|fruit preserve'],
    ['sugar','Sugar and syrups','Sweeteners','sugar|honey|golden syrup|maple syrup|glucose syrup'],
    ['oil','Oils','Oils and fats','olive oil|canola oil|sunflower oil|vegetable oil|coconut oil|oil'],
    ['carrot','Carrots','Root vegetables','carrot'],
    ['beetroot','Beetroot','Root vegetables','beetroot|beet root|beet'],
    ['parsnip','Parsnips','Root vegetables','parsnip'],
    ['turnip','Turnips','Root vegetables','turnip'],
    ['swede','Swedes','Root vegetables','swede|rutabaga'],
    ['radish','Radishes','Root vegetables','radish'],
    ['kumara','Kūmara and sweet potatoes','Root vegetables','kumara|sweet potato'],
    ['potato','Potatoes','Root vegetables','potato'],
    ['broccoli','Broccoli','Brassicas','broccoli'],
    ['cauliflower','Cauliflower','Brassicas','cauliflower'],
    ['cabbage','Cabbage','Brassicas','cabbage|coleslaw'],
    ['brussels_sprout','Brussels sprouts','Brassicas','brussels sprout|brussel sprout'],
    ['kale','Kale','Leafy vegetables','kale'],
    ['spinach','Spinach','Leafy vegetables','spinach'],
    ['lettuce','Lettuce','Leafy vegetables','lettuce'],
    ['silverbeet','Silverbeet and chard','Leafy vegetables','silverbeet|swiss chard|chard'],
    ['watercress','Watercress','Leafy vegetables','watercress'],
    ['asparagus','Asparagus','Vegetables','asparagus'],
    ['zucchini','Courgettes and zucchini','Vegetables','courgette|zucchini'],
    ['pumpkin','Pumpkins and squash','Vegetables','pumpkin|butternut squash|squash'],
    ['cucumber','Cucumbers','Vegetables','cucumber'],
    ['capsicum','Capsicum','Vegetables','capsicum|bell pepper|sweet pepper'],
    ['chilli','Chillies','Vegetables','chilli pepper|chili pepper|chilli|chili'],
    ['tomato','Tomatoes','Vegetables','tomato'],
    ['mushroom','Mushrooms','Fungi','mushroom'],
    ['eggplant','Eggplant and aubergine','Vegetables','eggplant|aubergine'],
    ['onion','Onions','Alliums','onion'],
    ['garlic','Garlic','Alliums','garlic'],
    ['leek','Leeks','Alliums','leek'],
    ['celery','Celery','Vegetables','celery'],
    ['sweetcorn','Sweetcorn','Vegetables','sweetcorn|sweet corn|corn on cob|corn kernels|maize fresh'],
    ['green_pea','Green peas','Legumes','green pea|garden pea|peas|pea'],
    ['green_bean','Green beans','Legumes','green bean|runner bean|string bean|snap bean'],
    ['edamame','Edamame','Legumes','edamame'],
    ['chickpea','Chickpeas','Legumes','chickpea|garbanzo'],
    ['lentil','Lentils','Legumes','lentil|dhal|dal'],
    ['baked_beans','Baked beans','Legumes','baked beans|baked bean'],
    ['kidney_bean','Kidney beans','Legumes','kidney bean'],
    ['black_bean','Black beans','Legumes','black bean'],
    ['soybean','Soybeans','Legumes','soybean|soya bean|soy bean'],
    ['other_bean','Other dried beans and pulses','Legumes','haricot bean|navy bean|cannellini bean|pinto bean|butter bean|lima bean|black eyed bean|fava bean|broad bean|beans|bean'],
    ['tofu','Tofu and tempeh','Legumes','tofu|tempeh'],
    ['apple','Apples','Fruit','apple'],
    ['pear','Pears','Fruit','pear'],
    ['banana','Bananas','Fruit','banana'],
    ['orange','Oranges and mandarins','Fruit','orange|mandarin|tangerine'],
    ['lemon','Lemons and limes','Fruit','lemon|lime'],
    ['grapefruit','Grapefruit','Fruit','grapefruit'],
    ['kiwifruit','Kiwifruit','Fruit','kiwifruit|kiwi fruit'],
    ['berry','Berries','Fruit','strawberry|raspberry|blueberry|blackberry|boysenberry|currant|berry'],
    ['grape','Grapes','Fruit','grape|raisin|sultana'],
    ['plum','Plums','Fruit','plum|prune'],
    ['peach','Peaches','Fruit','peach'],
    ['nectarine','Nectarines','Fruit','nectarine'],
    ['apricot','Apricots','Fruit','apricot'],
    ['mango','Mangoes','Fruit','mango'],
    ['pineapple','Pineapple','Fruit','pineapple'],
    ['watermelon','Watermelon','Fruit','watermelon'],
    ['melon','Melons','Fruit','honeydew|rockmelon|cantaloupe|melon'],
    ['papaya','Papaya','Fruit','papaya|pawpaw'],
    ['feijoa','Feijoas','Fruit','feijoa'],
    ['passionfruit','Passionfruit','Fruit','passionfruit|passion fruit'],
    ['avocado','Avocados','Fruit','avocado'],
    ['fig','Figs','Fruit','fig'],
    ['date_fruit','Dates','Fruit','date fruit|dates'],
    ['almond','Almonds','Nuts','almond'],
    ['peanut','Peanuts','Nuts','peanut'],
    ['walnut','Walnuts','Nuts','walnut'],
    ['cashew','Cashews','Nuts','cashew'],
    ['pistachio','Pistachios','Nuts','pistachio'],
    ['hazelnut','Hazelnuts','Nuts','hazelnut'],
    ['brazil_nut','Brazil nuts','Nuts','brazil nut'],
    ['macadamia','Macadamias','Nuts','macadamia'],
    ['pecan','Pecans','Nuts','pecan'],
    ['chia_seed','Chia seeds','Seeds','chia seed|chia'],
    ['flax_seed','Linseed and flaxseed','Seeds','linseed|flaxseed|flax seed'],
    ['sesame_seed','Sesame seeds','Seeds','sesame'],
    ['sunflower_seed','Sunflower seeds','Seeds','sunflower seed'],
    ['pumpkin_seed','Pumpkin seeds','Seeds','pumpkin seed|pepita'],
    ['hemp_seed','Hemp seeds','Seeds','hemp seed|hemp hearts'],
    ['sausages','Sausages','Meat products','sausage|frankfurter|hot dog sausage'],
    ['meatballs','Meatballs and rissoles','Meat products','meatball|rissole'],
    ['lasagne','Lasagne','Mixed foods','lasagne|lasagna'],
    ['bolognese','Bolognese','Mixed foods','bolognese'],
    ['chow_mein','Chow mein','Mixed foods','chow mein'],
    ['meat_pie','Meat pies','Mixed foods','meat pie|steak pie|mince pie'],
    ['meat_jerky','Meat jerky','Meat products','jerky|biltong'],
    ['processed_meat','Processed meat','Meat products','corned beef|ham|salami|bacon|pate'],
    ['mixed_vegetables','Mixed vegetables','Vegetables','mixed vegetables|vegetable mix|assorted vegetables'],
    ['egg','Eggs','Animal-derived foods','egg'],
    ['beef','Beef','Animal-derived foods','beef'],
    ['lamb','Lamb and mutton','Animal-derived foods','lamb|mutton'],
    ['pork','Pork','Animal-derived foods','pork'],
    ['chicken','Chicken','Animal-derived foods','chicken'],
    ['turkey','Turkey','Animal-derived foods','turkey'],
    ['fish','Fish','Animal-derived foods','salmon|tuna|snapper|cod|hoki|fish'],
    ['shellfish','Shellfish','Animal-derived foods','prawn|shrimp|mussel|scallop|oyster|clam|shellfish'],
    ['hummus','Hummus','Dips and spreads','hummus|houmous'],
    ['pesto','Pesto','Sauces','pesto'],
    ['tomato_sauce','Tomato sauces','Sauces','tomato sauce|tomato paste|passata|ketchup'],
    ['mayonnaise','Mayonnaise','Sauces','mayonnaise|mayo'],
    ['soup','Soups','Mixed foods','soup|broth'],
    ['salad','Salads','Mixed foods','salad'],
    ['pizza','Pizza','Mixed foods','pizza'],
    ['burger','Burgers','Mixed foods','burger|hamburger'],
    ['sandwich','Sandwiches','Mixed foods','sandwich'],
    ['curry','Curries','Mixed foods','curry|korma'],
    ['stew','Stews and casseroles','Mixed foods','stew|casserole'],
    ['dessert','Desserts and puddings','Mixed foods','pudding|custard|dessert'],
    ['coffee','Coffee','Beverages','coffee|espresso'],
    ['tea','Tea and infusions','Beverages','tea|infusion'],
    ['soft_drink','Soft drinks','Beverages','soft drink|soda|cola|lemonade'],
    ['ice_confection','Ice confections','Desserts','ice confection|ice block|ice pop'],
    ['water','Water','Beverages','water']
  ].map(([id,label,parent,phrases],ix)=>({id,label,parent,phrases:phrases.split('|'),ix}));
  const typeById=new Map(TYPES.map(t=>[t.id,t]));
  const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(carrots|apples|bananas|potatoes|tomatoes|berries|cherries|peaches|oranges|mangoes|beans|peas|grapes|dates|oats)\b/g,m=>({carrots:'carrot',apples:'apple',bananas:'banana',potatoes:'potato',tomatoes:'tomato',berries:'berry',cherries:'cherry',peaches:'peach',oranges:'orange',mangoes:'mango',beans:'bean',peas:'pea',grapes:'grape',dates:'date',oats:'oat'}[m]))
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const singular=s=>norm(s).split(' ').map(w=>w.endsWith('ies')&&w.length>4?w.slice(0,-3)+'y':w.endsWith('es')&&w.length>5&&!w.endsWith('ses')?w.slice(0,-2):w.endsWith('s')&&w.length>3&&!w.endsWith('ss')?w.slice(0,-1):w).join(' ');
  function matchesPattern(words,phrase){
    let src=singular(words),alias=singular(phrase);
    if((' '+src+' ').includes(' '+alias+' '))return 100+alias.split(' ').length*18;
    const a=alias.split(' '),b=new Set(src.split(' '));
    return a.length>1&&a.every(w=>b.has(w))?68+a.length*10:0;
  }
  function typeFor(name,brand=''){
    const n=singular(name),b=singular(brand);
    let t=n;
    if(b&&(' '+t+' ').startsWith(' '+b+' '))t=t.slice(b.length).trim()||n;
    if(!t)return null;
    if(/\b(in (?:[a-z]+ )?juice|with (?:[a-z]+ )?juice|yoghurt coated|yogurt coated)\b/.test(t)&&!t.startsWith('juice ')){
      const head=String(name).split(',')[0];
      const primary=head!==String(name)?typeFor(head):null;
      if(primary && !primary.id.includes('juice'))return primary;
    }
    if(/\b(yoghurt|yogurt)\b/.test(t)) {
      if(/\bcoconut\b/.test(t))return typeById.get('coconut_yoghurt');
      if(/\balmond\b/.test(t))return typeById.get('almond_yoghurt');
      if(/\b(soy|soya)\b/.test(t))return typeById.get('soy_yoghurt');
    }
    // Name describes the product; reference descriptors can have incidental ingredients.
    const found=[];
    for(const group of TYPES){let best=0;
      for(const pattern of group.phrases){const score=matchesPattern(t,pattern);if(score>best)best=score;}
      if(best)found.push({group,score:best});
    }
    if(!found.length)return null;
    // Distinguish beverage coconut milk from thick coconut milk for cooking.
    if(/\b(coconut|coco)\b/.test(t)&&/\b(milk|drink|beverage)\b/.test(t)&&
      /\b(drink|beverage|ready to drink)\b/.test(t))return typeById.get('coconut_drink');
    // Avoid oil/rice/flour ingredient terms taking priority over an actual mixed product.
    const productTypes=new Set(['bread','rye_bread','bagel','flatbread','cracker','cookie','cake','muffin','pastry','breakfast_cereal','muesli','porridge','pasta','cereal_bar','protein_bar','nut_bar','ice_cream','fruit_juice','vegetable_juice','fruit_smoothie','pizza','burger','sandwich','curry','stew','salad','soup','dessert','lasagne','chow_mein','meat_pie','sausages','meatballs','meat_jerky','processed_meat','mixed_vegetables','fruit_drink','cordial','fruit_juice_concentrate','apple_juice','orange_juice','grape_juice','pineapple_juice','lemon_lime_juice','bolognese','ice_confection','tomato_sauce','potato_crisps','corn_crisps','popcorn','hummus','pesto','yoghurt','dairy_yoghurt','coconut_yoghurt','soy_yoghurt']);
    found.sort((a,b)=>{
      const aa=a.score+(productTypes.has(a.group.id)?75:0),bb=b.score+(productTypes.has(b.group.id)?75:0);
      return bb-aa||a.group.ix-b.group.ix;
    });
    return found[0].group;
  }
  // Data-driven fallback for a specific named food not in the curated crosswalk.
  // Uses the reference food's primary named subject, NOT its nutrient profile.
  const stemFor=name=>{
    const first=String(name||'').split(',')[0];
    let parts=singular(first).split(' ').filter(Boolean);
    while(['fresh','raw','cooked','boiled','dried','organic','frozen','canned','steamed','roasted'].includes(parts[0]))parts.shift();
    const stem=parts[0]||'';
    if(!stem||stem.length<3||['mixed','assorted','food','meat','vegetable','fruit','drink','juice','milk','water','butter','bread','flour','rice','soup','sauce','cream','seed','nut','oil','bar','dessert','pudding','meal','cereal','roll','sugar','pastry','biscuit','cake','pie','plant','beverage','breakfast','dairy','herb','spice','yoghurt','egg','fish','pasta','salad','noodle','wheat','apple','banana','cheese','soy','coconut'].includes(stem))return '';
    return stem;
  };
  const generatedType=stem=>({id:'reference:'+stem,label:stem[0].toUpperCase()+stem.slice(1),parent:'Other identified food types'});
  const TAGS={
    raw:/\b(raw|uncooked|fresh uncooked)\b/,boiled:/\b(boiled|simmered)\b/,steamed:/\bsteam(?:ed)?\b/,
    roasted:/\broast(?:ed)?\b/,baked:/\bbak(?:ed|ing)\b/,fried:/\b(fried|pan fried|deep fried)\b/,
    dried:/\b(dried|dehydrated)\b/,canned:/\b(canned|tinned)\b/,frozen:/\bfrozen\b/,
    white:/\bwhite\b/,brown:/\bbrown\b/,wholemeal:/\bwholemeal\b/,
    wholegrain:/\b(wholegrain|whole grain|wholewheat|whole wheat)\b/,seeded:/\b(seeded|seeds added)\b/,
    peeled:/\b(peeled|without skin|skin removed)\b/,unpeeled:/\b(unpeeled|with skin|skin on)\b/,
    sweetened:/\b(sweetened|added sugar|sugar sweetened)\b/,unsweetened:/\b(unsweetened|no added sugar)\b/,
    lowfat:/\b(reduced fat|low fat|skim|lite)\b/,fullfat:/\b(regular fat|full fat|whole milk|premium)\b/
  };
  const CONFLICTS=[['raw','boiled','steamed','roasted','baked','fried'],['white','brown','wholemeal','wholegrain'],['peeled','unpeeled'],['sweetened','unsweetened'],['lowfat','fullfat']];
  function tagsOf(text){const n=norm(text),out=[];for(const [k,r] of Object.entries(TAGS))if(r.test(n))out.push(k);return out;}
  function incompatible(wanted,have){return CONFLICTS.some(row=>row.some(t=>wanted.includes(t))&&row.some(t=>have.includes(t)&&!wanted.includes(t)));}
  const valid=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=100;
  const NZ='NZ FOODfiles 2024 (NZ Institute for Plant & Food Research / Ministry of Health)';
  const NZURL='https://foodcomposition.co.nz/foodfiles/';
  const NZTERMS='https://foodcomposition.co.nz/terms/';
  const AUURL='https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd';
  let cached=null;
  function references(){
    if(cached)return cached;
    const ref=[];
    const originals=global.PIE_NZ_FOODFILES_FIBRE_REFERENCE;
    if(Array.isArray(originals)&&originals.length){
      for(const a of originals){
        const fibreData=a.l&&(!a.f||a.l[0]>a.f[0])?a.l:a.f;
        if(!fibreData||!valid(fibreData[0]))continue;
        const name=a.s||a.n,type=typeFor(a.n)||typeFor(name)|| (stemFor(name)?generatedType(stemFor(name)):null);
        if(!type)continue;
        // Preserve unaltered source density readings; select a single conversion
        // only for coherent liquid-specific measures, not arbitrary bulk solids.
        const densities=(a.d||[]).map(x=>Number(x[1])).filter(x=>x>=.5&&x<=1.8);
        const min=Math.min(...densities),max=Math.max(...densities);
        const density=densities.length&&(max-min)<=.06&&max/min<=1.06?densities.reduce((a,b)=>a+b,0)/densities.length:null;
        ref.push({id:a.i,name,fullName:a.n,type:type.id,group:type.parent,
          tags:tagsOf(a.n+' '+(a.t||'')+' '+(a.r||'')),fibre:fibreData[0],baseUnit:'g',
          density,source:NZ,url:NZURL,terms:NZTERMS,
          method:fibreData===a.l?'FIBTLC':'FIBTG',provenance:fibreData.slice(1)});
      }
    }else{
      for(const a of global.PIE_NZ_CONCISE_REFERENCE||[]){
        if(!valid(a.values?.fibre))continue;
        const type=typeFor(a.name)||(stemFor(a.name)?generatedType(stemFor(a.name)):null);if(!type)continue;
        ref.push({id:a.referenceId,name:a.name,fullName:a.name,type:type.id,group:type.parent,
          tags:tagsOf(a.name),fibre:Number(a.values.fibre),baseUnit:'g',density:null,
          source:a.source,url:a.sourceUrl||NZURL,terms:NZTERMS,method:'published'});
      }
    }
    for(const a of global.PIE_AFCD_REFERENCE||[]){
      if(!valid(a.values?.fibre))continue;
      const type=typeFor(a.name)||(stemFor(a.name)?generatedType(stemFor(a.name)):null);if(!type)continue;
      const code=global.PIE_AFCD_CLASSIFICATION?.[a.referenceId];
      const density=global.PIE_AFCD_SPECIFIC_GRAVITY?.[a.referenceId]||null;
      ref.push({id:a.referenceId,name:a.name,fullName:a.name,type:type.id,group:type.parent,
        tags:tagsOf(a.name),fibre:Number(a.values.fibre),baseUnit:a.baseUnit||'g',density,
        code,majorCode:code?.slice(0,2),submajorCode:code?.slice(0,3),
        source:a.source,url:a.sourceUrl||AUURL,method:'published'});
    }
    for(const a of global.PIE_USDA_FOUNDATION_REFERENCE||[]){
      if(!valid(a.values?.fibre))continue;
      const type=typeFor(a.name)||(stemFor(a.name)?generatedType(stemFor(a.name)):null);if(!type)continue;
      ref.push({id:a.referenceId,name:a.name,fullName:a.name,type:type.id,group:type.parent,
        tags:tagsOf(a.name),fibre:Number(a.values.fibre),baseUnit:a.baseUnit||'g',density:null,
        source:a.source,url:a.sourceUrl||'https://fdc.nal.usda.gov/',method:'published'});
    }
    cached=ref;return cached;
  }
  function numericForUnit(item,unit){
    if(item.baseUnit===unit)return item.fibre;
    if(unit==='mL'&&item.baseUnit==='g'&&item.density)return item.fibre*item.density;
    if(unit==='g'&&item.baseUnit==='mL'&&item.density)return item.fibre/item.density;
    return null;
  }
  function median(values){if(!values.length)return null;const arr=[...values].sort((a,b)=>a-b);const m=arr.length>>1;return arr.length%2?arr[m]:(arr[m-1]+arr[m])/2;}
  function suggest(options){
    const name=String(options.name||'').trim(),unit=options.baseUnit==='mL'?'mL':'g',brand=options.brand||'';
    let type=options.groupId?typeById.get(options.groupId):typeFor(name,brand);
    if(!type){const stem=stemFor(name);if(stem&&references().some(x=>x.type==='reference:'+stem))type=generatedType(stem);}
    if(!type)return {needsGroup:true,error:'Choose the food type to estimate fibre. Nutrient values cannot identify its food group.',groups:groups()};
    const raw=references().filter(x=>x.type===type.id).map(x=>({...x,converted:numericForUnit(x,unit)})).filter(x=>x.converted!==null&&Number.isFinite(x.converted));
    if(!raw.length)return {needsGroup:true,error:'No compatible reference values for '+type.label+' per 100 '+unit+'. Choose a more suitable food type or enter fibre manually.',groups:groups(),groupId:type.id};
    const wanted=tagsOf(name);if(options.preparation&&TAGS[options.preparation]){
      for(const set of CONFLICTS){if(set.includes(options.preparation)){for(const t of set){const at=wanted.indexOf(t);if(at!==-1)wanted.splice(at,1);}}}
      wanted.push(options.preparation);
    }
    const forms=[...new Set(raw.flatMap(x=>x.tags))].filter(x=>TAGS[x]&&raw.some(y=>y.tags.includes(x))).sort();
    let comparable=raw.filter(x=>!incompatible(wanted,x.tags));
    if(!comparable.length)comparable=raw; // publish a less specific estimate rather than invent a value.
    // When the name explicitly specifies a preparation or grain refinement, use
    // that subset if available, while retaining all comparable source values.
    const prep=wanted.filter(t=>['raw','boiled','steamed','roasted','baked','fried','canned','frozen','dried','white','brown','wholemeal','wholegrain','seeded','sweetened','unsweetened','peeled','unpeeled','lowfat','fullfat'].includes(t));
    if(prep.length){const specific=comparable.filter(x=>prep.every(t=>x.tags.includes(t)));
      if(specific.length)comparable=specific;
    }
    // Avoid accidental double-counting of the same published record.
    const keySeen=new Set();comparable=comparable.filter(x=>{const key=x.source+'|'+x.id;
      if(keySeen.has(key))return false;keySeen.add(key);return true;});
    const values=comparable.map(x=>x.converted).sort((a,b)=>a-b);
    const middle=median(values),min=values[0],max=values.at(-1),spread=max-min;
    const medianAbs=middle===0?0:middle;
    const variation=values.length===1?'single':spread<=Math.max(.5,medianAbs*.35)?'narrow':spread<=Math.max(1.5,medianAbs*.85)?'moderate':'wide';
    const representative=[...comparable].sort((a,b)=>Math.abs(a.converted-middle)-Math.abs(b.converted-middle)
      ||(a.source.includes('NZ FOODfiles')?-1:1)).slice(0,5);
    return {value:Math.round(middle*10)/10,min:Math.round(min*100)/100,max:Math.round(max*100)/100,
      count:values.length,groupId:type.id,groupName:type.label,parent:type.parent,variation,forms,preparation:options.preparation||'',
      kind:values.length===1?'single-reference':'food-group',baseUnit:unit,
      narrowed:prep.length>0&&comparable.length<raw.length,
      methodNote:'Fibre distribution of comparable food types and preparation; no macro similarity used.',
      references:representative.map(x=>({id:x.id,name:x.name,value:Math.round(x.converted*100)/100,
        source:x.source,url:x.url,terms:x.terms||'',code:x.code||'',method:x.method}))};
  }
  function groups(){return TYPES.map(x=>({id:x.id,label:x.label,parent:x.parent})).sort((a,b)=>a.parent.localeCompare(b.parent)||a.label.localeCompare(b.label));}
  global.PIE_FIBRE_GROUP_ESTIMATOR={suggest,groups,typeFor,referenceCount:()=>references().length};
})(window);
