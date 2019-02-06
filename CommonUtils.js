import fs from 'fs';

/* ----------------------------------------------------------
 * Function for converting date time string to timestamp
 * ---------------------------------------------------------*/
const toEpoch = ( dateTimeStr ) => {
  const formatedStr = replaceTAndZ(dateTimeStr);
  const d = formatedStr.split(/\D/);
  return new Date(Date.UTC(d[0], d[1] - 1, d[2], d[3], d[4], d[5])).getTime();
};

/* -----------------------------------------------------------
 * Function for removing T and Z from UTC date time string
 * ----------------------------------------------------------*/
const replaceTAndZ = ( dateStr ) => {
  return dateStr.replace('Z', '').replace('T', ' ');
};

/* -----------------------------------------------------------
 * Function for converting timestamp to date time string
 * ----------------------------------------------------------*/
const epochToStr = ( epoch, fmt, isUTC=true ) => {
  const date = new Date( epoch );
  return strftime(fmt, date, isUTC);
};

/* --------------------------------------------------------------
 * Function for formating date time string to desired format
 * -------------------------------------------------------------*/
const strftime = ( sFormat, date, isUTC ) => {
    if (!(date instanceof Date)) {
      if (date === undefined)
        return "";
      if ( typeof date === 'string' )
        date = replaceTAndZ(date);
      date = new Date(date);
    }

    let nDay, nDate, nMonth, nYear, nHour;
    if (isUTC) {
      nDay = date.getUTCDay(),
      nDate = date.getUTCDate(),
      nMonth = date.getUTCMonth(),
      nYear = date.getUTCFullYear(),
      nHour = date.getUTCHours();
    } else {
      nDay = date.getDay(),
      nDate = date.getDate(),
      nMonth = date.getMonth(),
      nYear = date.getFullYear(),
      nHour = date.getHours();
    }

      const aDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      aMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      aDayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    const isLeapYear = () => {
      return (nYear %4 === 0 && nYear % 100 !== 0) || nYear % 400 === 0;
    };

    const getThursday = () => {
      var target = new Date(date);
      target.setDate(nDate - ((nDay+6)%7) + 3);
      return target;
    };

    const zeroPad = (nNum, nPad) => {
      return ((Math.pow(10, nPad) + nNum) + '').slice(1);
    };

    return sFormat.replace(/%[a-z]/gi, function(sMatch) {
      return (({
        '%a': aDays[nDay].slice(0,3), //Abbreviated name of the day of the week
        '%A': aDays[nDay], //Full name of the day of the week
        '%b': aMonths[nMonth].slice(0,3), //Abbreviated month name
        '%B': aMonths[nMonth], //Full month name
        '%c': date.toUTCString(), //Preferred date and time (UTC) representation for the current locale
        '%C': Math.floor(nYear/100), //Century number (year/100) as a 2-digit integer
        '%d': zeroPad(nDate, 2), //Day of the month as a decimal number (range 01 to 31)
        '%e': nDate, //Day of the month as a decimal number (range 1 to 31)
        '%F': date.toISOString().slice(0,10), //ISO 8601 date format (equivalent to %Y-%m-%d)
        '%G': getThursday().getFullYear(), //The 4-digit year corresponds to the ISO week number. This has the same format and value as %Y, except that if the ISO week number belongs to the previous or next year, that year is used instead 
        '%g': (getThursday().getFullYear() + '').slice(2), //Like %G, but without century, that is, with a 2-digit year (00-99)
        '%H': zeroPad(nHour, 2), //Hour as a decimal number using a 24-hour clock (range 00 to 23)
        '%I': zeroPad((nHour+11)%12 + 1, 2), //Hour as a decimal number using a 12-hour clock (range 01 to 12)
        '%j': zeroPad(aDayCount[nMonth] + nDate + ((nMonth>1 && isLeapYear()) ? 1 : 0), 3), //Day of the year as a decimal number (range 001 to 366)
        '%k': nHour, //Hour as a decimal number using a 24-hour clock (range 0 to 23)
        '%l': (nHour+11)%12 + 1, //Hour as a decimal number using a 12-hour clock (range 1 to 12)
        '%m': zeroPad(nMonth + 1, 2), //Month as a decimal number (range 01 to 12)
        '%n': nMonth + 1, //Month as a decimal number (range 1 to 12)
        '%M': zeroPad(date.getMinutes(), 2), //Minute as a decimal number (range 00 to 59)
        '%p': (nHour<12) ? 'AM' : 'PM', //Either "AM" or "PM" according to the given time value
        '%P': (nHour<12) ? 'am' : 'pm', //In lowercase ("am" or "pm")
        '%s': Math.round(date.getTime()/1000), //Number of seconds since the Epoch, 1970-01-01 00:00:00 +0000 (UTC).
        '%S': zeroPad(date.getSeconds(), 2), //Second as a decimal number (range 00 to 59)
        '%u': nDay || 7, //Day of the week as a decimal (range 1 to 7)
        '%V': (function() {
                var target = getThursday(),
                  n1stThu = target.valueOf();
                target.setMonth(0, 1);
                var nJan1 = target.getDay();
                if (nJan1!==4) target.setMonth(0, 1 + ((4-nJan1)+7)%7);
                return zeroPad(1 + Math.ceil((n1stThu-target)/604800000), 2);
              })(), //Week number of the current year as a decimal number
        '%w': nDay, //Day of the week as a decimal (range 0 to 6), Sunday being 0
        '%x': date.toLocaleDateString(), //Preferred date representation for the current locale without the time
        '%X': date.toLocaleTimeString(), //Preferred time representation for the current locale without the date
        '%y': (nYear + '').slice(2), //Year as a decimal number without a century (range 00 to 99)
        '%Y': nYear, //Year as a decimal number including the century
        '%z': date.toTimeString().replace(/.+GMT([+-]\d+).+/, '$1'), //the hour and minute offset from UTC
        '%Z': date.toTimeString().replace(/.+\((.+?)\)$/, '$1') //Timezone name or abbreviation
      }[sMatch] || '') + '') || sMatch;
    });
};

