import { Agent } from './core/app';
import process from 'process';
import { DEFAULT_APP_LISTEN_PORT } from './core/defaults'

const port = process.env.APP_LISTEN_PORT || DEFAULT_APP_LISTEN_PORT;

const app = new Agent().app;

app.listen(port, () => {
  console.log(`Log Tailer Agent is running on port ${port}`);
});
