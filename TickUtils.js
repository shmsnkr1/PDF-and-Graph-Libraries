/* ----------------------------------------------------------------------------------------
 * Base interval array which consists of intervals having difference of 1, 2, 5 and 10
 * Based on this array tick combinations are calculated
 * ---------------------------------------------------------------------------------------*/
const arrBases = [1, 2, 5, 10];

/*---------------------------------------------------------------------------------------------------------------------------------
 * Function for finding tick  values between minimum and maximum values
 * If need to swap minimum and maximum values, then swap accordingly
 * Calculate intervals between provided maximum and minimum value
 * Calculate the first tick value. If [isPreservedMinMax] is set to true, then first tick value is the minimum value provided
 * Find precise intervals between two point variables
 * Add each points to array
 * --------------------------------------------------------------------------------------------------------------------------------*/
const ticks = ( min, max, n, isPreserveMinMax ) => {

  /* =====================================
   * Swap min and max if necessary
   * =====================================*/
  if( min > max ){
    let temp = min;
    min = max;
    max = temp;
  }

  let interval = getIntervals(min, max, n);
  let value = getFirstTickValue(min, interval);

  let ticks = [value];
  while( value < max ) {
    value += interval;
    ticks.push( value );
  }

  ticks = ticks.map( precisionPoints( interval ) );

  /* ==================================================================================================
   * This will preserve minimum value of tick as the min value and maximum of tick as the max value
   * ==================================================================================================*/
  if( isPreserveMinMax ) {
    ticks[0] = min;
    ticks[ticks.length - 1] = max;
  }

  return { ticks, interval };
}

/* -----------------------------------------------------------------------------------------------------------
 * Function for finding precise values
 * This eliminates floating point errors otherwise accumulated by repeatedly adding the computed interval
 * ---------------------------------------------------------------------------------------------------------*/
const precisionPoints = ( interval ) => {
  let multiplier = Math.pow( 10, Math.ceil( Math.log10( interval ) ) + 1 );
  return function ( value ){
    return Math.round( value * multiplier ) / multiplier;
  };
}

/* ---------------------------------------------------------------
 * Function for finding intervals between tick values
 * The output of this function is intended to get nice intervals
 * ---------------------------------------------------------------*/
const getIntervals = ( min, max, n ) => {

  let rawInterval = ( max - min ) / n;
  let rawExponent = Math.log10(rawInterval);

  /* ===========================================================================================================
   * One of these two integer exponents, in conjunction with one of the bases, will yield the nicest interval.
   * ===========================================================================================================*/
  let exponents = [Math.floor(rawExponent), Math.ceil(rawExponent)];

  let interval = Infinity;
  arrBases.forEach(function ( base ){
    exponents.forEach(function ( exponent ){

      /* ==============================================
       * Try each combination of base and interval.
       * ==============================================*/
      let crntInterval = base * Math.pow(10, exponent);

      /* =================================================================================================
       * Pick the combination that yields the nice interval that most closely matches the raw interval.
       * =================================================================================================*/
      let crntDeviation = Math.abs(rawInterval - crntInterval);
      let niceDeviation  = Math.abs(rawInterval - interval);

      if ( crntDeviation < niceDeviation ){
        interval = crntInterval;
      }
    });
  });

  return interval;
}

/* -----------------------------------------
 * Function for finding first tick value
 * ----------------------------------------*/
const getFirstTickValue = ( min, interval ) => {
  return Math.floor(min / interval) * interval;
}

module.exports = {
    ticks
};