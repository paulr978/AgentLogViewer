import { ReadStream } from "fs";

export interface ExtractorPipelineIfc {
    buffer_size: number;
    
    processStream(logState: LogFileReadState, readStream: ReadStream): Promise<LogFileReadState>;
    onFailure(error: any): void;
    onCompleted(): void;
}

export interface BufferedLogTailerIfc {
    tailLines(extractor: ExtractorPipelineIfc): void;
}

export class LogFileReadState {
    length: number;
    nextPosition: number;
    isMetMatchesCount: boolean;

    constructor() {
        this.nextPosition = -1;
        this.length = -1;
        this.isMetMatchesCount = false;
    }

    isReachedBeginning() {
        return this.nextPosition == 0;
    }
}
