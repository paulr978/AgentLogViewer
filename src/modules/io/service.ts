import runtimeConfig from '../../runtime.json';
import { Response } from 'express';
import { BufferedLogTailerIfc, ExtractorPipelineIfc, LogFileReadState } from './model'
import * as fs from 'fs' 
import { getLogFiles } from './utils';
import { HTTP_RESPONSE_STATUS } from 'modules/common/model';
import { isDebug } from '../../core/app';


/**
 * Processes physical read of log file provided.
 * Supports streaming capabilities by leveraging chunking.
 * Buffering pipeline is extraction point for data retrieval.
 * 
 * Required input is path pointing to log file. Must pass accessible log criteria.
 * Constructor may throw an exception if file is invalid.
 */
class LogFileReader implements BufferedLogTailerIfc {
    public static MAX_READ_BYTES_SIZE: number = 5120000;

    private file_path: fs.PathLike;
    
    constructor(file_path: fs.PathLike) {
        this.file_path = file_path;
    }

    /**
     * tailLines() is designed to read lines in bulk (chunks) starting from the end of a log file.
     * Logic is included which will group results by line, and return each line back to the pipeline.
     * 
     * @param pipeline ExtractorPipeline
     * @param keywordSearch 
     * @param matchCount 
     */
    async tailLines(pipeline: ExtractorPipelineIfc) {
        let file_fd: number | undefined;

        // need our file descriptor before we start any i/o
        // we should make it a habit to close our descriptor
        try {

            let file_fd = fs.openSync(this.file_path, 'r');
            let logState = new LogFileReadState();
            logState.nextPosition = -1;
            logState.length = -1;

            // loop on initial and if bytes are read
            while(logState.nextPosition == -1 || logState.nextPosition >= 0) {

                // position is unknown, for instance, we may be reading this file as the first iteration in a series.
                // let's get the size of this file and set our position accordingly.
                if(logState.nextPosition == -1) {
                    try {
                        // get our file info
                        let stats = fs.fstatSync(file_fd);
                        logState.length = stats.size;
                        logState.nextPosition = logState.length;
                    }
                    catch(err) {
                        console.log(`Error while attaining nextPosition: ${this.file_path}`);
                        throw err;
                    }
                }
                await this._tailLineByChunk(logState, file_fd, pipeline);
                // finished reading
                if(logState.isReachedBeginning() || logState.isMetMatchesCount) {
                    break;
                }
            }

        }
        catch(err) {
            // call onFailure callback
            pipeline.onFailure(err);
            throw Error(`Error reading file: ${this.file_path}, error: ${err}`)
        }
        finally {
            // close descriptor if was established
            if(file_fd) {
                fs.closeSync(file_fd);
            }

            pipeline.onCompleted();
        }

    }

    /**
     * This is the primary function that handles the file i/o retrieval with direction from the LogBufferedExtractorIfc.
     * Main Logic is included here which consists of:
     *      1.) Opening file
     *      2.) Collecting file stats (particularly, size)
     *      3.) Determine seek position for file reading
     *      4.) State handling for LogBufferedExtractorIfc
     * @param file_fd file descriptor
     * @param pipeline instance
     * @param lastPosition seek pointer
     * @param keywordSearch
     * @param matchCount
     */
    _tailLineByChunk(logState: LogFileReadState, file_fd: number, pipeline: ExtractorPipelineIfc) {

        let bytesToRead = -1;
        let lastPosition = logState.nextPosition;

        // determine how many bytes we will read from this file (honoring max)
        bytesToRead = Math.min(pipeline.buffer_size, LogFileReader.MAX_READ_BYTES_SIZE);

        // determine our seek position. Must be >= 0. Since we are tailing, we will evaluate position starting
        // from the length of the file and work our way backwards while considering our bytesToRead.
        logState.nextPosition = Math.max(logState.nextPosition - bytesToRead, 0);

        /**
         * This block of code will read from the file backwards, in bulk, preserving byte read precision.
         * Pass stream to pipeline for processing.
         */
        try {
            let start = logState.nextPosition;
            let end = lastPosition - 1;
            let readStream = fs.createReadStream('', {fd: file_fd, start: start, end: end, autoClose: false});
            return pipeline.processStream(logState, readStream);

        }
        catch(err) {
            console.error(`Error tailing log: ${this.file_path}`);
            throw err;
        }
    }

};

