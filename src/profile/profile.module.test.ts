import { LoggerMiddleware } from './profile.module';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    mockRequest = { method: 'GET', originalUrl: '/test' };
    mockResponse = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          (mockResponse as any)._finishCallback = callback;
        }
        return mockResponse as Response;
      }),
    };
    nextFunction = jest.fn();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call next() to continue the request pipeline', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should attach a listener to the response finish event', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log correct message with timestamp, method, path, status, and response time', () => {
    jest.spyOn(global.Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1150);
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-01-01T00:00:00.000Z');

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    (mockResponse as any)._finishCallback();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      '2025-01-01T00:00:00.000Z GET /test 200 150ms'
    );
  });

  it('should log correctly for a different HTTP method (POST)', () => {
    mockRequest.method = 'POST';
    mockRequest.originalUrl = '/api/data';
    jest.spyOn(global.Date, 'now').mockReturnValueOnce(2000).mockReturnValueOnce(2100);
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-02-02T12:00:00.000Z');

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    (mockResponse as any)._finishCallback();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      '2025-02-02T12:00:00.000Z POST /api/data 200 100ms'
    );
  });

  it('should handle missing request properties gracefully by logging undefined values', () => {
    mockRequest.method = undefined;
    jest.spyOn(global.Date, 'now').mockReturnValueOnce(500).mockReturnValueOnce(600);
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-03-03T00:00:00.000Z');

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    (mockResponse as any)._finishCallback();

    expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('undefined'));
  });
});