import { Request, Response } from 'express';
import { successResponse, invalidResponse, errorResponse } from '../modules/common/service';
import { getAccessibleLogs, readLogFileTailed, HttpExtractorPipeline, isAccessibleLog } from '../modules/io/service';

/**
 * Handles IO related REST APIs
 */
export class IOController {


    /**
     * Returns a list of log files that are accessible by the agent
     * @param req Request
     * @param res Response
     */
    public listLogs(req: Request, res: Response) {
        let data = getAccessibleLogs();
        successResponse('list_logs', data, res);
    }

    /**
     * Returns contents of the desired log file, reading contents from the bottom-up.
     * Most recent log data will be at top of the results sent through HttpResponse.
     * 
     * Leverages Pipeline processing to stream chunked transport over HTTP.
     * 
     * @param req Request
     * @param res Response
     */
    public tailLog(req: Request, res: Response) {
        let fileName = req.query.fileName;
        let keywordSearch = req.query.search;
        let matchCountArg = req.query.count;
        let matchCount;
        
        // required
        if(!fileName) {
            invalidResponse('fileName parameter is missing or invalid', fileName, res);
            return;
        }

        // optional
        if(keywordSearch) {
            keywordSearch = String(keywordSearch);
        }

        // optional
        if(matchCountArg) {
            matchCount = Number(matchCountArg);
        }

        // check our log and proceed
        let myFileName = String(fileName);
        if(!isAccessibleLog(myFileName)) {
            throw new Error(`Invalid log file specified: ${myFileName}`);
        }

        readLogFileTailed(myFileName, new HttpExtractorPipeline(res, keywordSearch, matchCount));
    }
}