/* -------------------------------------------------
 * Function for formating latitude and longitude
 * ------------------------------------------------*/
const formatLatLon = ( value, format, isLat=true, options ) => {
    if ( typeof value === 'string' )
      value = parseFloat(value);

    if ( typeof options === 'undefined' )
      options = {};

    if ( format === '' || format === undefined )
        format = 'DU MU SU X';

    if( typeof options.decimalPlaces === 'undefined' )
      options.decimalPlaces = 5;
    else
      options.decimalPlaces = parseInt(options.decimalPlaces);

    const isNorth = (isLat && value > 0);
    const isEast  = (!isLat && value > 0);

    let dir = undefined;

    if ( isLat ) {
      dir = (isNorth)?'N':'S';
    } else {
      dir = (isEast)?'E':'W';
    }

    const units = {
      degrees: '°',
      minutes: '′',
      seconds: '″',
    };

    const zeroPad = (nNum) => {
      return (nNum < 10 ? '0' : '') + nNum;
    };

    const computeLatLon = (initVal) => {
      let result = {};
      result.initValue = initVal;
      result.degree = Math.abs(initVal) / 60;
      result.degreeInt = parseInt(result.degree, 10);
      result.minute = Math.abs(initVal) % 60;
      result.minuteInt = parseInt(result.minute, 10);
      result.totalSeconds = result.minute - result.minuteInt;
      result.seconds = (result.totalSeconds + 0.05)*10;
      result.secondsInt = parseInt(result.seconds, 10);

      if (result.secondsInt === 10 ) {
        result.seconds = 0;
        result.secondsInt = 0;
        result.minute+=1;
        result.minuteInt+=1;
      }

      return result;
    }

    const formatCoords = ( value, dir ) => {
      let formattedRes = format;
      formattedRes = formattedRes.replace(/DU/g, value.degreeInt+units.degrees); //Degree with unit (24°)
      formattedRes = formattedRes.replace(/du/g, value.degree.toFixed(options.decimalPlaces)+units.degrees); //Degree with decimal values with unit (24.13°). The number of decimal values can be fixed
      formattedRes = formattedRes.replace(/D/g, value.degreeInt); //Degree without unit (24)
      formattedRes = formattedRes.replace(/d/g, value.degree.toFixed(options.decimalPlaces)); //Degree with decimal values without unit (24.13)
      formattedRes = formattedRes.replace(/MU/g, zeroPad(value.minuteInt)+units.minutes); //Minute with unit (5′)
      formattedRes = formattedRes.replace(/mu/g, value.minute.toFixed(options.decimalPlaces)+units.minutes); //Minute with decimal values with unit (5.10′)
      formattedRes = formattedRes.replace(/M/g, zeroPad(value.minuteInt)); //Minute without unit (5)
      formattedRes = formattedRes.replace(/m/g, value.minute.toFixed(options.decimalPlaces)); //Minute with decimal values without unit (5.10)
      formattedRes = formattedRes.replace(/SU/g, value.secondsInt+units.seconds); //Seconds with unit (3″)
      formattedRes = formattedRes.replace(/S/g, value.secondsInt); //Seconds without unit (3)
      formattedRes = formattedRes.replace(/su/g, value.seconds.toFixed(options.decimalPlaces)+units.seconds); //Seconds with decimal value with unit (3.5″)
      formattedRes = formattedRes.replace(/s/g, value.seconds.toFixed(options.decimalPlaces)); //Seconds with decimal value without unit (3.5)
      formattedRes = formattedRes.replace(/X/g, dir); //Direction (N || S || E || W)

      return formattedRes;
    }

    const computedValue = computeLatLon(value);

    const fmtdResult = formatCoords(computedValue, dir)

    return fmtdResult;
};

