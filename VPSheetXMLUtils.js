import commUtil from './CommonUtils';
import xml2js from 'xml2js';
import { simInputTemplate } from '../conf/simulation_template/mainSimInput';
import { altSimInputTemplate } from '../conf/simulation_template/alternateSimInput';
import { contentXMLTemplate } from '../conf/contentxml_template/contentXML';

/* -------------------------------------------------------
 * Function for taking recommended routeinfo data from xml
 * -------------------------------------------------------*/
const getRecommendedRouteInfo = ( routeInfos ) => {
    const lenRouteInfo = routeInfos[0].$.num;
    for ( let i=0; i<lenRouteInfo; i++ ) {
        let attrRouteInfo = routeInfos[0].RouteInfo[i].$;
        if ( attrRouteInfo.purpose === 'Recommended' ) {
            return routeInfos[0].RouteInfo[i];
        }
    }
};

/* -------------------------------------------------------
 * Function for taking first alternate route data from xml
 * -------------------------------------------------------*/
const getAlternateRouteInfo1 = ( routeInfos ) => {
    const lenRouteInfo = routeInfos[0].$.num;
    for ( let i=0; i<lenRouteInfo; i++ ) {
        let attrRouteInfo = routeInfos[0].RouteInfo[i].$;
        if ( attrRouteInfo.purpose === 'P_Alternate1' || attrRouteInfo.purpose === 'U_Alternate1' ) {
            return routeInfos[0].RouteInfo[i];
        }
    }
};

/* -------------------------------------------------------
 * Function for taking second alternate route data from xml
 * -------------------------------------------------------*/
const getAlternateRouteInfo2 = ( routeInfos ) => {
    const lenRouteInfo = routeInfos[0].$.num;
    for ( let i=0; i<lenRouteInfo; i++ ) {
        let attrRouteInfo = routeInfos[0].RouteInfo[i].$;
        if ( attrRouteInfo.purpose === 'P_Alternate2' || attrRouteInfo.purpose === 'U_Alternate2' ) {
            return routeInfos[0].RouteInfo[i];
        }
    }
};

/* -------------------------------------------------------
 * Function for taking recommended route data from xml
 * -------------------------------------------------------*/
const getRecommendedRoutes = ( routeInfos ) => {
    const lenRouteInfo = routeInfos[0].$.num;
    for ( let i=0; i<lenRouteInfo; i++ ) {
        let attrRouteInfo = routeInfos[0].RouteInfo[i].$;
        if ( attrRouteInfo.purpose === 'Recommended' ) {
            return routeInfos[0].RouteInfo[i].Route;
        }
    }
};

/* -----------------------------------------------------------
 * Function for taking first alternate route data from xml
 * -----------------------------------------------------------*/
const getAlternateRoutes1 = ( routeInfos ) => {
    const lenRouteInfo = routeInfos[0].$.num;
    for ( let i=0; i<lenRouteInfo; i++ ) {
        let attrRouteInfo = routeInfos[0].RouteInfo[i].$;
        if ( attrRouteInfo.purpose === 'P_Alternate1' || attrRouteInfo.purpose === 'U_Alternate1' ) {
            return routeInfos[0].RouteInfo[i].Route;
        }
    }
};

/* ------------------------------------------------------------
 * Function for taking second alternate route data from xml
 * -----------------------------------------------------------*/
const getAlternateRoutes2 = ( routeInfos ) => {
    const lenRouteInfo = routeInfos[0].$.num;
    for ( let i=0; i<lenRouteInfo; i++ ) {
        let attrRouteInfo = routeInfos[0].RouteInfo[i].$;
        if ( attrRouteInfo.purpose === 'P_Alternate2' || attrRouteInfo.purpose === 'U_Alternate2' ) {
            return routeInfos[0].RouteInfo[i].Route;
        }
    }
};

/* -------------------------------------------------------------------------------------------------
 * Function for taking minimum and maximum rpm values from <MinRPM> and <MaxRPM> nodes from xml
 * ------------------------------------------------------------------------------------------------*/
const getMaxMinRPM = ( ShipInfo ) => {
    let maxRPM = 'MaxRPM:-',
    minRPM = 'MinRPM:-';

    if ( ShipInfo.MaxRPM !== undefined && ShipInfo.MaxRPM[0] !== undefined)
        maxRPM = 'MaxRPM:'+ShipInfo.MaxRPM[0];

    if ( ShipInfo.MinRPM !== undefined && ShipInfo.MinRPM[0] !== undefined)
        minRPM = 'MinRPM:'+ShipInfo.MinRPM[0];

    return { maxRPM, minRPM };
};

/* -----------------------------------------------
 * Function for finding last reported date time
 * ----------------------------------------------*/
const getLastReportedDateTime = ( positionReport ) => {
    const lenPositionReports = parseInt(positionReport[0].$.num) - 1;
    if ( lenPositionReports < 0 )
        return undefined;
    return positionReport[0].ReportedPosition[lenPositionReports].RTPoint[0].DateTime[0];
};

/* -----------------------------------------------
 * Function for finding last reported source id
 * ----------------------------------------------*/
const getLastReportedSID = ( positionReport ) => {
    const lenPositionReports = parseInt(positionReport[0].$.num) - 1;
    if ( lenPositionReports < 0 )
        return undefined;
    return positionReport[0].ReportedPosition[lenPositionReports].$.SourceID;
};

/* ---------------------------------------------------------
 * Function for taking route data for drawing graph
 * Here take DrPoints within the range of days specified
 * --------------------------------------------------------*/
