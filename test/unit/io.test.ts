const shortLogContents = "test1\ntest2\ntest3\ntest4";

import {describe, expect, test} from '@jest/globals';
import { Readable } from 'stream';
import * as fs from 'fs' 
import * as io from '../../src/modules/io/service';
import { getMockReq, getMockRes } from '@jest-mock/express'


/// MOCKING ///

function getCharCodes(s: string) {
  let charCodeArr = [];
  
  for(let i = 0; i < s.length; i++){
      let code = s.charCodeAt(i);
      charCodeArr.push(code);
  }
  
  return charCodeArr;
}

// mock some fs functions for testing purposes
jest.mock("fs", () => ({
  openSync: jest.fn().mockReturnValue(9),
  readFileSync: jest.fn().mockReturnValue(shortLogContents),
  createReadStream: jest.fn().mockReturnValue(Readable.from([getCharCodes(shortLogContents)])),
  statSync: jest.fn().mockReturnValue({
      size: 10,
      isDirectory: jest.fn().mockReturnValue(true),
  }),
  fstatSync: jest.fn().mockReturnValue({
    size: 10,
    isDirectory: jest.fn().mockReturnValue(true),
  }),
  readdirSync: jest.fn().mockReturnValue([{
    name: 'dpkg.log',
    isDirectory: jest.fn().mockReturnValue(false)
  }])
}));


test('test log tail & head', async () => {

  let logData = fs.readFileSync('__FAKE__', 'utf8');
  let logDataLines = logData.split('\n');

  const { res } = getMockRes();

  let pipeline = new io.HttpExtractorPipeline(res, undefined, undefined, true);

  await io.readLogFileTailed('__FAKE__', pipeline);

  let expectedHead = logDataLines[0];
  let actualHead = pipeline.getLastLineRead();

  let expectedTail = logDataLines[logDataLines.length - 1];
  let actualTail = pipeline.getFirstLineRead();

  expect(actualTail).toBe(expectedTail);
  expect(actualHead).toBe(expectedHead);

});

/*
test('1 large artificial live log retrieval', () => {


  let largeLogFileName = 'test/temp_test_agent_large_log_file.log';
  let max_size_bytes = 1024 * 1024 * 75;
  let bytesSize = 1024;
  let current_bytes = 0;
  let index = 0;
  let chunk = 0;


  const createEmptyFileOfSize = (fileName: string, size: number) => {

    return new Promise((resolve, reject) => {
        fs.writeFileSync(fileName, '');
        
        let lines = '';

        let fh = fs.openSync(fileName, 'a');

        let firstLine = '!FIRST LINE! abcdef123456 AAA BBB ZZZ ' + [...new Array(16)].map(() => 'A') +  '\n';
        fs.appendFileSync(fileName, firstLine);

        while(current_bytes < max_size_bytes) {
          
          while(chunk < 100) {
            let line = index++ + ' abcdef123456 AAA BBB ZZZ ' + [...new Array(16)].map(() => 'A') +  '\n';
            lines += line;
            current_bytes += bytesSize;
            chunk++;
          }
          chunk = 0;
          index++;
          

          fs.appendFileSync(fileName, lines);
        }

        let lastLine = '!LAST LINE! abcdef123456 AAA BBB ZZZ ' + [...new Array(16)].map(() => 'A') +  '\n';
        fs.appendFileSync(fileName, lastLine);

        fs.closeSync(fh);

        resolve(true);
    });
  };

  // Create a file of 1 GiB
  createEmptyFileOfSize('largeLogFileName', 1024*1024);

  const { res } = getMockRes();

  readLogFileTailed(String(largeLogFileName), new HttpExtractorPipeline(res));


});
*/


/*
test('large artificial live log retrieval', () => {

  async function writeLargeLog() {
    let wstream = fs.createWriteStream('temp/test_agent_large_log_file.log', {flags: 'w'});
    let max_size_bytes = 1000 * 1000 * 1000;
    let bytesSize = 1024;
    let current_bytes = 0;
    let index = 0;

    async function write() {
        return new Promise((resolve, reject) => {
            wstream.on('finish', function() {
                resolve('complete');
            });
            wstream.on('error', reject);
        });
    }

    wstream.on('open', function(fd) {
      while(current_bytes < max_size_bytes) {
        //console.log('writing bytes', current_bytes);
        let filledArray = [...new Array(bytesSize)].map(() => 'A');
        //console.log('writing stream', index + ' ' + filledArray + '\n');
        wstream.write(index + ' ' + filledArray + '\n');
        current_bytes += bytesSize;
        index++;
      }
    
      wstream.end();
    });

    await write();

    console.log(`----- WRITING COMPLETE -----`);

  }

  writeLargeLog().then(() => {
      console.log("done");
  }).catch(err => {
      console.log(err);
  });


  //const data = fs.readFileSync('/var/log/dpkg.log', 'utf8');

  //expect(1 + 1).toBe(2);
});
*/