/* ----------------------------------------------------------------
 * Function for converting wind degree to cardinal direction
 * ---------------------------------------------------------------*/
const deg2Card = (deg, isWind=true) => {
    const dirSectors = {
      windDir: ["S","SSW","SW","WSW","W","WNW","NW","NNW","N","NNE","NE","ENE","E","ESE","SE","SSE","S"],
      dir: ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N"]
    };

    /*=================================================================================================
     * Convert degree to index values that correspond with the 17 index values
     * Inorder to limit direction to 360 degrees, find remainder after dividing total degrees by 360
     * Divide the direction by 22.5 (degrees for each sector) and get number ranging from 0 to 16
     *=================================================================================================*/
    const cardDir = (isWind)?dirSectors.windDir[Math.round((deg % 360) / 22.5)]:dirSectors.dir[Math.round((deg % 360) / 22.5)];
    return cardDir;
};

/* -----------------------------------------------------------------------
 * Function for truncating number to desired number of decimal places
 * -----------------------------------------------------------------------*/
const toFixed = (number, decimalPlace) => {
  const calcExpression = new RegExp('^-?\\d+(?:\.\\d{0,' + (decimalPlace || -1) + '})?');
  const retVal = (number % 1 !== 0)?number.toString().match(calcExpression)[0]:parseInt(number, 10).toFixed(decimalPlace);
  return retVal;
};

/* -----------------------------------------------------------------------
 * Function for rounding to next 15 minutes
 * -----------------------------------------------------------------------*/
const roundTo15MinutesEpoch = (epoch, fmt="") => {
  if (!(epoch instanceof Date)) {
    if ( typeof epoch === 'string' )
      epoch = replaceTAndZ(epoch);
    epoch = new Date(epoch);
  }
  let offset = 15 * 1000* 60;

  const retVal = (fmt==="")?(Math.ceil(epoch / offset)) * offset:epochToStr((Math.ceil(epoch / offset)) * offset, fmt);
  return retVal;
};

/* -----------------------------------------------------------------------
 * Function for delete directory and all contents inside recursive
 * -----------------------------------------------------------------------*/
const removeDir = (dirPath, needToDelDir) => {
  if (needToDelDir === undefined) {
    needToDelDir = true;
  }

  if (dirPath === undefined)
   return;

  const files = fs.readdirSync(dirPath);

  if (files.length > 0) {
    for (let i = 0; i<files.length; i++) {
      const filePath = `${dirPath}/${files[i]}`;
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        } else {
          removeDir(filePath);
        }
      }
    }

    if (needToDelDir) {
      fs.rmdirSync(dirPath);
    }
  }
};

module.exports = {
    toEpoch,
    replaceTAndZ,
    epochToStr,
    strftime,
    formatLatLon,
    deg2Card,
    toFixed,
    roundTo15MinutesEpoch,
    removeDir
};