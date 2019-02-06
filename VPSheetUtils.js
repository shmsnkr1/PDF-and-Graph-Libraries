import fs from 'fs';
import uuid from 'uuid/v4';
import xml2js from 'xml2js';
import isJSON from 'is-json';
import request from 'request';
import vpXmlUtil from './VPSheetXMLUtils';
import putLog from 'aedyn/common-logger/logger/lib/putLog';
import { GET_LEGXML_URL, SIM_LEGXML1_URL, GET_VPSHEET_CONTENT_URL, GET_VPSHEET_TEXT_URL, SIM_LEGXML2_URL, GET_DOSCA_FILE_URL, TEMPLATE_CONF_PATH, PDF_CONFIG_PATH, TMP_PATH, DOSCA_FILE_NAME, CONTENT_XML_FILE_NAME, PDF_FILE_NAME, MESSAGE_CONSTS, TIMEOUT_CONST, DOSCA_MENU_NAME } from '../conf/app_config';
import FileUtil  from 'aedyn/common-util/lib/FileUtil';

const log = putLog();

module.exports = {
    /* -----------------------------------------------------------------------------------------
     * Function for taking configuration settings
     * Check whether the file exists or not
     * If not exists then error will return and the process terminates
     * If exists then fetch the configuration settings and continue rest of the process
     * -----------------------------------------------------------------------------------------*/
    getConfigFile: function () {
        log.info("[Start fetching config file]");
        return new Promise (function (resolve, reject) {
            fs.stat(PDF_CONFIG_PATH, function(err) {
                if(err === null) {
                    fs.readFile(PDF_CONFIG_PATH, (err, data) => {
                        if(err) {
                            reject({'error':err, 'msg': MESSAGE_CONSTS.CONFIG_FILE_READ_FAILED});
                            data = null;
                        } else {
                            try {
                                resolve(JSON.parse(data));
                                data = null;
                            } catch(error) {
                                reject({'error':error, 'msg': MESSAGE_CONSTS.CONFIG_FILE_PARSE_FAILED});
                                data = null;
                            }
                        }
                    });
                } else {
                    reject({'error':err, 'msg': MESSAGE_CONSTS.CONFIG_FILE_NOT_EXIST});
                }
            });
        });
    },
    /* -----------------------------------------------------------------------------
     * Function for parsing legxml
     * Check whether the file exists or not
     * If not exists, then error will return and the process will terminates
     * If exists, then fetch leg xml data and continue rest of the process
     * -----------------------------------------------------------------------------*/
    getLegXMLData: function( legId ) {
        log.info("[Start fetching leg xml] "+legId);
        return new Promise (function (resolve, reject) {
            const parser        = new xml2js.Parser();
            const proxySetting  = process.env.PROXY_SERVER;
            const requestClient = (proxySetting) ? request.defaults({ proxy: proxySetting, timeout: TIMEOUT_CONST.GET_LEGXML }) : request;

            requestClient.get(`${GET_LEGXML_URL}?recommendedroute_only=true&legid=${legId}`, function (error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    reject({'error':error, 'msg': MESSAGE_CONSTS.LEGXML_FETCH_FAILED});
                } else {
                    parser.parseString(body, function(parseError, ret) {
                        if( parseError ) {
                            reject({'error':parseError, 'msg': MESSAGE_CONSTS.LEGXML_PARSE_FAILED});
                        }
                        if ( ret.VoyageInfo.VesselStatus[0] !== 'U' ) {
                            reject({'error':'Vessel status is not underway', 'msg': MESSAGE_CONSTS.VESSEL_STATUS_NOT_U});
                        }
                        resolve(ret);
                        body = null;
                        ret = null;
                        log.info("[End fetching leg xml] "+legId);
                    });
                }
            });
        });
    },
    /* -----------------------------------------------------------------------------
     * Function for simulate legxml
     * First simulation process, main RPM will be calculated
     * Pass leg xml to the wx cache server and simulate (osr_simulation.cgi)
     * Convert leg xml from VPDB to input xml (common format for simulation)
     * Post input xml for simulating
     * Merge leg xml with simulated xml
     * -----------------------------------------------------------------------------*/
    simulateXML1: function( xmlObj, legId ) {
        log.info("[Start simulating leg xml]: First simulation "+legId);
        return new Promise (function (resolve, reject) {
            const parser        = new xml2js.Parser();
            const proxySetting  = process.env.PROXY_SERVER;

            const requestClient = (proxySetting) ? request.defaults({ proxy: proxySetting, timeout: TIMEOUT_CONST.SIMULATE_XML_1 }) : request;
            let simXML          = undefined;
            let builder         = new xml2js.Builder();

            /* ==============================================================
             * Delete Diversion points which has 'rpm_change' has SourceID
             * ==============================================================*/
            vpXmlUtil.removeRpmchangeFromDiversion(xmlObj);

            /* =========================================
             * Create input xml for first simulation
             * =========================================*/
            try {
                simXML = builder.buildObject(vpXmlUtil.convert2SimulationXML1(xmlObj));
                builder = null;
            } catch(err) {
                reject({'error': err, 'msg': MESSAGE_CONSTS.INPUTXML1_CREATE_FAILED});
            }

            /* ===================================================
             * Perform simulation #1
             * Main RPM will be calculated (osr_simulation.cgi)
             * ===================================================*/
            requestClient.post({
                url: `${SIM_LEGXML1_URL}`,
                headers: {'Content-Type' : 'text/xml'},
                formData: {'xml':simXML},
              }, function(error, response, body){
                    if ( error || response.statusCode !== 200 ) {
                        reject({'error':error, 'msg': MESSAGE_CONSTS.LEGXML_SIMULATE_FAILED});
                    }

                    parser.parseString(body, function(error, result) {
                        if( error ) {
                            reject({'error':error, 'msg': MESSAGE_CONSTS.SIMXML_PARSE_FAILED});
                        }

                        /* ==================================================
                         * Merge leg xml and simulated xml
                         * ==================================================*/
                        try {
                            vpXmlUtil.removeRpmchangeFromDiversion(result);
                            vpXmlUtil.mergeWithLegXML1(xmlObj, result);
                            resolve(xmlObj);
                        } catch(err) {
                            reject({'error': err, 'msg': MESSAGE_CONSTS.XML_MERGE_FAILED1})
                        }
                        log.info("[End simulating leg xml]: First simulation "+legId);
                    });
              });
        });
    },
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------
     * Function for acquire important items for the creation of VPSheet PDF
     * Call api for obtain the VPSheet contents. The output of this api will be the data for 「WayPointlist」「Route Comparison」「Voyage List」panels of PDF
     * Call api for obtain additional texts that are used in VPSheet. This includes some notes and explanation messages
     * Call api for obtain VPSheet settings. This file describes what should display and what not in the PDF
     * ---------------------------------------------------------------------------------------------------------------------------------------------------------*/
    getVPSheetContents: function ( xmlObj, legId ) {
        const _this = this;
        let vpSheetContents = {};
        return new Promise(function (resolve, reject) {

            /* ==============================================
             * Convert xml object to xml string
             * ==============================================*/
            let builder = new xml2js.Builder();
            let legXML  = builder.buildObject(xmlObj);
            builder     = null;

            try {
                /* ==============================================
                 * Call api for obtain VPSheet content
                 * ==============================================*/
                _this.getVPContents(legXML, legId)
                .then((retVpContent) => {
                    Object.assign(vpSheetContents, retVpContent);
                    resolve(vpSheetContents);
                })
                .catch((err) => {
                    reject(err);
                });

            } catch(error) {
                reject(error);
            }

            legXML          = null;
        });
    },
    /* --------------------------------------------------------------------
     * Function for acquire the contents of VPSheet
     * --------------------------------------------------------------------*/
    getVPContents: function ( legXML, legId ) {
        log.info("[Start getting VP Sheet content] "+legId);
        return new Promise(function (resolve, reject) {
            const proxySetting  = process.env.PROXY_SERVER;
            const requestClient = (proxySetting) ? request.defaults({ proxy: proxySetting, timeout: TIMEOUT_CONST.GET_VP_CONTENTS }) : request;
            requestClient.post({
                url: `${GET_VPSHEET_CONTENT_URL}`,
                headers: {'Content-Type' : 'text/xml'},
                formData: {'legxml':legXML},
              }, function(error, response, body){
                    if ( error || response.statusCode !== 200 ) {
                        reject({'error':error, 'msg': MESSAGE_CONSTS.VP_SHEET_CONTENT_GET_FAILED});
                    } else {
                        try {
                            const vpContents = JSON.parse(body);
                            if ( vpContents.result === 'NG' ) {
                                reject({'error':vpContents.reason, 'msg': MESSAGE_CONSTS.VP_SHEET_CONTENT_GET_FAILED});
                            } else {
                                resolve({"vpContents": vpContents["data"]});
                            }
                        } catch(err) {
                            reject({'error':err, 'msg': MESSAGE_CONSTS.VP_SHEET_CONTENT_PARSE_FAILED});
                        }
                    }
                    log.info("[End getting VP Sheet content] "+legId);
              });
        });
    },
    /* --------------------------------------------------------------------
     * Function for acquire the additional text contents of VPSheet
     * --------------------------------------------------------------------*/
    getVPTextContents: function ( clientCode, sectionCode, legId ) {
        log.info("[Start getting VP Sheet text content] "+legId);
        return new Promise(function (resolve, reject) {
            const proxySetting  = process.env.PROXY_SERVER;
            const requestClient = (proxySetting) ? request.defaults({ proxy: proxySetting, timeout: TIMEOUT_CONST.GET_VP_CONTENTS }) : request;
            requestClient.get(`${GET_VPSHEET_TEXT_URL}?client_code=${clientCode}&section_code=${sectionCode}`, function (error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    reject({'error':error, 'msg': MESSAGE_CONSTS.VP_SHEET_TEXT_CONTENT_GET_FAILED});
                } else {
                    try {
                        const vpTextContents = JSON.parse(body);
                        if ( vpTextContents.result === 'NG' ) {
                            reject({'error':vpTextContents.reason, 'msg': MESSAGE_CONSTS.VP_SHEET_TEXT_CONTENT_GET_FAILED});
                        } else {
                            resolve({"vpAdditionalTextContents": vpTextContents["data"]});
                        }
                    } catch (err) {
                        reject({'error':err, 'msg': MESSAGE_CONSTS.VP_SHEET_TEXT_CONTENT_PARSE_FAILED});
                    }
                }
                log.info("[End getting VP Sheet text content] "+legId);
            });
        });
    },
    /* -------------------------------------------------------------------------------------------------------------
     * Function for simulate legxml
     * Second simulation process, alternate RPM will be calculated
     * Pass leg xml to the wx cache server and simulate (osr_simulation_forcontent.cgi)
     * Convert leg xml that is merged with the result of first simulation (common format for simulation)
     * Post input xml for simulating
     * Merge leg xml with simulated xml
     * --------------------------------------------------------------------------------------------------------------*/
    simulateXML2: function ( xmlObj, vpContents, legId ) {
        log.info("[Start simulating leg xml]: Second simulation "+legId);
        return new Promise (function(resolve, reject) {
            const parser        = new xml2js.Parser();
            const proxySetting  = process.env.PROXY_SERVER;
            const requestClient = (proxySetting) ? request.defaults({ proxy: proxySetting, timeout: TIMEOUT_CONST.SIMULATE_XML_2 }) : request;
            let simXML          = undefined;
            let builder         = new xml2js.Builder();

            /* ============================================================================================
             * Create input xml for second simulation
             * ============================================================================================*/
            try {
                simXML = builder.buildObject(vpXmlUtil.convert2SimulationXML2(xmlObj, vpContents));
                builder = null;
            } catch(err) {
                reject({'error': err, 'msg': MESSAGE_CONSTS.INPUTXML2_CREATE_FAILED});
            }

            /* ====================================================================
             * Perform simulation #2
             * Alternate RPM will be calculated (osr_simulation_forcontent.cgi)
             * ====================================================================*/
            requestClient.post({
                url: `${SIM_LEGXML2_URL}`,
                headers: {'Content-Type' : 'text/xml'},
                formData: {'xml':simXML},
              }, function(error, response, body){
                    if ( error || response.statusCode !==200 ) {
                        reject({'error':error, 'msg': MESSAGE_CONSTS.LEGXML_SIMULATE_FAILED});
                    }

                    parser.parseString(body, function(error, result) {
                        if( error ) {
                            reject({'error':error, 'msg': MESSAGE_CONSTS.SIMXML_PARSE_FAILED});
                        }

                        /* ===============================================================================================
                         * Merge leg xml and simulated xml
                         * ==============================================================================================*/
                        try {
                            vpXmlUtil.mergeWithLegXML2( xmlObj, result, vpContents );
                            resolve(xmlObj);
                        } catch(err) {
                            reject({'error': err, 'msg': MESSAGE_CONSTS.XML_MERGE_FAILED2});
                        }
                        log.info("[End simulating leg xml]: Second simulation "+legId);
                    });
              });
        });
    },
    /* ------------------------------------------------------------------------------------------------------------------
     * Function for preparing graph data
     * Get recommended nodes and alternate nodes from the leg xml. Recommended route is always available in leg xml
     * Find minimum and maximum rpm values
     * Fetch the value of DrPoints within the days range
     * -------------------------------------------------------------------------------------------------------------------*/
    getGraphData: function ( xmlData, daysNum, currentEpoch ) {
        log.info(`  [Start manipulating graph data]: Days range: ${daysNum}`);
        const segments              = xmlData.Segments[0];
        const segmentInfo           = segments.SegmentInfo[0];
        const routeInfos            = segmentInfo.RouteInfos;
        const recommendedRoutes     = vpXmlUtil.getRecommendedRoutes( routeInfos );
        const alternateRoutes1      = vpXmlUtil.getAlternateRoutes1( routeInfos );
        const alternateRoutes2      = vpXmlUtil.getAlternateRoutes2( routeInfos );

        //const recommendedETD = recommendedRoutes[0].SegInfo[0].DeparturePortInfo[0].Pilot[0].TimeInfo[0].EstDtg;
        //const recPositionReport = recommendedRoutes[0].PositionReport;

        /* ==================================================================
         * Obtaining DR points of recommended and alternate routes
         * ==================================================================*/
        const recDRPoints   = (recommendedRoutes!==undefined)?recommendedRoutes[0].DRRoute[0].DrPoints:[];
        const altDRPoints1  = (alternateRoutes1!==undefined)?alternateRoutes1[0].DRRoute[0].DrPoints:[];
        const altDRPoints2  = (alternateRoutes2!==undefined)?alternateRoutes2[0].DRRoute[0].DrPoints:[];

        /* ==================================================================
         * Obtaining maximum and minimum rpm values from recommended route
         * ==================================================================*/
        const maxMinRPM     = vpXmlUtil.getMaxMinRPM(xmlData.ShipInfo[0]);

        /* ===========================================
         * Finding last reported date
         * ===========================================*/
        //const latestReportedDateTime = vpXmlUtil.getLastReportedDateTime(recPositionReport, recommendedETD);

        /* =============================================
         * Finding graphdata for recommended routes
         * =============================================*/
        const recGraphData  = vpXmlUtil.getGraphDataForRoutes(recDRPoints, daysNum, currentEpoch);

        /* ===============================================
         * Finding graph data for alternate route 1
         * ===============================================*/
        const altGraphData1 = vpXmlUtil.getGraphDataForRoutes(altDRPoints1, daysNum, currentEpoch);

        /* ==================================================
         * Finding graph data for alternate route 2
         * ==================================================*/
        const altGraphData2 = vpXmlUtil.getGraphDataForRoutes(altDRPoints2, daysNum, currentEpoch);

        return { maxMinRPM, recGraphData, altGraphData1, altGraphData2 };
    },
    /* ------------------------------------------------------------------------------------------------------------------
     * Function for preparing wx forecast list data
     * Get recommended nodes from the leg xml.
     * Fetch the value of DrPoints within the days range
     * -------------------------------------------------------------------------------------------------------------------*/
    getWxForecastListData: function ( xmlData, daysNum, currentEpoch ) {
        log.info(`  [Start manipulating wx forecast data]: Days range: ${daysNum}`);
        const segments              = xmlData.Segments[0];
        const segmentInfo           = segments.SegmentInfo[0];
        const routeInfos            = segmentInfo.RouteInfos;
        const recommendedRoutes     = vpXmlUtil.getRecommendedRoutes( routeInfos );

        const recDRPoints       = (recommendedRoutes!==undefined)?recommendedRoutes[0].DRRoute[0].DrPoints:[];

        /* ====================================================
         * Finding wx forecast data for recommended routes
         * ====================================================*/
        const wxForecastData    = vpXmlUtil.getWxForecastDataList(recDRPoints, daysNum, currentEpoch);

        return { wxForecastData };
    },
    /* ---------------------------------------------------------------------------------------------------
     * Function for fetching template data
     * For every client, there is a template data for each panels in pdf
     * If there is no template found in desired location, default template will be taken
     * ---------------------------------------------------------------------------------------------------*/
    getPanelTemplate: function () {
        log.info("[Start fetching template file]");
        return new Promise (function (resolve, reject) {

            /* ===========================================================
             * Looking template for the template file of VP Sheet
             * ===========================================================*/
            fs.stat(`${TEMPLATE_CONF_PATH}vp_template.json`, function(err) {
                if( err === null ) {
                    fs.readFile(`${TEMPLATE_CONF_PATH}vp_template.json`, (err, data) => {
                        if( err )
                            reject({'error':err, 'msg': MESSAGE_CONSTS.DFLT_FILE_READ_FAILED});
                        try {
                            resolve(JSON.parse(data));
                        } catch(error) {
                            reject({'error':err, 'msg': MESSAGE_CONSTS.TMPL_PARSE_FAILED});
                        }
                    });
                } else
                    reject({'error':err, 'msg': MESSAGE_CONSTS.TMPL_FILE_NOT_EXIST});
            });
        });
    },
    /* ------------------------------------------------------------------------------------------------------------
     * Function for creating DOSCA file
     * Create content xml and call api for creating DOSCA file
     * ------------------------------------------------------------------------------------------------------------*/
    getDOSCAFile: function(legId, xmlDoc, vpSheetContent, panelData, mapInfoContent) {
        log.info("[Start creating DOSCA file] "+legId);
        return new Promise (function(resolve, reject) {
            const proxySetting  = process.env.PROXY_SERVER;
            const requestClient = (proxySetting) ? request.defaults({ proxy: proxySetting, timeout: TIMEOUT_CONST.GET_DOSCA_FILE }) : request;
            let inputContentXML = undefined;
            let builder         = new xml2js.Builder();

            /* =========================================
             * Create content xml
             * =========================================*/
            try {
                inputContentXML = builder.buildObject(vpXmlUtil.convert2ContentXML(xmlDoc, vpSheetContent, panelData, mapInfoContent.mapgenInput));
                builder = null;
            } catch(err) {
                reject({'error': err, 'msg': MESSAGE_CONSTS.CONTENTXML_CREATE_FAILED});
            }

            const menu = (xmlDoc.VoyageInfo.FurtherCommunication[0].Menu !== undefined)?xmlDoc.VoyageInfo.FurtherCommunication[0].Menu:undefined;

            if (menu !== undefined && menu[0].$.Name !== undefined && menu[0].$.Active !== undefined && menu[0].$.Name === DOSCA_MENU_NAME && menu[0].$.Active === "true") {
                /* ===================================================
                * Get DOSCA file
                * ===================================================*/
                requestClient.post({
                    url: `${GET_DOSCA_FILE_URL}`,
                    headers: {'Content-Type' : 'text/xml'},
                    formData: {'legid':legId, 'contentxml':inputContentXML},
                    encoding: null,
                }, function(error, response, body){
                        if ( error || response.statusCode !== 200 ) {
                            reject({'error':error, 'msg': MESSAGE_CONSTS.DOSCA_API_FAILED});
                        }
                        try {
                            if ( isJSON(body.toString()) ) {
                                const result = JSON.parse(body);
                                reject({'error': MESSAGE_CONSTS.DOSCA_API_FAILED, 'msg': result.reason});
                            } else {
                                resolve({"dosca_content": body, "content_xml": inputContentXML});
                            }
                        } catch(err) {
                            reject({'error': err, 'msg': MESSAGE_CONSTS.SAVE_DOSCAFILE_FAILED});
                        }
                        log.info("[End creating DOSCA file] "+legId);
                });
            } else {
                resolve({"dosca_content": undefined, "content_xml": inputContentXML});
                log.info("[End creating DOSCA file] "+legId);
            }
        });
    },
    /* ------------------------------------------------------------------------------------------------------------
     * Function for saving files to temporary folder
     * ------------------------------------------------------------------------------------------------------------*/
    save2TempDir: function(doscaContent, doc) {
        log.info("[Start saving pdf file, content xml file and dosca file to temporary folder]");
        const _this = this;
        return new Promise (function(resolve, reject) {

            /* ======================================================
             * Create a temporary directory
             * ======================================================*/
            const targetPath    = TMP_PATH.replace('%s',uuid());
            const contentsPath  = `${targetPath}/contents/`

            /* =========================================
             * Save files to the temporary folder
             * =========================================*/
            try {
                FileUtil.mkdirp(contentsPath)
                .then((retPath) => {
                    return _this.saveContentXMLFile(`${contentsPath}${CONTENT_XML_FILE_NAME}.xml`, doscaContent.content_xml)
                })
                .then((retSaveContentXML) => {
                    return _this.saveDoscaFile(`${contentsPath}${DOSCA_FILE_NAME}.var`, doscaContent.dosca_content);
                })
                .then((retDoscaFIle) => {
                    return _this.savePdfFile(`${contentsPath}${PDF_FILE_NAME}.pdf`, doc);
                }).then((retVPFile) => {
                    resolve({"tempDir": targetPath});
                })
                .catch((err) => {
                    reject(err);
                });
            } catch(error) {
                reject(error);
            }
        });
    },
    /* ------------------------------------------------------------------------------------------------------------
     * Function for saving content xml file to temporary folder
     * ------------------------------------------------------------------------------------------------------------*/
    saveContentXMLFile: function(filePath, fileContent) {
        return new Promise (function(resolve, reject) {
            try {
                fs.writeFile(filePath, fileContent, function(err) {
                    if(err) {
                        reject({'error': err, 'msg': MESSAGE_CONSTS.CONTENTXML_CREATE_FAILED});
                    } else {
                        resolve(filePath)
                    }
                })
            } catch(err) {
                reject({'error': err, 'msg': MESSAGE_CONSTS.CONTENTXML_CREATE_FAILED});
            }
        });
    },
    /* ------------------------------------------------------------------------------------------------------------
     * Function for saving dosca var file to temporary folder
     * ------------------------------------------------------------------------------------------------------------*/
    saveDoscaFile: function(filePath, fileContent) {
        return new Promise (function(resolve, reject) {
            try {
                if (fileContent !== undefined) {
                    fs.writeFile(filePath, fileContent, function(err) {
                        if(err) {
                            reject({'error': err, 'msg': MESSAGE_CONSTS.CREATE_DOSCAFILE_FAILED});
                        } else {
                            resolve(filePath);
                        }
                    });
                } else {
                    resolve(filePath)
                }
            } catch(err) {
                reject({'error': err, 'msg': MESSAGE_CONSTS.CREATE_DOSCAFILE_FAILED});
            }
        });
    },
    /* ------------------------------------------------------------------------------------------------------------
     * Function for saving pdf file to temporary folder
     * ------------------------------------------------------------------------------------------------------------*/
    savePdfFile: function(filePath, doc) {
        return new Promise (function(resolve, reject) {
            try {
                doc.pipe(fs.createWriteStream(filePath))
                .on('finish', () => {
                    resolve(filePath);
                });
                doc.end();
            } catch(err) {
                reject({'error': err, 'msg': MESSAGE_CONSTS.PDF_FILE_CREATE_FAILED});
            }
        });
    }
};