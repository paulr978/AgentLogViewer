import {describe, expect, test} from '@jest/globals';
import * as utils from '../../src/modules/io/utils';
import * as fs from 'fs' 
import axios, { isCancel, AxiosError } from 'axios';



let logFileName = 'test/test_1mb.log';
let sourceLogData: string;
let sourceLogLines: string[];

beforeAll(() => {
  utils.createTestLog(logFileName, 1);
  sourceLogData = fs.readFileSync(logFileName, 'utf8');
  sourceLogLines = sourceLogData.split('\n');
});


test('test log list', async () => {
  const response = await axios.get('http://localhost:3000/logs/list');
  let logsList = response.data.data;

  expect(logsList.length).toBeGreaterThan(0);

});

test('test 1mb log read', async () => {
  const response = await axios({ 
    method: 'get',
    decompress: false,
    params: {
      fileName: logFileName
    },
    url: `http://localhost:3000/log/tail`,
    headers: { 'x-hop': -1 } 
  });

  let lines = response.data.split('\n');

  let actualTail = lines[0] + lines[1];
  let expectedTail = sourceLogLines[sourceLogLines.length - 1];

  let actualHead = lines[lines.length - 1];
  let expectedHead = sourceLogLines[0];

  expect(actualTail).toBe(expectedTail);
  expect(actualHead).toBe(expectedHead);

});

test('test keyword log read', async () => {
  let keyword = '777';
  const response = await axios({ 
    method: 'get',
    decompress: false,
    params: {
      fileName: logFileName,
      search: keyword
    },
    url: `http://localhost:3000/log/tail`,
    headers: { 'x-hop': -1 } 
  });

  let lines: string[] = response.data.split('\n');

  var expectedCount = sourceLogLines.filter(line => line.includes(keyword)).length;
  let actualCount = lines.filter(line => line.includes(keyword)).length;

  expect(actualCount).toBe(expectedCount);

});

test('test keyword log read + count', async () => {
  let keyword = '777';
  let count = 5;
  const response = await axios({ 
    method: 'get',
    decompress: false,
    params: {
      fileName: logFileName,
      search: keyword,
      count: count
    },
    url: `http://localhost:3000/log/tail`,
    headers: { 'x-hop': -1 } 
  });

  let lines: string[] = response.data.split('\n');

  var expectedCount = sourceLogLines.filter(line => line.includes(keyword)).length;
  let actualCount = lines.filter(line => line.includes(keyword)).length;

  expect(actualCount).toEqual(count);

});

/**
 * Evaluates the inside contents of the log that was buffered, to ensure byte precision
 */
test('test thorough log read', async () => {
  const response = await axios({ 
    method: 'get',
    decompress: false,
    params: {
      fileName: logFileName,
    },
    url: `http://localhost:3000/log/tail`,
    headers: { 'x-hop': -1 } 
  });

  let lines: string[] = response.data.split('\n');

  var expectedLines = sourceLogLines.filter(line => line.trim().length > 0 && (!line.includes('FIRST') || !line.includes('LAST')));
  let actualLines = lines.filter(line => line.trim().length > 0 && (!line.includes('FIRST') || !line.includes('LAST')));

  expect(actualLines.length).toEqual(expectedLines.length);

  for(let i = 0; i < expectedLines.length; i++) {
    let t = expectedLines.length - 1 - i;

    expect(actualLines[t]).toBe(expectedLines[i]);
  }

});