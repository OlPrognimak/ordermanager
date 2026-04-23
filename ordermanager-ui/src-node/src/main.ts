import { createApp } from './app';

const { app, env } = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`ordermanager-ui Node backend running on port ${env.port}${env.contextPath}`);
});
