/* PieChart calorie-target estimator v0.1.049.
   Mifflin–St Jeor REE (Mifflin et al., Am J Clin Nutr 1990).
   Until measured activity is available, 1.2 is a deliberately provisional,
   sedentary TDEE multiplier inclusive of incidental activity and digestion.
   This is not the NIH Body Weight Planner or a validated dynamic prediction.
   Goal-intensity energy adjustments and ±150 kcal flexibility are explicit
   product parameters, not medical prescriptions or confidence intervals.
   This module makes no Firestore writes and never uses sample history. */
(function(root){
  'use strict';
  const INTENSITY={gentle:150,moderate:300,strong:450};
  const HALF_WIDTH=150;
  const SEDENTARY_MULTIPLIER=1.2;
  const ROUND_TO=25;
  const round25=v=>Math.round(v/ROUND_TO)*ROUND_TO;
  function ageOn(dateOfBirth,date){
    if(typeof dateOfBirth!=='string'||!/^(?:19|20)\d\d-\d\d-\d\d$/.test(dateOfBirth)||
       typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
    const [y,m,d]=dateOfBirth.split('-').map(Number),[Y,M,D]=date.split('-').map(Number);
    const born=new Date(Date.UTC(y,m-1,d)),asOf=new Date(Date.UTC(Y,M-1,D));
    if(born.getUTCFullYear()!==y||born.getUTCMonth()+1!==m||born.getUTCDate()!==d||
       asOf.getUTCFullYear()!==Y||asOf.getUTCMonth()+1!==M||asOf.getUTCDate()!==D||asOf<born)return null;
    return Y-y-((M<m||(M===m&&D<d))?1:0);
  }
  function calculate(input){
    const {date,dateOfBirth,heightCm,sex,weightKg,goalWeightKg,goalIntensity='moderate'}=input||{};
    if(!Number.isFinite(goalWeightKg)||goalWeightKg<20||goalWeightKg>400)return {reason:'goal'};
    if(!Number.isFinite(weightKg)||weightKg<20||weightKg>400)return {reason:'weight'};
    const age=ageOn(dateOfBirth,date);
    if(!Number.isFinite(age)||!Number.isFinite(heightCm)||heightCm<80||heightCm>250||
       !['female','male'].includes(sex))return {reason:'details'};
    if(age<18)return {reason:'age'};
    if(age>110)return {reason:'details'};
    const metres=heightCm/100,bodyMassIndex=weightKg/(metres*metres);
    const goalBmi=goalWeightKg/(metres*metres);
    const difference=goalWeightKg-weightKg;
    // A general-purpose calorie deficit is inappropriate for an underweight
    // current or target BMI. Suppress rather than display a low target.
    if(difference<-.10&&(bodyMassIndex<18.5||goalBmi<18.5))return {reason:'underweight'};
    const resting=10*weightKg+6.25*heightCm-5*age+(sex==='male'?5:-161);
    if(!Number.isFinite(resting)||resting<500)return {reason:'details'};
    const maintenance=resting*SEDENTARY_MULTIPLIER;
    // Moderate, gentle, and strong set the intended pace. Taper smoothly
    // during the last ~1–2 kg, avoiding an abrupt jump at the goal.
    const adjustment=Math.sign(difference)*Math.min(
      INTENSITY[goalIntensity]||INTENSITY.moderate,Math.abs(difference)*200,
      maintenance*(difference<0?.20:.15));
    const midpoint=maintenance+adjustment;
    // Conservative planning guardrails are heuristic and MUST NOT be marketed
    // as a universally adequate intake threshold.
    const lowerPlanningGuard=sex==='male'?1500:1200;
    if(difference<-.10&&midpoint<=lowerPlanningGuard)return {reason:'lowEnergy'};
    const low=round25(Math.max(lowerPlanningGuard,midpoint-HALF_WIDTH));
    const high=Math.max(low+ROUND_TO*2,round25(Math.max(lowerPlanningGuard+ROUND_TO*2,midpoint+HALF_WIDTH)));
    return {low,high,resting:Math.round(resting),maintenance:Math.round(maintenance),
      midpoint:Math.round(midpoint),adjustment:Math.round(adjustment),
      guardLimited:midpoint-HALF_WIDTH<lowerPlanningGuard,
      provisional:true,activityBasis:'Sedentary baseline; steps and exercise not yet connected',
      intensity:goalIntensity,direction:Math.abs(difference)<=.10?'maintain':difference>0?'gain':'lose',age};
  }
  root.PieChartCalorieBudget={calculate,ageOn};
  if(typeof module==='object'&&module.exports)module.exports=root.PieChartCalorieBudget;
})(typeof window==='object'?window:globalThis);
