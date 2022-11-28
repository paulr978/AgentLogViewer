import * as os from "os";
import * as fs from "fs";
import path from 'path';


export function getLogFiles(dir_path: string, isRecursive: boolean = true) {
    
    if(!fs.statSync(dir_path).isDirectory()) {
        throw new Error(`Invalid directory specified: ${dir_path}`);
    }

    return _getLogFiles(dir_path, new Array<fs.PathLike>(), isRecursive);
}

function _getLogFiles(dir_path: string, logFiles: fs.PathLike[], isRecursive: boolean = true) {

    fs.readdirSync(dir_path, { withFileTypes: true }).forEach((file: fs.Dirent) => {
        let filePath = path.join(dir_path, file.name);

        if(isRecursive && file.isDirectory()) {
            _getLogFiles(filePath, logFiles, isRecursive);
        }

        logFiles.push(filePath);
    });

    return logFiles;
}

export function createTestLog(fileName: string, mbBytesLength: number) {

    let lineLength = 64;

    return new Promise((resolve, reject) => {
        fs.writeFileSync(fileName, '');

        let fh = fs.openSync(fileName, 'a');

        let firstLine = '!FIRST LINE!\n';
        fs.appendFileSync(fileName, firstLine);

        let current_bytes = 0;
        let buffer = Buffer.alloc(1024 * 1024 * mbBytesLength);
        let index = 0;
        
        while(current_bytes < buffer.length) {
          
            let line = index + ' ' + [...new Array(lineLength)].map(() => 'A') + os.EOL;
            try {
                buffer.fill(line, current_bytes);
                current_bytes += line.length;

                index++;
            }
            catch(err) {
                // its ok
            }
        }

        fs.appendFileSync(fileName, buffer.toString());

        let lastLine = '\n!LAST LINE!\n';
        fs.appendFileSync(fileName, lastLine);

        fs.closeSync(fh);

        resolve(true);
    });
};

  // Create a file of 1 GiB
  //createEmptyFileOfSize('largeLogFileName', 1024*1024);