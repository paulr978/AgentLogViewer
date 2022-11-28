import {describe, expect, test} from '@jest/globals';
import * as utils from '../../src/modules/io/utils';
import * as http from 'http';
import * as axios from 'axios';


// helper function to test requests for log retrieval
async function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let request = http.get(url, (res) => {
      if (res.statusCode == 200) {

        let data = '';

        res.on('data', (chunk) => {
          //console.log(chunk.toString());
          data += chunk.toString();
        });
      
        res.on('end', () => {
          resolve(data);
        });

      }
      else {
        reject('invalid request');
      }
    });

    request.on('error', (err) => {
      reject(err)
    })
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('timed out'))
    })
  });

}

test('test log list', async () => {
  let output = await get('http://localhost:3000/logs/list');
  let logsList = JSON.parse(output).data;

  expect(logsList.length).toBeGreaterThan(0);

});


test('test 1mb log read', async () => {
  let logFileName = 'test/test_1mb.log';

  utils.createTestLog(logFileName, 1);

  const response = await axios.default.get(`http://localhost:3000/log/tail?fileName=${logFileName}`);

  let lines = response.data.split('\n');

  let actualTail = lines[0];
  let expectedTail = '!LAST LINE!';

  let actualHead = lines[lines.length - 2];
  let expectedHead = '!FIRST LINE!';

  expect(actualTail).toBe(expectedTail);
  expect(actualHead).toBe(expectedHead);

});

test('test 500mb log read', async () => {
  let logFileName = 'test/test_500mb.log';

  utils.createTestLog(logFileName, 1);

  const response = await axios.default.get(`http://localhost:3000/log/tail?fileName=${logFileName}`);

  let lines = response.data.split('\n');

  let actualTail = lines[0];
  let expectedTail = '!LAST LINE!';

  let actualHead = lines[lines.length - 2];
  let expectedHead = '!FIRST LINE!';

  expect(actualTail).toBe(expectedTail);
  expect(actualHead).toBe(expectedHead);

});