const getGraphDataForRoutes = ( arrDRPoints, daysNum,  currentEpoch ) => {
    const lenDrPoints       = ( arrDRPoints[0] !== undefined ) ? arrDRPoints[0].$.num : 0;
    let daysAfterEpoch      = undefined;
    let startPointIdx       = undefined;
    let arrGraphData        = [];
    let prevValidWindSpd    = 0;
    let prevValidWaveHgt    = 0;

    if ( lenDrPoints > 0 ) {
        const eospTime      = arrDRPoints[0].DrPoint[lenDrPoints - 1].RTPoint[0].DateTime[0];
        const epochEOSP     = commUtil.toEpoch(eospTime);

        const result    = findStartIndexAndDaysRangeEpoch(arrDRPoints,lenDrPoints,daysNum,currentEpoch,true);
        startPointIdx   = result.start_point;
        daysAfterEpoch  = result.days_after_epoch;

        if (startPointIdx !== "") {
            for ( let i = startPointIdx; i<lenDrPoints; i++ ) {
                const drDateTime        = arrDRPoints[0].DrPoint[i].RTPoint[0].DateTime[0];
                let epochDateTime       = commUtil.toEpoch(drDateTime);

                if ( daysAfterEpoch === undefined || epochDateTime > daysAfterEpoch )
                    break;

                const comparison00  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT00:00:00');
                const comparison03  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT03:00:00');
                const comparison06  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT06:00:00');
                const comparison09  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT09:00:00');
                const comparison12  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT12:00:00');
                const comparison15  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT15:00:00');
                const comparison18  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT18:00:00');
                const comparison21  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT21:00:00');

                //Take corresponding data for the drawing of graph
                if ( (daysAfterEpoch !== undefined && epochDateTime <= daysAfterEpoch) && epochDateTime <= epochEOSP ) {
                    if ( drDateTime === comparison00 || drDateTime === comparison03 || drDateTime === comparison06 || drDateTime === comparison09 ||
                        drDateTime === comparison12 || drDateTime === comparison15 || drDateTime === comparison18 || drDateTime === comparison21 ) {
                        let temp = {
                            'date_time' : drDateTime,
                            'rpm'       : arrDRPoints[0].DrPoint[i].RTPoint[0].RPM[0],
                            'speed'     : arrDRPoints[0].DrPoint[i].RTPoint[0].Sc[0]._,
                            'wind_speed': (arrDRPoints[0].DrPoint[i].Weather[0].WindSpd !== undefined)?parseInt(arrDRPoints[0].DrPoint[i].Weather[0].WindSpd[0]._, 10):prevValidWindSpd,
                            'wave_ht'   : (arrDRPoints[0].DrPoint[i].Weather[0].WaveHt !== undefined && parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._) !== 9999.0)?commUtil.toFixed(parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._, 10), 1):prevValidWaveHgt
                        };
                        arrGraphData.push(temp);
                        if (arrDRPoints[0].DrPoint[i].Weather[0].WindSpd !== undefined) {
                            prevValidWindSpd = parseInt(arrDRPoints[0].DrPoint[i].Weather[0].WindSpd[0]._);
                        }
                        if (arrDRPoints[0].DrPoint[i].Weather[0].WaveHt !== undefined && parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._) !== 9999.0) {
                            prevValidWaveHgt = commUtil.toFixed(parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._, 10), 1);
                        }
                    }
                }
            }
        }
    }

    return arrGraphData;
};

/* ---------------------------------------------------------
 * Function for taking wx forecast data
 * --------------------------------------------------------*/
const getWxForecastDataList = ( arrDRPoints, daysNum, currentEpoch ) => {
    const lenDrPoints       = ( arrDRPoints[0] !== undefined ) ? arrDRPoints[0].$.num : 0;
    let startPointIdx       = undefined;
    let daysAfterEpoch      = undefined;
    let arrWxListData       = [];
    let prevValidWindSpd    = 0;
    let prevValidWaveHgt    = 0;
    let prevValidPeriod     = 0;
    let prevValidCurrentFactor   = 0;

    /* =============================================================
     * Weather forecast table is limited to a fixed number of days
     * =============================================================*/
    daysNum = (daysNum > 5)?5:daysNum;

    if ( lenDrPoints > 0 ) {
        const eospTime  = arrDRPoints[0].DrPoint[lenDrPoints - 1].RTPoint[0].DateTime[0];
        const epochEOSP = commUtil.toEpoch(eospTime);

        const result    = findStartIndexAndDaysRangeEpoch(arrDRPoints,lenDrPoints,daysNum,currentEpoch,false);
        startPointIdx   = result.start_point;
        daysAfterEpoch  = result.days_after_epoch;

        if (startPointIdx !== "") {
            for ( let i = startPointIdx; i<lenDrPoints; i++ ) {
                const drDateTime    = arrDRPoints[0].DrPoint[i].RTPoint[0].DateTime[0];
                let epochDateTime   = commUtil.toEpoch(drDateTime);

                if ( daysAfterEpoch === undefined || epochDateTime > daysAfterEpoch )
                    break;

                const comparison00  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT00:00:00');
                const comparison12  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT12:00:00');

                /* ===============================================
                * Fetch data from leg xml
                * ===============================================*/
                if ( (daysAfterEpoch !== undefined && epochDateTime <= daysAfterEpoch) && epochDateTime <= epochEOSP ) {
                    if ( drDateTime === comparison00 || drDateTime === comparison12 ) {
                        const waveHt    = (arrDRPoints[0].DrPoint[i].Weather[0].WaveHt !== undefined && parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._) !== 9999.0)?commUtil.toFixed(parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._, 10), 1):prevValidWaveHgt
                        let waveMax = '-';
                        if (waveHt > 6.0) {
                            waveMax = parseInt(parseFloat(waveHt, 10)* 1.6 * 10 + 0.5, 10)/10.0;
                        }
                        let temp = {
                            'date_time'     : commUtil.epochToStr(epochDateTime, '%b-%d/%H%M'),
                            'position'      : commUtil.formatLatLon(arrDRPoints[0].DrPoint[i].RTPoint[0].Point[0].Lat[0], 'D-M.SX') + '/' + commUtil.formatLatLon(arrDRPoints[0].DrPoint[i].RTPoint[0].Point[0].Lon[0], 'D-M.SX', false),
                            'wind_speed'    : (arrDRPoints[0].DrPoint[i].Weather[0].WindSpd !== undefined)?parseInt(arrDRPoints[0].DrPoint[i].Weather[0].WindSpd[0]._, 10):prevValidWindSpd,
                            'wind_dir'      : (arrDRPoints[0].DrPoint[i].Weather[0].WindDir !== undefined)?commUtil.deg2Card(arrDRPoints[0].DrPoint[i].Weather[0].WindDir[0]._):"-",
                            'wave_height'   : waveHt,
                            'wave_dir'      : (arrDRPoints[0].DrPoint[i].Weather[0].SeaDir !== undefined)?commUtil.deg2Card(arrDRPoints[0].DrPoint[i].Weather[0].SeaDir[0]._, false):"-",
                            'wave_period'   : (arrDRPoints[0].DrPoint[i].Weather[0].Per1 !== undefined)?parseInt(arrDRPoints[0].DrPoint[i].Weather[0].Per1[0]._, 10):prevValidPeriod,
                            'wave_max'      : waveMax,
                            'current_factor': (arrDRPoints[0].DrPoint[i].Weather[0].Longitudinal[0].CurDrift !== undefined)?commUtil.toFixed(parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].Longitudinal[0].CurDrift[0]._, 10), 1):prevValidCurrentFactor
                        };
                        arrWxListData.push(temp);
                        if (arrDRPoints[0].DrPoint[i].Weather[0].WindSpd !== undefined) {
                            prevValidWindSpd = parseInt(arrDRPoints[0].DrPoint[i].Weather[0].WindSpd[0]._);
                        }
                        if (arrDRPoints[0].DrPoint[i].Weather[0].WaveHt !== undefined && parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._) !== 9999.0) {
                            prevValidWaveHgt = commUtil.toFixed(parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].WaveHt[0]._, 10), 1);
                        }
                        if (arrDRPoints[0].DrPoint[i].Weather[0].Per1 !== undefined) {
                            prevValidPeriod = parseInt(arrDRPoints[0].DrPoint[i].Weather[0].Per1[0]._);
                        }
                        if (arrDRPoints[0].DrPoint[i].Weather[0].Longitudinal[0].CurDrift !== undefined) {
                            prevValidCurrentFactor = commUtil.toFixed(parseFloat(arrDRPoints[0].DrPoint[i].Weather[0].Longitudinal[0].CurDrift[0]._, 10), 1);
                        }
                    }
                }
            }
        }
    }
    return arrWxListData;
};

