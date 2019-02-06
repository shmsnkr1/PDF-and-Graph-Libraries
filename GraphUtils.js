import commUtil from './CommonUtils';
import tickUtil from './TickUtils';
import putLog from 'aedyn/common-logger/logger/lib/putLog';
import { WIND_ICON, WAVE_ICON } from '../conf/app_config';

const log = putLog();

module.exports = {
    /* -------------------------------------------------------
     * Function for convert graph data int a common format
     * Data format: {date: xxxx, value: xxxx}
     * -------------------------------------------------------*/
    formatGraphData: function ( arrData, key ) {
        const hashKeys = {"ogSpeed": "speed", "rpm": "rpm", "windSpeed": "wind_speed", "wave_ht": "wave_ht"};

        function convertToCommonFormat ( arrData, key ) {
            let fmtdData = [];
            arrData.forEach(function(elem) {
                fmtdData.push({ 'date': elem.date_time, 'value': elem[key] });
            });
            return fmtdData;
        }

        const fmtdRecData   = convertToCommonFormat( arrData.recGraphData,  hashKeys[key] );
        const fmtdAltData1  = convertToCommonFormat( arrData.altGraphData1,  hashKeys[key] );
        const fmtdAltData2  = convertToCommonFormat( arrData.altGraphData2,  hashKeys[key] );

        return { 'reccomended':fmtdRecData, 'alternate_1':fmtdAltData1, 'alternate_2':fmtdAltData2 };
    },
    /* --------------------------------------
     * Function for drawing og speed graph
     * -------------------------------------*/
    drawOGSpeedGraph: function ( doc, speedData, options, daysRange, x, y ) {
        log.info(`[Start drawing og speed graph]`);
        const ogSpeedData = this.formatGraphData( speedData, "ogSpeed" );
        this.drawGraph( doc, ogSpeedData, options, daysRange, x, y, "", "ogSpeed" );
    },
    /* -----------------------------------
     * Function for drawing rpm graph
     * ----------------------------------*/
    drawRPMGraph: function ( doc, rpmData, options, daysRange, x, y ) {
        log.info(`[Start drawing rpm graph]`);
        const rpmGraphData = this.formatGraphData( rpmData, "rpm" );
        this.drawGraph( doc, rpmGraphData, options, daysRange, x, y, "step", "rpm" );
        doc.font(options.rpm_label.font).fontSize(options.rpm_label.fontSize);
        doc.text(rpmData.maxMinRPM.maxRPM, x, y + 10, {});
        doc.text(rpmData.maxMinRPM.minRPM, x, ( y + options.graph_height ) - 40, {});
        doc.font('Courier');
    },
    /* -----------------------------------------
     * Function for drawing wind speed graph
     * ----------------------------------------*/
    drawWindSpeedGraph: function ( doc, windData, options, daysRange, x, y ) {
        log.info(`[Start drawing wind speed graph]`);
        const windGraphData = this.formatGraphData( windData, "windSpeed" );
        this.drawGraph( doc, windGraphData, options, daysRange, x, y, "", "windSpeed" );
    },
    /* ------------------------------------------
     * Function for drawing wave height graph
     * -----------------------------------------*/
    drawWaveHeightGraph: function ( doc, waveData, options, daysRange, x, y ) {
        log.info(`[Start drawing wave height graph]`);
        const waveGraphData = this.formatGraphData( waveData, "wave_ht" );
        this.drawGraph( doc, waveGraphData, options, daysRange, x, y, "", "waveHeight" );
    },
    /* ----------------------------------------------------------------------------------------------------------
     * Function for drawing all graphs
     * Merge recommended route data and alternate route data together
     * Get all values regarding y axis
     * Get all dates from start date till end date
     * Find min and max values of y axis and calculate y axis ratio, x axis ratio, ticks and tick intervals
     * Calculate cordinate position of each points
     * Draw graph
     * ------------------------------------------------------------------------------------------------------------*/
    drawGraph: function ( doc, graphData, options, daysRange, x, y, lineType = "line", graphName ) {
        /* =======================================
        * Draw border for graph
        * =======================================*/
        doc.lineWidth(options.graph_border_thickness);
        doc.strokeColor(options.graph_border_color);
        doc.rect( x, y, options.graph_width, options.graph_height ).stroke();

        if ( graphData.reccomended.length ===0 && graphData.alternate_1.length ===0 && graphData.alternate_2.length === 0 )
            return;

        function concatnateData ( recGraphData, altGraphData1,  altGraphData2 ) {
            return recGraphData.concat(altGraphData1,  altGraphData2);
        }

        /*==========================================
        * Taking all values for y axis
        * =========================================*/
        function getYValueArray ( data ) {
            return data.map(( item ) => {
                return item.value;
            });
        }

        /* ===============================================================
        * Calculating screen cordinate points for each graph data
        * ===============================================================*/
        function calculateSVGData ( data, graphRatio, x, y ) {
            const arrCords = [];
            let tmpX = x;
            data.forEach(function( item ) {
                let tempCords = {
                    "xCord": tmpX,
                    "yCord": (((graphRatio.yMax - item.value) / graphRatio.tickRatio) * graphRatio.yRatio) + y,
                };
                arrCords.push(tempCords);
                tmpX+= graphRatio.xRatio;
            });
            return arrCords;
        }

        const mergedData    = concatnateData(graphData.reccomended, graphData.alternate_1, graphData.alternate_2);

        const yValues       = getYValueArray( mergedData );
        const arrXValues    = this.getDatesFromStartToEnd(mergedData[0].date, daysRange);
        const graphRatio    = this.getAxisRatio(yValues, arrXValues, options.graph_width, options.graph_height);

        const svgDataRec    = calculateSVGData(graphData.reccomended, graphRatio, x, y);
        const svgDataAlt1   = calculateSVGData(graphData.alternate_1, graphRatio, x, y);
        const svgDataAlt2   = calculateSVGData(graphData.alternate_2, graphRatio, x, y);

        const showXAxisTicks = (graphName === 'rpm' || graphName === 'waveHeight')?true:false;


        this.drawXAxis(doc, graphRatio, arrXValues, x, y, options.graph_height, options.ticks_options.xAxis, showXAxisTicks);
        this.drawYAxis(doc, graphRatio, x, y, options.graph_width, options.graph_height, options.graph_title, graphName, options.ticks_options.yAxis, options.show_icons);

        let lineOptions = undefined;

        const _this = this;
        [svgDataRec, svgDataAlt1, svgDataAlt2].forEach(function(arrSVGData, index){
            switch ( index ) {
                case 0 : lineOptions = options.recommended_line;
                        break;
                case 1:  lineOptions = options.alternate_line_1;
                        break;
                case 2:  lineOptions = options.alternate_line_2;
                        break;
                default : break;
            }

            switch ( lineType ) {
                case 'step': _this.drawSteps(doc, arrSVGData, lineOptions);
                            break;
                default: _this.drawLines(doc, arrSVGData, lineOptions);
                        break;
            }
        });
    },
    /* -------------------------------------
     * Function for drawing line graph
     * Draws line between two points
     * ------------------------------------*/
    drawLines: function ( doc, data, lineOptions ) {

        for( var i = 1; i<data.length; i++ ) {
            if ( lineOptions.isDashed )
                doc.dash(lineOptions.dashLength);
            doc.lineWidth(lineOptions.lineWidth);
            doc.strokeColor(lineOptions.color);
            doc.moveTo(data[i-1].xCord, data[i-1].yCord).lineTo(data[i].xCord, data[i].yCord).stroke().undash();
        }
    },
    /* --------------------------------------------------------------------------------------------------------------------------------------
     * Function for drawing step graph
     * When y coordinate value of current point is less than y coordinate value of previous point, then the step goes upwards
     * When y coordiante value of current point is greater than the y coordinate value of previous point, then the step goes downwards
     * When y coordinate value of current point and previous points are same, then it is a straight line 
     * --------------------------------------------------------------------------------------------------------------------------------------*/
     drawSteps: function ( doc, data, lineOptions ) {

        for( var i = 1; i<data.length; i++ ) {
            if ( lineOptions.isDashed )
                doc.dash(lineOptions.dashLength);

            doc.lineWidth(lineOptions.lineWidth);
            doc.strokeColor(lineOptions.color);

            if ( data[i].yCord < data[i - 1].yCord ) {
                doc.moveTo(data[i-1].xCord, data[i-1].yCord).lineTo(data[i].xCord, data[i-1].yCord).stroke().undash();
                doc.moveTo(data[i].xCord, data[i-1].yCord).lineTo(data[i].xCord, data[i].yCord).stroke().undash();
            } else if ( data[i].yCord > data[i - 1].yCord ) {
                doc.moveTo(data[i-1].xCord, data[i-1].yCord).lineTo(data[i-1].xCord, data[i].yCord).stroke().undash();
                doc.moveTo(data[i-1].xCord, data[i].yCord).lineTo(data[i].xCord, data[i].yCord).stroke().undash();
            } else {
                doc.moveTo(data[i-1].xCord, data[i-1].yCord).lineTo(data[i].xCord, data[i].yCord).stroke().undash();
            }
        }
    },
    /* ----------------------------------------------------------------------------------
     * Function for drawing x axis ticks
     * Tick lines will drawn from the current y position to the height of the graph
     * Axis ticks will drawn only for times 00 and 12
     * ---------------------------------------------------------------------------------*/
    drawXAxis: function ( doc, graphRatio, arrData, xPos, yPos, height, tickOptions, showXAxisTicks ) {
        let tmpX = xPos;
        for ( let i = 0; i < arrData.length - 1; i++ ) {
            const time = arrData[i].split('T');

            if ( time[1] === '00:00:00' ) {
                doc.moveTo(tmpX, yPos).lineTo(tmpX, yPos + height ).dash(28).lineWidth(1).stroke().undash();
                if ( showXAxisTicks ) {
                    doc.font(tickOptions.font).fontSize(tickOptions.timeFontSize);
                    doc.text(commUtil.strftime('%HZ', arrData[i]), tmpX - 25, yPos + height + 15, {});
                    doc.fontSize(tickOptions.dateFontSize);
                    doc.text(commUtil.strftime('%b-%d', arrData[i]), tmpX, yPos + height + 45, {});
                }
            }
            else if ( time[1] === '12:00:00' ) {
                doc.moveTo(tmpX, yPos).lineTo(tmpX, yPos + height + 10 ).dash(10).lineWidth(1).stroke().undash();
                if ( showXAxisTicks ) {
                    doc.fontSize(tickOptions.timeFontSize);
                    doc.text(commUtil.strftime('%HZ', arrData[i]), tmpX - 25, yPos + height + 15, {});
                }
            }
            tmpX+=graphRatio.xRatio;
        }
    },
    /* --------------------------------------------------------------------
     * Function for drawing y axis ticks
     * Tick lines will drawn from current x position upto width of graph
     * --------------------------------------------------------------------*/
    drawYAxis: function ( doc, graphRatio, xPos, yPos, width, height, titleOptions, graphName, tickOptions, showIcons ) {
        let tmpY = yPos;
        const arrTicks  = graphRatio.ticks.reverse();
        let digitLength = 1;

        //Initial x position of tick
        let tickXPos = xPos - (digitLength * 28);

        for ( let i = 0; i <arrTicks.length; i++ ) {
            doc.moveTo(xPos - 10, tmpY).lineTo(xPos + width, tmpY).dash(10).stroke().undash();
            doc.font(tickOptions.font).fontSize(tickOptions.fontSize);

            /* =================================================================================================
            * Dynamically calculate x position for the ticks in y axis
            * According to the number of digit in y axis ticks, the x position will adjust automatically
            * =================================================================================================*/ 
            digitLength = doc.widthOfString(arrTicks[i].toString());
            tickXPos    = xPos - (digitLength * 1.5);

            doc.text(arrTicks[i], tickXPos, tmpY - 10, {});
            tmpY+=graphRatio.yRatio;
        }

        /* =============================================
         * Adding title of the graph
         * =============================================*/
        doc.font(titleOptions.font).fontSize(titleOptions.fontSize);
        doc.save();
        doc.rotate(-90, {origin: [xPos , yPos]});
        if( graphName === 'rpm' )
            doc.text(titleOptions[graphName], (xPos - (height/2) - 5), yPos - 270);
        else
            doc.text(titleOptions[graphName], (xPos - height) - 2, (yPos - 270));


        /* ===============================================================
         * Adding icons
         * Icons can be set as hiiden by the configuration file of PDF
         * ===============================================================*/
        if( graphName === 'windSpeed' && showIcons.wind_icon === true )
            doc.image(WIND_ICON, (xPos - (height/2) - 5), yPos - 450, { width: 100 });

        if( graphName === 'waveHeight' && showIcons.wave_icon === true )
            doc.image(WAVE_ICON, (xPos - (height/2) - 5), yPos - 450, { width: 100 });

        doc.restore();
    },
    /* -----------------------------------------------------------------------------------------------
     * Function for calculating precision point values for drawing axis ticks and cordinate points
     * Calculate minimum and maximum value from the data set
     * Calculate axis ticks and tick interval
     * Calculate ratio of y axis and x axis
     * -----------------------------------------------------------------------------------------------*/
    getAxisRatio: function ( yValues, arrData, width, height ) {
        let yMin      = Math.floor(Math.min.apply( null, yValues ) *0.95);
        let yMax      = Math.ceil(Math.max.apply( null, yValues ) * 1.25 );

        if (yMin === null || isNaN(yMin)) yMin = 0;
        if (yMax === null || isNaN(yMax) || yMax === 0 ) yMax = 1;

        const objTicks  = tickUtil.ticks(yMin, yMax, 4); // ticks(min, max, n, true/null), where n is the approximate number of desired ticks.

        const ticks     = objTicks.ticks;
        const tickRatio = objTicks.interval;
        const yRatio    = height / ( ticks.length - 1 );
        const xRatio    = width / ( arrData.length - 1 );

        return { "yMin": ticks[0], "yMax": ticks[ticks.length-1], yRatio, xRatio, tickRatio, ticks };
    },
    /*----------------------------------------------------------
     * Find all the dates from the start date upto end date
     * Get all the data with 3 hours pitch
     * --------------------------------------------------------*/
    getDatesFromStartToEnd:  function ( startDate, daysRange ) {
        const epochStartDate    = commUtil.toEpoch(startDate);
        const epochEndDate      = epochStartDate + (24*daysRange*1000*60*60) + (24*1000*60*60);
        let arrDates            = [];

        // Take 3 hour pitchs
        for ( let i = epochStartDate; i <= epochEndDate; i += (3*1000*60*60) )
            arrDates.push(commUtil.epochToStr(i, '%Y/%m/%dT%H:%M:%S'));
        return arrDates;
    }
};
