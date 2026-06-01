import { LoggerMiddleware, ProfileModule } from './profile.module';
import { Request, Response, NextFunction } from 'express';
import { MiddlewareConsumer } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

describe('LoggerMiddleware', () => {
  let logSpy: jest.SpyInstance;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response> & EventEmitter;
  let nextFunction: jest.Mock<NextFunction>;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
    };
    mockResponse = new EventEmitter() as Partial<Response> & EventEmitter;
    mockResponse.statusCode = 200;
    nextFunction = jest.fn();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('calls next function', () => {
    const middleware = new LoggerMiddleware();
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('logs request method, URI, status and response time on finish', () => {
    const middleware = new LoggerMiddleware();
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
    mockResponse.emit('finish');
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/GET \/test 200 \d+ms/));
  });

  it('handles missing request properties gracefully', () => {
    const middleware = new LoggerMiddleware();
    mockRequest = { method: undefined, originalUrl: undefined };
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
    mockResponse.emit('finish');
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/undefined undefined 200 \d+ms/));
  });

  it('does not log if response never finishes', () => {
    const middleware = new LoggerMiddleware();
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
    // no finish event emitted
    expect(logSpy).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next()', () => {
    middleware.use(request as Request, response as Response, next);
    expect(next).toHaveBeenCalled();
  });

  beforeEach(() => {
    module = new ProfileModule();
    mockConsumer = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<MiddlewareConsumer>;
  });

  it('applies LoggerMiddleware to all routes', () => {
    module.configure(mockConsumer);
    expect(mockConsumer.apply).toHaveBeenCalledWith(LoggerMiddleware);
    expect(mockConsumer.forRoutes).toHaveBeenCalledWith({ path: '*', method: expect.any(Number) });
  });

  it('applies AuthMiddleware to the follow route', () => {
    module.configure(mockConsumer);
    expect(mockConsumer.apply).toHaveBeenCalledWith(expect.any(Function)); // first call: LoggerMiddleware
    expect(mockConsumer.forRoutes).toHaveBeenCalledWith({ path: 'profiles/:username/follow', method: expect.any(Number) });
  });

  it('configures middlewares in the correct order', () => {
    module.configure(mockConsumer);
    const applyCalls = (mockConsumer.apply as jest.Mock).mock.calls;
    const forRoutesCalls = (mockConsumer.forRoutes as jest.Mock).mock.calls;
    // First pair: LoggerMiddleware -> all routes
    expect(applyCalls[0][0]).toBe(LoggerMiddleware);
    expect(forRoutesCalls[0][0]).toEqual({ path: '*', method: expect.any(Number) });
    // Second pair: AuthMiddleware -> specific route
    expect(applyCalls[1][0]).toBeDefined(); // imported AuthMiddleware, can check by name or directly
    expect(forRoutesCalls[1][0]).toEqual({ path: 'profiles/:username/follow', method: expect.any(Number) });
  });
});