/* ---------------------------------------------------------
 * Function for finding starting point index of DR points
 * ---------------------------------------------------------*/
const findStartIndexAndDaysRangeEpoch = ( arrDRPoints, lenDrPoints, daysNum, currentEpoch, forGraphData ) => {
    let daysAfterEpoch      = undefined;
    let result = {"start_point": "","days_after_epoch": ""};

    for ( let i = 0; i<lenDrPoints; i++ ) {
        const drDateTime        = arrDRPoints[0].DrPoint[i].RTPoint[0].DateTime[0];
        let epochDateTime       = commUtil.toEpoch(drDateTime);

        if ( epochDateTime - currentEpoch >= 0 ) {
            const comparison00  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT00:00:00');
            const comparison12  = commUtil.epochToStr(epochDateTime, '%Y/%m/%dT12:00:00');

            /*==================================================================================================================================================
             * Starting point of the graph should be either 00Z or 12Z
             * If the time of currently fetched point is 00:00:00 then take specified number of days from the currently fetched date time having time as 16hrs
             * If the time of currently fetched point is 12:00:00 then take specified number of days from the currently fetched date time having time as 6hrs
             *==================================================================================================================================================*/
                if ( drDateTime === comparison00 || drDateTime === comparison12 ) {
                    // Finding the range of days
                    if (forGraphData) {
                        if ( drDateTime === comparison00 ) {
                            // For the smooth drawing of x axis end date is calculated as 16 hrs from the current date time
                            daysAfterEpoch = epochDateTime + (24*daysNum*1000*60*60) + (16*1000*60*60);
                            result.start_point      = i;
                            result.days_after_epoch = daysAfterEpoch;
                            break;
                        } else if ( drDateTime === comparison12 ) {
                            // For the smooth drawing of x axis end date is calculated as 6 hrs from the current date time
                            daysAfterEpoch = epochDateTime + (24*daysNum*1000*60*60) + (6*1000*60*60);
                            // Find the date time starting from 00:00:00
                            for ( let index = i - 1; index >=0; index-- ) {
                                const dateTime      = arrDRPoints[0].DrPoint[index].RTPoint[0].DateTime[0];
                                const dateTimeEpoch = commUtil.toEpoch(drDateTime);
                                if ( commUtil.epochToStr(dateTimeEpoch, '%Y/%m/%dT00:00:00') === dateTime || i === 0 ) {
                                    result.start_point      = i;
                                    result.days_after_epoch = daysAfterEpoch;
                                    break;
                                }
                            }
                        }
                    } else {
                        //Finding start index and target day for WXForecast table
                        if ( drDateTime === comparison00 || drDateTime === comparison12 ) {
                            daysAfterEpoch = epochDateTime + (24*daysNum*1000*60*60);
                            result.start_point      = i;
                            result.days_after_epoch = daysAfterEpoch;
                            break;
                        }
                    }
                }
        }
    }
    return result;
};

/* ---------------------------------------------------------
 * Function for converting leg xml to simulation input xml
 * --------------------------------------------------------*/
const convert2SimulationXML1 = ( legXML ) => {
    let voyageInfo = legXML.VoyageInfo;
    const recommendedRoutes     = getRecommendedRoutes( voyageInfo.Segments[0].SegmentInfo[0].RouteInfos );

    let simInput = JSON.parse(JSON.stringify(simInputTemplate));

    for ( let keys in voyageInfo ) {
        if ( keys === "Segments" ) {
            setRecRoutesSegmentsInfo( simInput, recommendedRoutes, voyageInfo, "sim1" );
        } else {
            if ( keys !== "RCComments" ) {
                simInput["VoyageInfo"][keys] = voyageInfo[keys];
            }
        }
    }
    return simInput;
};

/* ---------------------------------------------------------
 * Function for converting leg xml to simulation input xml
 * --------------------------------------------------------*/
const convert2SimulationXML2 = ( legXML, vpContents ) => {
    let voyageInfo = legXML.VoyageInfo;
    const recommendedRoutes     = getRecommendedRoutes( voyageInfo.Segments[0].SegmentInfo[0].RouteInfos );

    //ETD will be the datetime of last reported position
    const len               = recommendedRoutes[0].PositionReport[0].$.num - 1;
    const etd               = recommendedRoutes[0].PositionReport[0].ReportedPosition[len].RTPoint[0].DateTime[0];
    const arrRouteCmpList   = vpContents.vpsheet_content_6map.route_comparison.rpm_list;

    let altSimInput = JSON.parse(JSON.stringify(altSimInputTemplate));
    let altXMLRouteInfo = altSimInput.VoyageInfo.Segments.SegmentInfo.RouteInfos.RouteInfo;

    arrRouteCmpList.forEach(element => {
        if (element.kind !== 'Rec') {
            let tmp = {
                "$": {
                    "kind": (element.kind !== undefined)?element.kind:'',
                    "GetDrWeather": "off",
                    "CalcReported": "on",
                    "MEFOCons": (voyageInfo.SimulationInfo[0].$.MEFOCons !== undefined)?voyageInfo.SimulationInfo[0].$.MEFOCons:'',
                    "Governor": (recommendedRoutes[0].SimulationInfo[0].$.Governor !== undefined)?recommendedRoutes[0].SimulationInfo[0].$.Governor:'',
                    "RPM_Distr":  (recommendedRoutes[0].SimulationInfo[0].$.RPM_Distr !== undefined)?recommendedRoutes[0].SimulationInfo[0].$.RPM_Distr:'',
                    "DASHEnable": (recommendedRoutes[0].SimulationInfo[0].$.DASHEnable !== undefined)?recommendedRoutes[0].SimulationInfo[0].$.DASHEnable:'',
                    "type": (element.type !== undefined)?element.type:''
                },
                "ETD": etd
            };

            switch(element.base) {
                case 'RPM': tmp['SetRPM'] = element.set;
                            break;
                case 'Load': tmp['SetLoad'] = element.set;
                                break;
                default: break;
            }

            altXMLRouteInfo.Route["SimulationInfos"]["SimulationInfo"].push(tmp);
        }
    });

    for ( let keys in voyageInfo) {
        if ( keys === "Segments" ) {
            setRecRoutesSegmentsInfo(altSimInput, recommendedRoutes, voyageInfo, "sim2");
        } else {
            if ( keys !== "RCComments" ) {
                altSimInput["VoyageInfo"][keys] = voyageInfo[keys];
            }
        }
    }

    return altSimInput
};

/* --------------------------------------------------------------------------------------
 * Function for merging leg xml with simulated xml after the first simulation process
 * --------------------------------------------------------------------------------------*/
const mergeWithLegXML1 = ( legXMLObj, simXMLObj ) => {
    let voyageInfo = legXMLObj.VoyageInfo;
    const recommendedRoutes     = getRecommendedRoutes( voyageInfo.Segments[0].SegmentInfo[0].RouteInfos );

    for ( let keys in simXMLObj.VoyageInfo) {
        if ( keys === "Segments" ) {
            mergeRecRoutesSegmentsInfo(simXMLObj, recommendedRoutes, voyageInfo);
        } else {
            voyageInfo[keys] = simXMLObj.VoyageInfo[keys];
        }
    }
};

