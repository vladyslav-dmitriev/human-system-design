import {
  DEFAULT_JOB_OPTIONS,
  QUEUE,
  QUEUE_JOB,
  getBullConnection,
} from './queue.config';

describe('queue config', () => {
  it('parses a plain redis URL', () => {
    expect(getBullConnection('redis://localhost:6380')).toMatchObject({
      host: 'localhost',
      port: 6380,
      maxRetriesPerRequest: null,
    });
  });

  it('parses credentials and db, enables TLS for rediss://', () => {
    expect(
      getBullConnection('rediss://user:p%40ss@redis.example:6379/2'),
    ).toMatchObject({
      host: 'redis.example',
      username: 'user',
      password: 'p@ss',
      db: 2,
      tls: {},
    });
  });

  it('default port is 6379', () => {
    expect(getBullConnection('redis://redis').port).toBe(6379);
  });

  it('jobs retry with exponential backoff and failed jobs are kept for review', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBeGreaterThan(1);
    expect(DEFAULT_JOB_OPTIONS.backoff).toMatchObject({ type: 'exponential' });
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toBeTruthy();
  });

  it('every queue has job names', () => {
    for (const name of Object.values(QUEUE)) {
      expect(Object.keys(QUEUE_JOB[name]).length).toBeGreaterThan(0);
    }
  });
});
