import { ArticleModule, LoggerMiddleware } from './article.module';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

class MockResponse extends EventEmitter {
  statusCode = 200;
}

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let req: any;
  let res: any;
  let next: jest.Mock;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    req = {
      method: 'GET',
      originalUrl: '/articles/feed',
    };

    const mockResponse = new MockResponse();
    res = mockResponse;
    res.on = mockResponse.on.bind(mockResponse);
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() immediately', () => {
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should not call logger.log before response finishes', () => {
    middleware.use(req, res, next);
    expect(loggerLogSpy).not.toHaveBeenCalled();
  });

  it('should log the correct format when response finishes', () => {
    const startTime = Date.now();
    jest.spyOn(Date, 'now').mockReturnValueOnce(startTime).mockReturnValueOnce(startTime + 123);

    middleware.use(req, res, next);

    // emit finish event
    res.emit('finish');

    expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    const logCall = loggerLogSpy.mock.calls[0][0];
    expect(logCall).toMatch(
      new RegExp(
        `\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z \\| GET \\| /articles/feed \\| 200 \\| 123ms`
      )
    );
  });

  it('should log response time as a number in milliseconds', () => {
    const startTime = 1000;
    jest.spyOn(Date, 'now').mockReturnValueOnce(startTime).mockReturnValueOnce(startTime + 456);

    middleware.use(req, res, next);
    res.emit('finish');

    expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    const logCall = loggerLogSpy.mock.calls[0][0];
    // extract the elapsed part before 'ms'
    const match = logCall.match(/\| (\d+)ms/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBe(456);
  });

  it('should handle missing originalUrl gracefully', () => {
    req.originalUrl = undefined;

    const startTime = 0;
    jest.spyOn(Date, 'now').mockReturnValueOnce(startTime).mockReturnValueOnce(startTime + 10);

    middleware.use(req, res, next);
    res.emit('finish');

    expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    const logCall = loggerLogSpy.mock.calls[0][0];
    expect(logCall).toContain('| undefined |');
  });

  it('should not crash if logger.log throws an error', () => {
    loggerLogSpy.mockImplementation(() => {
      throw new Error('Logging failed');
    });

    expect(() => {
      middleware.use(req, res, next);
      res.emit('finish');
    }).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});

describe('ArticleModule', () => {
  it('should apply LoggerMiddleware to all routes before AuthMiddleware on specific routes', () => {
    const module = new ArticleModule();
    const consumer = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };

    module.configure(consumer as any);

    // First chain: apply should be called with LoggerMiddleware
    expect(consumer.apply).toHaveBeenNthCalledWith(1, LoggerMiddleware);
    expect(consumer.forRoutes).toHaveBeenNthCalledWith(1, '*');

    // Second chain: apply should be called with AuthMiddleware
    expect(consumer.apply).toHaveBeenNthCalledWith(2, expect.any(Function)); // AuthMiddleware is imported

    // forRoutes should be called with an array of specific routes
    const forRoutesCall = consumer.forRoutes.mock.calls[1][0];
    expect(Array.isArray(forRoutesCall)).toBe(true);
    expect(forRoutesCall).toHaveLength(8);

    const expectedRoutes = [
      { path: 'articles/feed', method: 0 },
      { path: 'articles', method: 1 },
      { path: 'articles/:slug', method: 2 },
      { path: 'articles/:slug', method: 3 },
      { path: 'articles/:slug/comments', method: 1 },
      { path: 'articles/:slug/comments/:id', method: 2 },
      { path: 'articles/:slug/favorite', method: 1 },
      { path: 'articles/:slug/favorite', method: 2 },
    ];

    expect(forRoutesCall).toEqual(expectedRoutes.map(r => ({
      path: r.path,
      method: r.method,
    })));
  });
});