/* --------------------------------------------------------------------------------------
 * Function for merging leg xml with simulated xml after the second simulation process
 * --------------------------------------------------------------------------------------*/
const mergeWithLegXML2 = ( legXMLObj, simXMLObj, vpContents ) => {
    let voyageInfo              = legXMLObj.VoyageInfo;
    let simulationResults       = simXMLObj.SimulationResults;
    let recommendedRoutes       = getRecommendedRoutes( voyageInfo.Segments[0].SegmentInfo[0].RouteInfos );
    let tmpExportAttributes     = undefined;

    /*==============================================
     * Merge comparison summary results
     *==============================================*/
    if (recommendedRoutes[0].SegInfo[0].ComparisonSimulationInfo !== undefined)
        delete recommendedRoutes[0].SegInfo[0].ComparisonSimulationInfo;

    if (simulationResults.ComparisonSimulationInfo !== undefined) {
        /* ====================================================================================
         * Adjust the attribute values of ComparisonSummary tag in ComparisonSimulationInfo
         * ====================================================================================*/
        vpContents.vpsheet_content_6map.route_comparison.rpm_list.forEach(rpmList => {
            if (rpmList.kind !== "Rec") {
                simulationResults.ComparisonSimulationInfo[0].ComparisonSummary.forEach(cmpSummary => {
                    if (cmpSummary.$.kind === rpmList.kind && cmpSummary.$.RPM === rpmList.set) {
                        cmpSummary.$["Export"]          = (rpmList.export !== undefined)?rpmList.export:"";
                        cmpSummary.$["export2Exasite"]  = (rpmList.export2exasite !== undefined)?rpmList.export2exasite:"";
                        cmpSummary.$["name"]            = (rpmList.column_value !== undefined)?rpmList.column_value:"";
                    }
                });
            }
        });
        Object.assign(recommendedRoutes[0].SegInfo[0], {"ComparisonSimulationInfo": [simulationResults.ComparisonSimulationInfo[0]]});
    }

    /*============================================
     * Merge comparison results
     *============================================*/
    let arrResult = (simulationResults.Result !== undefined)?simulationResults.Result:[];
    if (recommendedRoutes[0].SegInfo[0].Reference !== undefined) {
        recommendedRoutes[0].SegInfo[0].Reference = [];
    } else {
        Object.assign(recommendedRoutes[0].SegInfo[0], {"Reference": []});
    }

    if (recommendedRoutes[0].SegInfo[0].MaxRPM !== undefined) {
        recommendedRoutes[0].SegInfo[0].MaxRPM = [];
    } else {
        Object.assign(recommendedRoutes[0].SegInfo[0], {"MaxRPM": []});
    }

    if (recommendedRoutes[0].SegInfo[0].MinRPM !== undefined) {
        recommendedRoutes[0].SegInfo[0].MinRPM = [];
    } else {
        Object.assign(recommendedRoutes[0].SegInfo[0], {"MinRPM": []});
    }

    let arrData = {"Reference": [], "OverRec": [], "UnderRec": []};

    arrResult.forEach(val => {
        let tmp = {
            "$": {
                "compid": val.$.compid,
                "RPM": val.$.RPM,
                "RPM_Shift": val.$.RPM_Shift,
                "Name": "",
                "Export": "",
                "export2Exasite": ""
            },
            "CalculateETA": val.CalculateETA,
            "FromLastReport": {
                "CalculateFoConsumption": val.CalculateFOC,
                "DASHAlert": {
                    "DASH": {
                        "DangerousDays": val.DASHDangerousDays
                    },
                    "WaveHeight": {
                        "DangerousDays": val.DangerousDays,
                        "SevereDays": val.SevereDays,
                        "HeavyDays": val.HeavyDays
                    }
                },
                "Weather": {
                    "MaxWaveHt": val.MaxWaveHt
                },
                "SECAAreaDistance": val.SECAAreaDistance,
                "SECAAreaHours": val.SECAAreaHours,
                "SECAAreaFoDRConsumption": val.SECAAreaFoDRConsumption,
            },
            "Whole": {
                "CalculateFoConsumption": val.WholeResult[0]["FoDRConsumption"],
                "DASHAlert": {
                    "DASH": {
                        "DangerousDays": val.WholeResult[0]["DASHDangerousDays"]
                    },
                    "WaveHeight": {
                        "DangerousDays": val.WholeResult[0]["DangerousDays"],
                        "SevereDays": val.WholeResult[0]["SevereDays"],
                        "HeavyDays": val.WholeResult[0]["HeavyDays"]
                    }
                },
                "SECAAreaDistance": val.WholeResult[0]["SECAAreaDistance"],
                "SECAAreaHours": val.WholeResult[0]["SECAAreaHours"],
                "SECAAreaFoDRConsumption": val.WholeResult[0]["SECAAreaFoDRConsumption"]
            }
        };

        vpContents.vpsheet_content_6map.route_comparison.rpm_list.forEach((list) => {
            if (list.kind !== "Rec") {
                if (list.kind !== "Reference") {
                    if (list.kind === val.$.kind) {
                        tmp.$.Export = list.export;
                        tmp.$.export2Exasite = list.export2exasite;
                        tmp.$.Name = list.column_value;
                    }
                } else {
                    if (parseInt(val.$.RPM) === parseInt(list.set)) {
                        tmp.$.Export = list.export;
                        tmp.$.export2Exasite = list.export2exasite;
                        tmp.$.Name = list.column_value;
                    }
                }
            }
        });

       switch ( val.$.kind ) {
            case "OverRec": arrData.OverRec.push(tmp);
                            break;
            case "UnderRec": arrData.UnderRec.push(tmp);
                            break;
            case "MaxRPM":  recommendedRoutes[0].SegInfo[0].MaxRPM.push(tmp);
                            break;
            case "MinRPM":  recommendedRoutes[0].SegInfo[0].MinRPM.push(tmp);
                            break;
            case "Reference": arrData.Reference.push(tmp);
                            break;
       };

    });

    recommendedRoutes[0].SegInfo[0].Reference.push(arrData);
};