/**
 * Responsible for handling streaming from file read to http response
 * 
 * onStart() will be called synchronously after file stats are gathered
 * onComplete() will be called after completion of reading file
 * onFailure() will be called in the event of a critical failure (unrecoverable)
 * processByte() is called as stream to write buffer contents (read from file) to http response
 * flushPipe() send line over http request
 * 
 */
 export class HttpExtractorPipeline implements ExtractorPipelineIfc {
    public buffer_size: number;
    
    private res: Response;
    private lineDelimiter: number;
    private readStream: fs.ReadStream | undefined;
    private streams: Array<fs.ReadStream>;
    private keywordSearch: string | undefined;
    private matchCount: number | undefined;
    private matchesCounted: number;
    private firstLineRead: string | undefined;
    private lastLineRead: string | undefined;
    private line: string[];

    
    constructor(res: Response, keywordSearch?: string, matchCount?: number) {
        this.res = res;
        this.buffer_size = runtimeConfig.read_buffer_bytes_size;
        this.lineDelimiter = runtimeConfig.default_line_delimiter.charCodeAt(0);
        this.readStream = undefined;
        this.streams = [];
        this.keywordSearch = keywordSearch;
        this.matchCount = matchCount;
        this.matchesCounted = 0;
        this.firstLineRead = undefined;
        this.lastLineRead = undefined;
        this.line = [];

        // add event listener to resume reading after draining response.
        res.on('drain', () => {
            if(this.readStream) {
                this.readStream.resume();
            }
        });
    }

    getFirstLineRead() {
        return this.firstLineRead;
    }

    getLastLineRead() {
        return this.lastLineRead;
    }

    onCompleted() {
        if(this.isStreamsEnded()) {
            this.res.end();
        }
    }

    onFailure(error: string) {
        console.error('error', error);
        this.res.writeHead(HTTP_RESPONSE_STATUS.INTERNAL_SERVER_ERROR, error).end();
    }

    isMetMatchesCount(): boolean {
        return Boolean(this.matchCount && this.matchesCounted >= this.matchCount);
    }

    /**
     * Contains our logic to detect keywords after our string has been encoded
     * @param readStream 
     * @returns nothing
     */
    flush(readStream: fs.ReadStream, lines: string[]) {

        for(let toWrite of lines) {
            
            if(this.keywordSearch) {
                // we are using keyword search, but ours isn't found in the line
                // or, we met our match count limit
                if(!toWrite.includes(this.keywordSearch) || this.isMetMatchesCount()) {
                    continue;
                }
    
                // we increment our matches counted state
                if(this.matchCount && toWrite.includes(this.keywordSearch)) {
                    this.matchesCounted++;
                }
            }

            // used for ease of testing purposes in this instance
            if(isDebug) {
                let trimmed = toWrite.trim()
                if(trimmed.length > 0 && typeof this.firstLineRead == 'undefined') {
                    this.firstLineRead = toWrite.trim();
                }
                if(trimmed.length > 0) {
                    this.lastLineRead = toWrite.trim();
                }
            }
    
            let result = this.res.write(toWrite);
    
            // is the client not accepting (meaning, backpressure) lets pause and try again
            if(!result) {
                readStream.pause();
                
                setTimeout(() => {
                    readStream.resume();
                }, 1000);
                
            }
        }

    }

    isStreamsEnded() {
        let isStreamsEnded = this.streams.every(stream => stream.readable === false);
        return isStreamsEnded;
    }

    processStream(logState: LogFileReadState, readStream: fs.ReadStream): Promise<number> {
        let me = this;
        this.readStream = readStream;

        return new Promise((resolve, reject) => {
            let lines: string[] = [];
            let bytesRead = 0;

            readStream.on('data', function (chunk: Array<number>) {
                // this is our logic where we crawl backwards byte-by-byte to find
                // our carriage returns and group by lines
                // this offers us ability to reverse the log and see the bottom-up (first)

                for(var i = chunk.length - 1; i >= 0; i--) {
                    
                    let charCode = chunk.at(i);

                    if(charCode) {
                        me.line.push(String.fromCharCode(charCode));
                        bytesRead++;

                        if(charCode == me.lineDelimiter) {
                            lines.push(me.line.reverse().join(''));
                            me.line = [];
                        }
                    }

                }
            });

            readStream.on('error', (err) => reject(err));

            // resolve our promise to inform consumer to continue the read
            // this helps us keep the results in order
            readStream.on('end', function() {

                // if we are at the beginning, lets empty our line variable
                if(logState.nextPosition == 0 && me.line.length > 0) {
                    lines.push(String.fromCharCode(me.lineDelimiter) + me.line.reverse().join(''));
                }

                me.flush(readStream, lines);

                logState.isMetMatchesCount = me.isMetMatchesCount();
            
                resolve(bytesRead);
            });
        });

    }
}

/**
 * Helper function
 * 
 * Validates that our logFilePath is allowed.
 * @param logFilePath 
 * @returns true if the logFilePath provided is a valid argument and is contained within our list of accessible logs.
 */
export function isAccessibleLog(logFilePath: string) {
    if(!logFilePath) {
        return false;
    }

    return getAccessibleLogs().includes(logFilePath);
}

export function readLogFileTailed(logFilePath: string, extractor: ExtractorPipelineIfc) {

    let logReader = new LogFileReader(logFilePath);
    return logReader.tailLines(extractor);
}

export function getAccessibleLogs() {
    let logs: String[] = [];

    let allowedLogLocations = Array(...runtimeConfig.allowed_log_locations);

    if(isDebug) {
        allowedLogLocations.push("test");
    }

    // iterate over our allowed log locations to get our list of valid logs that may be viewed.
    for(let allowedLogLocation of allowedLogLocations) {
        let logFiles = getLogFiles(allowedLogLocation, true);
        for(let logFile of logFiles) {
            logs.push(logFile.toString());
        }
    }
    
    return logs;
}
