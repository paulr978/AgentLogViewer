import {describe, expect, test} from '@jest/globals';
import * as utils from '../../src/modules/io/utils';
import * as fs from 'fs' 
import * as axios from 'axios';


let logFileName = 'test/test_1mb.log';
let sourceLogData: string;
let sourceLogLines: string[];

beforeAll(() => {
  utils.createTestLog(logFileName, 1);
  sourceLogData = fs.readFileSync(logFileName, 'utf8');
  sourceLogLines = sourceLogData.split('\n');
});


test('test log list', async () => {
  const response = await axios.default.get('http://localhost:3000/logs/list');
  let logsList = response.data.data;

  expect(logsList.length).toBeGreaterThan(0);

});

test('test 1mb log read', async () => {
  const response = await axios.default.get(`http://localhost:3000/log/tail?fileName=${logFileName}`);

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
  const response = await axios.default.get(`http://localhost:3000/log/tail?fileName=${logFileName}&search=${keyword}`);

  let lines: string[] = response.data.split('\n');

  var expectedCount = sourceLogLines.filter(line => line.includes(keyword)).length;
  let actualCount = lines.filter(line => line.includes(keyword)).length;

  expect(actualCount).toBe(expectedCount);

});

test('test keyword log read + count', async () => {
  let keyword = '777';
  let count = 5;
  const response = await axios.default.get(`http://localhost:3000/log/tail?fileName=${logFileName}&search=${keyword}&count=${count}`);

  let lines: string[] = response.data.split('\n');

  var expectedCount = sourceLogLines.filter(line => line.includes(keyword)).length;
  let actualCount = lines.filter(line => line.includes(keyword)).length;

  expect(actualCount).toEqual(count);

});