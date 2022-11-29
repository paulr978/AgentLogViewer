const shortLogContents = "test1\ntest2\ntest3\ntest4";

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

import {describe, expect, test} from '@jest/globals';
import { Readable } from 'stream';
import * as fs from 'fs' 
import * as io from '../../src/modules/io/service';
import { getMockReq, getMockRes } from '@jest-mock/express'


test('test log tail & head', async () => {

  let logData = fs.readFileSync('__FAKE__', 'utf8');
  let logDataLines = logData.split('\n');

  const { res } = getMockRes();

  let pipeline = new io.HttpExtractorPipeline(res, undefined, undefined);

  await io.readLogFileTailed('__FAKE__', pipeline);

  let expectedHead = logDataLines[0];
  let actualHead = pipeline.getLastLineRead();

  let expectedTail = logDataLines[logDataLines.length - 1];
  let actualTail = pipeline.getFirstLineRead();

  expect(actualTail).toBe(expectedTail);
  expect(actualHead).toBe(expectedHead);

});
