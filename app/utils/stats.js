import StatsD from 'hot-shots';

const statsd = new StatsD({
  host: process.env.STATSD_HOST || '127.0.0.1',
  port: parseInt(process.env.STATSD_PORT) || 8125,
  prefix: 'app.',
  errorHandler: (error) => {
    console.error('StatsD error: ', error);
  }
});

export default statsd;