/* --------------------------------------------------------------
* Function for merge route segment info to simulation xml
* ---------------------------------------------------------------*/
const mergeRecRoutesSegmentsInfo = ( simInput, recommendedRoutes, voyageInfo ) => {
    /* ===============================================
     * Merge Segment info data
     * ===============================================*/
    voyageInfo.Segments[0]["$"]["num"]                           = simInput.VoyageInfo.Segments[0]["$"]["num"];
    voyageInfo.Segments[0].SegmentInfo[0]["$"]                   = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["$"];
    voyageInfo.Segments[0].SegmentInfo[0]["SegmentStatus"]       = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["SegmentStatus"];
    voyageInfo.Segments[0].SegmentInfo[0]["VoyLogStatus"]        = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["VoyLogStatus"];
    voyageInfo.Segments[0].SegmentInfo[0]["Line"]                = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["Line"];
    voyageInfo.Segments[0].SegmentInfo[0]["VoyageNo"]            = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["VoyageNo"];
    voyageInfo.Segments[0].SegmentInfo[0]["DraftFore"]           = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["DraftFore"];
    voyageInfo.Segments[0].SegmentInfo[0]["DraftMid"]            = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["DraftMid"];
    voyageInfo.Segments[0].SegmentInfo[0]["DraftAft"]            = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["DraftAft"];
    voyageInfo.Segments[0].SegmentInfo[0]["LoadedBallastFlg"]    = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["LoadedBallastFlg"];
    voyageInfo.Segments[0].SegmentInfo[0]["TypeSvcGiven"]        = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["TypeSvcGiven"];
    voyageInfo.Segments[0].SegmentInfo[0]["RequiredETA"]         = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["RequiredETA"];
    voyageInfo.Segments[0].SegmentInfo[0]["GM"]                  = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["GM"];

    let simXMLRouteInfo = simInput.VoyageInfo.Segments[0].SegmentInfo[0].RouteInfos[0].RouteInfo[0];
    /* ===============================================
     * Merge Recommended route seginfo data
     * ===============================================*/
    recommendedRoutes[0].$                                     = simXMLRouteInfo.Route[0]["$"];
    recommendedRoutes[0].RouteName                             = simXMLRouteInfo.Route[0]["RouteName"];
    recommendedRoutes[0].SegInfo[0].SubRouteType               = simXMLRouteInfo.Route[0]["SegInfo"][0]["SubRouteType"];
    recommendedRoutes[0].SegInfo[0].DeparturePortInfo          = simXMLRouteInfo.Route[0]["SegInfo"][0]["DeparturePortInfo"];
    recommendedRoutes[0].SegInfo[0].ArrivalPortInfo            = simXMLRouteInfo.Route[0]["SegInfo"][0]["ArrivalPortInfo"];
    recommendedRoutes[0].SegInfo[0].CalculateETA               = simXMLRouteInfo.Route[0]["SegInfo"][0]["CalculateETA"];
    recommendedRoutes[0].SegInfo[0].SuggestedRPM               = simXMLRouteInfo.Route[0]["SegInfo"][0]["SuggestedRPM"];
    recommendedRoutes[0].SegInfo[0].CalculateFoComsumption     = simXMLRouteInfo.Route[0]["SegInfo"][0]["CalculateFoComsumption"];
    recommendedRoutes[0].SegInfo[0].ViaInfos                   = simXMLRouteInfo.Route[0]["SegInfo"][0]["ViaInfos"];
    recommendedRoutes[0].SegInfo[0].Whole                      = simXMLRouteInfo.Route[0]["SegInfo"][0]["Whole"];
    recommendedRoutes[0].SegInfo[0].Line                       = simXMLRouteInfo.Route[0]["SegInfo"][0]["Line"];
    recommendedRoutes[0].SegInfo[0].CalculateFoConsumption     = simXMLRouteInfo.Route[0]["SegInfo"][0]["CalculateFoConsumption"];
    recommendedRoutes[0].SegInfo[0].EstimateFoConsumption      = simXMLRouteInfo.Route[0]["SegInfo"][0]["EstimateFoConsumption"];
    recommendedRoutes[0].SegInfo[0].FromLastReport             = simXMLRouteInfo.Route[0]["SegInfo"][0]["FromLastReport"];
    recommendedRoutes[0].SegInfo[0].TotalDistance              = simXMLRouteInfo.Route[0]["SegInfo"][0]["TotalDistance"];
    recommendedRoutes[0].SegInfo[0].UntilLastReport            = simXMLRouteInfo.Route[0]["SegInfo"][0]["UntilLastReport"];

    /* ===============================================
     * Merge Recommended route simulation info data
     * ===============================================*/
    recommendedRoutes[0].SimulationInfo[0] = simXMLRouteInfo.Route[0]["SimulationInfo"][0];

    /* ===============================================
     * Merge Recommended route diversion info data
     * ===============================================*/
    recommendedRoutes[0].Diversions[0] = simXMLRouteInfo.Route[0]["Diversions"][0];

    /* ===============================================
     * Merge Recommended route DRRoute data
     * ===============================================*/
    recommendedRoutes[0].DRRoute[0] = simXMLRouteInfo.Route[0]["DRRoute"][0];

    /* ====================================================
     * Merge Recommended route position report info data
     * ====================================================*/
    recommendedRoutes[0].PositionReport[0] = simXMLRouteInfo.Route[0]["PositionReport"][0];

    voyageInfo.Segments[0].SegmentInfo[0].RouteInfos[0].RouteInfo[0].EvaluationReview  = simXMLRouteInfo.EvaluationReview;

    voyageInfo.Segments[0].SegmentInfo[0]["TrafficLightInfos"] = simInput.VoyageInfo.Segments[0].SegmentInfo[0]["TrafficLightInfos"];
};

