/* PieChart v0.1.087 — shared, dependency-free date, nutrition and serving rules.
   Food Item editors, recipe ingredients and recorded servings must agree. */
(() => {
  'use strict';
  const round=(value,places=2)=>Number(Number(value).toFixed(places));
  const kcalToKj=value=>Number(value)*4.184;
  const kjToKcal=value=>Number(value)/4.184;
  const localDay=()=>{
    const now=new Date();
    return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  };
  const validDay=(date,maxDay=localDay())=>{
    if(typeof date!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(date)||date>maxDay)return false;
    const stamp=Date.parse(date+'T00:00:00Z');
    return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===date;
  };
  const isWaterFood=item=>item?.type==='Food Item'&&
    String(item.name||'').trim().toLocaleLowerCase('en-NZ')==='water';
  const waterPercent=item=>Number.isFinite(item?.waterRemainderPercent)?
    Math.min(100,Math.max(0,item.waterRemainderPercent)):(isWaterFood(item)?100:0);
  const carbsIncludeFibre=item=>typeof item?.carbsIncludeFibre==='boolean'?
    item.carbsIncludeFibre:/^USDA\b/i.test(String(item?.source||''));
  const waterPer100=item=>{
    const values=item?.values||{};
    const amounts=['protein','fats','carbs','fibre'].map(k=>Number(values[k]));
    if(amounts.some(n=>!Number.isFinite(n)||n<0))return 0;
    const [protein,fats,carbs,fibre]=amounts;
    // NZ/AU available carbohydrates exclude fibre; USDA total carbohydrates include it.
    const remaining=Math.max(0,100-protein-fats-carbs-(carbsIncludeFibre(item)?0:fibre));
    // As in the existing product specification, one mL is approximately one g
    // for the water-contribution estimate; this is not a density measurement.
    return round(remaining*waterPercent(item)/100);
  };
  const servingAmount=(item,quantity,unit='base',recipeWeight=null,measureLabel='')=>{
    const n=Number(quantity);
    if(!Number.isFinite(n)||n<=0)return null;
    if(unit==='base')return n;
    if(unit==='whole'){
      if(!['Dish','Meal'].includes(item?.type)||!Number.isFinite(recipeWeight)||recipeWeight<=0)return null;
      return n*recipeWeight;
    }
    const label=unit.startsWith('measure:')?unit.slice('measure:'.length):
      unit==='measure'?String(measureLabel):null;
    if(label===null)return null;
    const measure=(item?.measures||[]).find(m=>m.label===label);
    if(!measure)return null;
    const amount=Number(measure.amount);
    return Number.isFinite(amount)&&amount>0?n*amount:null;
  };
  window.PieChartShared=Object.freeze({
    round,kcalToKj,kjToKcal,localDay,validDay,
    isWaterFood,waterPercent,carbsIncludeFibre,waterPer100,servingAmount
  });
})();
