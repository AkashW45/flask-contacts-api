import {
  Logger,
  RequestMethod,
} from '@nestjs/common';
import { LoggingMiddleware } from './user.module';
import { UserModule } from './user.module';
import { AuthMiddleware } from './auth.middleware';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on Logger.prototype.log before creating the middleware
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    middleware = new LoggingMiddleware();

    // Use fake timers to control Date.now() and new Date()
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    logSpy.mockRestore();
  });

  function createMockResponse() {
    let finishCallback: () => void;
    const res = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') {
          finishCallback = cb;
        }
        return res;
      }),
      statusCode: 200,
    };
    return { res, triggerFinish: () => finishCallback?.() };
  }

  it('should log the request details with timestamp, method, url, status and elapsed time on response finish', () => {
    const { res, triggerFinish } = createMockResponse();
    const req = {
      method: 'GET',
      originalUrl: '/user/1',
    };
    const next = jest.fn();

    const startTime = 1627856400000; // some fixed timestamp
    jest.setSystemTime(startTime);
    // Call middleware
    middleware.use(req as any, res as any, next);
    // Advance time slightly
    jest.advanceTimersByTime(42);
    // Trigger the finish event
    res.statusCode = 200;
    triggerFinish();

    // The log call should have happened now
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        // Expected format: "2021-08-01T22:20:00.000Z GET /user/1 200 42ms"
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z GET \/user\/1 200 42ms/
      )
    );
    expect(next).toHaveBeenCalled();
  });

  it('should call next() even before the response finishes', () => {
    const { res } = createMockResponse();
    const req = { method: 'POST', originalUrl: '/user' };
    const next = jest.fn();
    middleware.use(req as any, res as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should log the timestamp in valid ISO 8601 format', () => {
    const { res, triggerFinish } = createMockResponse();
    const req = { method: 'DELETE', originalUrl: '/user/99' };
    middleware.use(req as any, res as any, {} as any);
    triggerFinish();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logMessage = logSpy.mock.calls[0][0];
    // Extract timestamp (first part before space)
    const timestamp = logMessage.split(' ')[0];
    expect(() => new Date(timestamp)).not.toThrow();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('should correctly log different HTTP methods and status codes', () => {
    const { res, triggerFinish } = createMockResponse();
    const req = { method: 'PUT', originalUrl: '/user/42' };
    res.statusCode = 201;
    middleware.use(req as any, res as any, {} as any);
    triggerFinish();

    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toMatch(/PUT \/user\/42 201 \d+ms$/);
  });
});

describe('UserModule', () => {
  let module: UserModule;

  beforeEach(() => {
    module = new UserModule();
  });

  it('should apply LoggingMiddleware to all routes (*)', () => {
    const consumer: any = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };

    module.configure(consumer);

    expect(consumer.apply).toHaveBeenCalledWith(LoggingMiddleware);
    expect(consumer.forRoutes).toHaveBeenCalledWith('*');
  });

  it('should apply AuthMiddleware to GET and PUT on "user" path', () => {
    const consumer: any = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };

    module.configure(consumer);

    // The calls: first apply(LM) then forRoutes('*'), then apply(AuthM) then forRoutes(...)
    expect(consumer.apply).toHaveBeenNthCalledWith(2, AuthMiddleware);
    expect(consumer.forRoutes).toHaveBeenNthCalledWith(
      2,
      { path: 'user', method: RequestMethod.GET },
      { path: 'user', method: RequestMethod.PUT }
    );
  });
});