/* --------------------------------------------------------------
* Function for setting route segment info to simulation xml
* ---------------------------------------------------------------*/
const setRecRoutesSegmentsInfo = ( simInput, recommendedRoutes, voyageInfo, simType ) => {
    /* ===============================================
     * Copy Segment info data
     * ===============================================*/
   simInput.VoyageInfo.Segments["$"]["num"]                      = voyageInfo.Segments[0]["$"]["num"];
   simInput.VoyageInfo.Segments.SegmentInfo["$"]                 = voyageInfo.Segments[0].SegmentInfo[0]["$"];
   simInput.VoyageInfo.Segments.SegmentInfo["SegmentStatus"]     = voyageInfo.Segments[0].SegmentInfo[0]["SegmentStatus"];
   simInput.VoyageInfo.Segments.SegmentInfo["VoyLogStatus"]      = voyageInfo.Segments[0].SegmentInfo[0]["VoyLogStatus"];
   simInput.VoyageInfo.Segments.SegmentInfo["Line"]              = voyageInfo.Segments[0].SegmentInfo[0]["Line"];
   simInput.VoyageInfo.Segments.SegmentInfo["VoyageNo"]          = voyageInfo.Segments[0].SegmentInfo[0]["VoyageNo"];
   simInput.VoyageInfo.Segments.SegmentInfo["DraftFore"]         = voyageInfo.Segments[0].SegmentInfo[0]["DraftFore"];
   simInput.VoyageInfo.Segments.SegmentInfo["DraftMid"]          = voyageInfo.Segments[0].SegmentInfo[0]["DraftMid"];
   simInput.VoyageInfo.Segments.SegmentInfo["DraftAft"]          = voyageInfo.Segments[0].SegmentInfo[0]["DraftAft"];
   simInput.VoyageInfo.Segments.SegmentInfo["LoadedBallastFlg"]  = voyageInfo.Segments[0].SegmentInfo[0]["LoadedBallastFlg"];
   simInput.VoyageInfo.Segments.SegmentInfo["TypeSvcGiven"]      = voyageInfo.Segments[0].SegmentInfo[0]["TypeSvcGiven"];
   simInput.VoyageInfo.Segments.SegmentInfo["RequiredETA"]       = voyageInfo.Segments[0].SegmentInfo[0]["RequiredETA"];
   simInput.VoyageInfo.Segments.SegmentInfo["GM"]                = voyageInfo.Segments[0].SegmentInfo[0]["GM"];

    let simXMLRouteInfo = simInput.VoyageInfo.Segments.SegmentInfo.RouteInfos.RouteInfo;
    /* ===============================================
     * Copy Recommended route seginfo data
     * ===============================================*/
    simXMLRouteInfo.Route["$"]                                 = recommendedRoutes[0].$;
    simXMLRouteInfo.Route["RouteName"]                         = recommendedRoutes[0].RouteName;
    simXMLRouteInfo.Route["SegInfo"]["SubRouteType"]           = recommendedRoutes[0].SegInfo[0].SubRouteType;
    simXMLRouteInfo.Route["SegInfo"]["DeparturePortInfo"]      = recommendedRoutes[0].SegInfo[0].DeparturePortInfo;
    simXMLRouteInfo.Route["SegInfo"]["ArrivalPortInfo"]        = recommendedRoutes[0].SegInfo[0].ArrivalPortInfo;
    simXMLRouteInfo.Route["SegInfo"]["CalculateETA"]           = recommendedRoutes[0].SegInfo[0].CalculateETA;
    simXMLRouteInfo.Route["SegInfo"]["SuggestedRPM"]           = recommendedRoutes[0].SegInfo[0].SuggestedRPM;
    simXMLRouteInfo.Route["SegInfo"]["CalculateFoComsumption"] = recommendedRoutes[0].SegInfo[0].CalculateFoComsumption;
    simXMLRouteInfo.Route["SegInfo"]["ViaInfos"]               = recommendedRoutes[0].SegInfo[0].ViaInfos;
    simXMLRouteInfo.Route["SegInfo"]["Whole"]                  = recommendedRoutes[0].SegInfo[0].Whole;
    simXMLRouteInfo.Route["SegInfo"]["Line"]                   = recommendedRoutes[0].SegInfo[0].Line;
    simXMLRouteInfo.Route["SegInfo"]["CalculateFoConsumption"] = recommendedRoutes[0].SegInfo[0].CalculateFoConsumption;
    simXMLRouteInfo.Route["SegInfo"]["EstimateFoConsumption"]  = recommendedRoutes[0].SegInfo[0].EstimateFoConsumption;

    /* ===============================================================================================================
     * Copy Recommended route Reference, MaxRPM, MinRPM and ComparisonSimulationInfo
     * If the second simulation process (comparison simulation) is going on, then the above items are necessary
     * ================================================================================================================*/
    if ( simType === 'sim2' ) {
        simXMLRouteInfo.Route["SegInfo"]["Reference"]                   = recommendedRoutes[0].SegInfo[0].Reference;
        simXMLRouteInfo.Route["SegInfo"]["MaxRPM"]                      = recommendedRoutes[0].SegInfo[0].MaxRPM;
        simXMLRouteInfo.Route["SegInfo"]["MinRPM"]                      = recommendedRoutes[0].SegInfo[0].MinRPM;
        simXMLRouteInfo.Route["SegInfo"]["ComparisonSimulationInfo"]    = recommendedRoutes[0].SegInfo[0].ComparisonSimulationInfo;
    }

    simXMLRouteInfo.Route["SegInfo"]["FromLastReport"]          = recommendedRoutes[0].SegInfo[0].FromLastReport;
    simXMLRouteInfo.Route["SegInfo"]["TotalDistance"]           = recommendedRoutes[0].SegInfo[0].TotalDistance;
    simXMLRouteInfo.Route["SegInfo"]["UntilLastReport"]         = recommendedRoutes[0].SegInfo[0].UntilLastReport;

    /* ===============================================
     * Copy Recommended route simulation info data
     * ===============================================*/
    simXMLRouteInfo.Route["SimulationInfo"]        = recommendedRoutes[0].SimulationInfo[0];

    /* ===============================================
     * Copy Recommended route diversion info data
     * ===============================================*/
    if ( simType === 'sim2' ) {
        const len               = recommendedRoutes[0].PositionReport[0].$.num - 1;
        simXMLRouteInfo.Route["Diversions"]        = recommendedRoutes[0].Diversions[0];
        simXMLRouteInfo.Route["Diversions"].Diversion[0].Points[0].RTPoint.unshift({
            "$": {
                "SourceID": recommendedRoutes[0].PositionReport[0].ReportedPosition[len].$.SourceID
            },
            "Point": recommendedRoutes[0].PositionReport[0].ReportedPosition[len].RTPoint[0].Point,
            "NavTrack": recommendedRoutes[0].PositionReport[0].ReportedPosition[len].RTPoint[0].NavTrack,
            "PointRemarks": '',
            "PointName": recommendedRoutes[0].PositionReport[0].ReportedPosition[len].RTPoint[0].PointName
        });
        simXMLRouteInfo.Route["Diversions"].Diversion[0].Points[0].$.num = simXMLRouteInfo.Route["Diversions"].Diversion[0].Points[0].RTPoint.length;
    } else {
        simXMLRouteInfo.Route["Diversions"]        = recommendedRoutes[0].Diversions[0];
    }

    /* ===============================================
     * Copy Recommended route DRRoute data
     * ===============================================*/
    simXMLRouteInfo.Route["DRRoute"]["$"]["WxBaseTime"]        = recommendedRoutes[0].DRRoute[0].$.WxBaseTime;

    /* ====================================================
     * Copy Recommended route position report info data
     * ====================================================*/
    simXMLRouteInfo.Route["PositionReport"]        = recommendedRoutes[0].PositionReport[0];

    simXMLRouteInfo.EvaluationReview    = voyageInfo.Segments[0].SegmentInfo[0].RouteInfos[0].RouteInfo[0].EvaluationReview;

    simInput.VoyageInfo.Segments.SegmentInfo["TrafficLightInfos"]  = voyageInfo.Segments[0].SegmentInfo[0]["TrafficLightInfos"];
};

