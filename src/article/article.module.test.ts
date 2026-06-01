import { LoggerMiddleware } from './article.module';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    // Spy on the logger instance's log method
    logSpy = jest.spyOn((middleware as any).logger, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log request on finish event with correct format (happy path)', () => {
    const req = { method: 'GET', path: '/articles/123' };
    const res = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') callback();
      }),
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| GET \| \/articles\/123 \| 200 \| \d+ms/
    );
  });

  it('should log error status code when response has status >= 400 (error path)', () => {
    const req = { method: 'POST', path: '/articles' };
    const res = {
      statusCode: 500,
      on: jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') callback();
      }),
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| POST \| \/articles \| 500 \| \d+ms/
    );
  });

  it('should log request path without query string even if original URL contained one (edge case)', () => {
    // Simulate req.path (without query) and req.originalUrl (with query)
    const req = { method: 'GET', path: '/articles', originalUrl: '/articles?page=2' };
    const res = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') callback();
      }),
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toMatch(/\| GET \| \/articles \| 200 \| \d+ms/);
    expect(logMessage).not.toContain('?page=2');
    // Also ensure the original URL is not logged
    expect(logMessage).not.toContain('/articles?page=2');
  });
});