/* --------------------------------------------------------------
* Function for creating content xml for DOSCA file
* ---------------------------------------------------------------*/
const convert2ContentXML = ( xmlDoc, vpSheetContent, panelData, mapInfoContent ) => {
    const vygInfo                   = xmlDoc.VoyageInfo;
    const segments                  = vygInfo.Segments[0];
    const segmentInfo               = segments.SegmentInfo[0];
    const routeInfos                = segmentInfo.RouteInfos;
    const recommendedRoutes         = getRecommendedRoutes(routeInfos);

    /* ========================================
    * Create contents xml
    * ========================================*/
    let contentXML = JSON.parse(JSON.stringify(contentXMLTemplate));
    let contentInfo = contentXML.ContentInfo;

    contentInfo.$.DangerousEnable                   = vpSheetContent.vpContents.vpsheet_setting.DangerousEnable;
    contentInfo.$.WeatherCurrentFactorEnable        = vpSheetContent.vpContents.vpsheet_setting.WeatherCurrentFactorEnable;
    contentInfo.$.NoDisplayRPM                      = vpSheetContent.vpContents.vpsheet_setting.NoDisplayRPM;
    contentInfo.$.CustomMap                         = vpSheetContent.vpContents.vpsheet_setting.CustomMap;
    contentInfo.$.voyagexml_revision                = (xmlDoc.VoyageInfo.$.Revision !== undefined || xmlDoc.VoyageInfo.$.Revision !== '')?xmlDoc.VoyageInfo.$.Revision:'';
    contentInfo.VoyageInfo.ServiceID                = (xmlDoc.VoyageInfo.ServiceID[0] !== undefined || xmlDoc.VoyageInfo.ServiceID[0] !== '')?xmlDoc.VoyageInfo.ServiceID[0]:'';
    contentInfo.VoyageInfo.TrackNum                 = (xmlDoc.VoyageInfo.ReferenceNo[0] !== undefined || xmlDoc.VoyageInfo.ReferenceNo[0] !== '')?xmlDoc.VoyageInfo.ReferenceNo[0]:'';
    contentInfo.ServiceMenu                         = (xmlDoc.VoyageInfo.ServiceMenu[0]._ !== undefined || xmlDoc.VoyageInfo.ServiceMenu[0]._ !== '')?xmlDoc.VoyageInfo.ServiceMenu[0]._:'';
    contentInfo.ClientInfo.ClientName               = (xmlDoc.VoyageInfo.ClientInfo[0].ClientName[0] !== undefined || xmlDoc.VoyageInfo.ClientInfo[0].ClientName[0] !== '')?xmlDoc.VoyageInfo.ClientInfo[0].ClientName[0]:'';
    contentInfo.ClientInfo.ClientCode               = (xmlDoc.VoyageInfo.ClientInfo[0].$.ClientCode !== undefined || xmlDoc.VoyageInfo.ClientInfo[0].$.ClientCode !== '')?xmlDoc.VoyageInfo.ClientInfo[0].$.ClientCode:'';
    contentInfo.ClientInfo.SectionCode              = (xmlDoc.VoyageInfo.ClientInfo[0].$.SectionCode !== undefined || xmlDoc.VoyageInfo.ClientInfo[0].$.SectionCode !== '')?xmlDoc.VoyageInfo.ClientInfo[0].$.SectionCode:'';
    contentInfo.VoyagePriority                      = (xmlDoc.VoyageInfo.VoyagePriority[0] !== undefined || xmlDoc.VoyageInfo.VoyagePriority[0] !== '')?xmlDoc.VoyageInfo.VoyagePriority[0]:'';
    contentInfo.SimulationInfo                      = (xmlDoc.VoyageInfo.SimulationInfo[0] !== undefined || xmlDoc.VoyageInfo.SimulationInfo[0] !== '')?xmlDoc.VoyageInfo.SimulationInfo[0]:'';
    contentInfo.VesselInfo.ShipName                 = (xmlDoc.VoyageInfo.ShipInfo[0].ShipName[0] !== undefined || xmlDoc.VoyageInfo.ShipInfo[0].ShipName[0] !== '')?xmlDoc.VoyageInfo.ShipInfo[0].ShipName[0]:'';
    contentInfo.VesselInfo.CallSign                 = (xmlDoc.VoyageInfo.ShipInfo[0].CallSign[0] !== undefined || xmlDoc.VoyageInfo.ShipInfo[0].CallSign[0] !== '')?xmlDoc.VoyageInfo.ShipInfo[0].CallSign[0]:'';
    contentInfo.VesselInfo.MaxRPM                   = (xmlDoc.VoyageInfo.ShipInfo[0].MaxRPM[0] !== undefined || xmlDoc.VoyageInfo.ShipInfo[0].MaxRPM[0] !== '')?xmlDoc.VoyageInfo.ShipInfo[0].MaxRPM[0]:'';
    contentInfo.VesselInfo.MinRPM                   = (xmlDoc.VoyageInfo.ShipInfo[0].MinRPM[0] !== undefined || xmlDoc.VoyageInfo.ShipInfo[0].MinRPM[0] !== '')?xmlDoc.VoyageInfo.ShipInfo[0].MinRPM[0]:'';
    contentInfo.VesselInfo.ShipNum                  = (xmlDoc.VoyageInfo.ShipInfo[0].ShipNum[0] !== undefined || xmlDoc.VoyageInfo.ShipInfo[0].ShipNum[0] !== '')?xmlDoc.VoyageInfo.ShipInfo[0].ShipNum[0]:'';
    contentInfo.VesselInfo.PropellerPitch           = (xmlDoc.VoyageInfo.ShipInfo[0].PropellerPitch[0]._ !== undefined || xmlDoc.VoyageInfo.ShipInfo[0].PropellerPitch[0]._ !== '')?xmlDoc.VoyageInfo.ShipInfo[0].PropellerPitch[0]._:'';
    contentInfo.MapInfo.MainMap.CenterPoint.Lon     = mapInfoContent.MapGenInfo.MapInfo.MainMap.CenterPoint.Lon;
    contentInfo.MapInfo.MainMap.CenterPoint.Lat     = mapInfoContent.MapGenInfo.MapInfo.MainMap.CenterPoint.Lat;
    contentInfo.MapInfo.MainMap.MapSize.Width       = mapInfoContent.MapGenInfo.MapInfo.MainMap.MapSize.Width;
    contentInfo.MapInfo.MainMap.MapSize.Height      = mapInfoContent.MapGenInfo.MapInfo.MainMap.MapSize.Height;
    contentInfo.MapInfo.MainMap.MapSize.Widthdegree = mapInfoContent.MapGenInfo.MapInfo.MainMap.MapSize.Widthdegree;
    contentInfo.MapInfo.MainMap.MapDays             = mapInfoContent.MapGenInfo.MapInfo.MainMap.MapDays;

    /* =======================================
    * Create serial panel contents
    * =======================================*/
    let tmpSerialPanel = {
        "$": {
            "PanelName": "serial"
        },
        "Contents": {
            "$": {
                "num": "1"
            },
            "Content": vpSheetContent.vpContents.vpsheet_content_6map.serial
        }
    };
    contentInfo.TextContent.Panel[0] = tmpSerialPanel;

    /* =======================================
    * Create header panel contents
    * =======================================*/
    let tmpHeaderPanel = {
        "$": {
            "PanelName": "1-1"
        },
        "Contents": {
            "$": {
                "num": "1"
            },
            "Content": `Issued:${panelData.issuedDate}`
        }
    };
    contentInfo.TextContent.Panel[1] = tmpHeaderPanel;

    /* =======================================
    * Create title panel contents
    * =======================================*/
    let tmpTitlePanel = {
        "$": {
            "PanelName": "1-4"
        },
        "Contents": {
            "$": {
                "num": "4"
            },
            "Content": [
                {"$": { "line": "0"}, "_": `VoyagePriority: ${panelData.voyagePriority}`},
                {"$": { "line": "1"}, _: `VoyageNo: ${panelData.voyageNo}`},
                {"$": { "line": "2"}, _: `From: ${panelData.depPort}`},
                {"$": { "line": "3"}, _: `To: ${panelData.arrPort}`}
            ]
        }
    };
    contentInfo.TextContent.Panel[2] = tmpTitlePanel;

    /* =======================================
    * Create map panel contents
    * This panel is always empty
    * =======================================*/
    let tmpMapPanel = {
        "$": {
            "PanelName": "1-5"
        },
        "Contents": {
            "$": {
                "num": "1"
            },
            "Content": ""
        }
    };
    contentInfo.TextContent.Panel[3] = tmpMapPanel;

    /* =======================================
    * Create waypoint panel contents
    * =======================================*/
    let tmpWaypointPanel = {
        "$": {
            "PanelName": "1-6"
        },
        "Content": {
            "NavInfoPattern": vpSheetContent.vpContents.vpsheet_content_6map.waypoint_list.navinfopattern,
            "Body": {
                "Points": {
                    "$": {
                        "num":vpSheetContent.vpContents.vpsheet_content_6map.waypoint_list.content.length
                    },
                    "Point": []
                }
            }
        }
    };

    vpSheetContent.vpContents.vpsheet_content_6map.waypoint_list.content.forEach(list => {
        let hashPoints = {
            "PointName": (list.pointname !== undefined)?list.pointname:"",
            "PointDate": (list.pointdate !== undefined)?list.pointdate:"",
            "NavTrack": (list.navtrack !== undefined)?list.navtrack:"",
            "Dist": (list.dist !== undefined)?list.dist:"",
            "AveSpeed": (list.avespeed !== undefined)?list.avespeed:"",
            "SetRPM": (list.setrpm !== undefined)?list.setrpm:"",
            "SetFOC": (list.setfoc !== undefined)?list.setfoc:"",
            "SetLoad": (list.setload !== undefined)?list.setload:"",
            "Remarks": (list.remarks !== undefined)?list.remarks:"",
        };
        tmpWaypointPanel.Content.Body.Points.Point.push(hashPoints);
    });
    contentInfo.TextContent.Panel[4] = tmpWaypointPanel;

    /* =======================================
    * Create route comparison panel contents
    * =======================================*/
    let tmpRouteCompPanel = {
        "$": {
            "PanelName": "1-12"
        },
        "Content": {
            "Body": {
                "$": {
                    "Routes": panelData.routeComparisonData.length
                },
                "Recommended": {
                    "Rec": [],
                    "Ref": []
                }
            }
        }
    };

    panelData.routeComparisonData[0].comparison_list.forEach(cmpList => {
        let outputStr = `"${panelData.routeComparisonData[0].routeName}","${panelData.routeComparisonData[0].ttlDistance}",`;
        outputStr += `"${cmpList.rpm_load}","${cmpList.eta_utc}","${cmpList.eta_lt}","${cmpList.eta_diff}","${cmpList.foc}","${cmpList.dash_dangerous}","${cmpList.dangerous}","${cmpList.severe}","${cmpList.heavy}","${cmpList.wf}","${cmpList.cf}"`;
        if (cmpList.need_to_highlight) {
            let arrTemp = {
                "$": {
                    "rpm": recommendedRoutes[0].SegInfo[0].SuggestedRPM[0]._
                },
                "_": outputStr
            };
            tmpRouteCompPanel.Content.Body.Recommended.Rec.push(arrTemp);
        } else {
            let arrTemp = {
                "$": {
                    "rpm": cmpList.rpm
                },
                "_": outputStr
            };
            tmpRouteCompPanel.Content.Body.Recommended.Ref.push(arrTemp);
        }
    });
    contentInfo.TextContent.Panel[5] = tmpRouteCompPanel;

    /* =======================================
    * Create route voyage info panel contents
    * =======================================*/
    let tmpVoyageInfoPanel = {
        "$": {
            "PanelName": "1-14"
        },
        "Contents": {
            "$": {
                "num": ""
            },
            "Content": []
        },
        "ContentData": {
            "Data": []
        }
    };
    const voyageInfo = vpSheetContent.vpContents.vpsheet_content_6map.voyage_infomation;
    const arrInfos   = voyageInfo.split('\n');

    tmpVoyageInfoPanel.Contents.$.num = arrInfos.length;
    arrInfos.forEach( (data, idx) => {
        let tmpHash = {
            "$": {
                "line": `${idx}`
            },
            "_": data
        };
        tmpVoyageInfoPanel.Contents.Content.push(tmpHash);
        tmpVoyageInfoPanel.ContentData.Data.push(tmpHash);
    });
    contentInfo.TextContent.Panel[6] = tmpVoyageInfoPanel;

    /* =======================================
    * Create route info panel contents
    * =======================================*/
    const recommendedRouteInfo      = getRecommendedRouteInfo( routeInfos );
    const alternateRouteInfo1       = getAlternateRouteInfo1( routeInfos );
    const alternateRouteInfo2       = getAlternateRouteInfo2( routeInfos );

    if (recommendedRouteInfo !== undefined) contentInfo.RouteInfos.RouteInfo.push(recommendedRouteInfo);
    if (alternateRouteInfo1 !== undefined) contentInfo.RouteInfos.RouteInfo.push(alternateRouteInfo1);
    if (alternateRouteInfo2 !== undefined) contentInfo.RouteInfos.RouteInfo.push(alternateRouteInfo2);

    return contentXML;
};

/* ==============================================================
 * Delete Diversion points which has 'rpm_change' has SourceID
 * ==============================================================*/
const removeRpmchangeFromDiversion = (xmlObj) => {
    const segments              = xmlObj.VoyageInfo.Segments[0];
    const segmentInfo           = segments.SegmentInfo[0];
    const routeInfos            = segmentInfo.RouteInfos;
    const recommendedRoutes     = getRecommendedRoutes( routeInfos );

    let arrRTPoints = recommendedRoutes[0].Diversions[0].Diversion[0].Points[0].RTPoint;
    let arrTemp = [];
    arrRTPoints.forEach((val,idx) => {
        let sid = val.$.SourceID;
        if (!sid.includes('rpm_change_')) {
            arrTemp.push(arrRTPoints[idx]);
        }
    });
    arrRTPoints = "";
    recommendedRoutes[0].Diversions[0].Diversion[0].Points[0].RTPoint = arrTemp;
    if (recommendedRoutes[0].Diversions[0].Diversion[0].Points[0].$.num !== undefined)
        recommendedRoutes[0].Diversions[0].Diversion[0].Points[0].$.num = arrTemp.length;
    arrTemp = "";
};

module.exports = {
    getRecommendedRouteInfo,
    getAlternateRouteInfo1,
    getAlternateRouteInfo2,
    getRecommendedRoutes,
    getAlternateRoutes1,
    getAlternateRoutes2,
    getMaxMinRPM,
    getLastReportedDateTime,
    getLastReportedSID,
    getGraphDataForRoutes,
    getWxForecastDataList,
    convert2SimulationXML1,
    convert2SimulationXML2,
    mergeWithLegXML1,
    mergeWithLegXML2,
    convert2ContentXML,
    removeRpmchangeFromDiversion
};