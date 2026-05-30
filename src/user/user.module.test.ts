import { Test, TestingModule } from '@nestjs/testing';
import { UserModule } from './user.module';
import { AuthMiddleware } from './auth.middleware';
import { RequestMethod } from '@nestjs/common';
import { MiddlewareConsumer } from '@nestjs/common/interfaces';

// Mock console.log to avoid noise during tests
const originalLog = console.log;

describe('UserModule', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    console.log = originalLog;
  });

  it('should be defined', () => {
    expect(UserModule).toBeDefined();
  });

  it('should apply requestLogger and AuthMiddleware for GET /user', () => {
    const module = new UserModule();
    const applySpy = jest.fn().mockReturnThis();
    const forRoutesSpy = jest.fn();
    const mockConsumer: MiddlewareConsumer = {
      apply: applySpy,
      forRoutes: forRoutesSpy,
    } as any;

    module.configure(mockConsumer);

    expect(applySpy).toHaveBeenCalledWith(
      expect.any(Function), // requestLogger
      AuthMiddleware,
    );
    expect(forRoutesSpy).toHaveBeenCalledWith(
      { path: 'user', method: RequestMethod.GET },
      { path: 'user', method: RequestMethod.PUT },
    );
  });

  it('should preserve middleware order (requestLogger before AuthMiddleware)', () => {
    const module = new UserModule();
    const applySpy = jest.fn().mockReturnThis();
    const forRoutesSpy = jest.fn();
    const mockConsumer: MiddlewareConsumer = {
      apply: applySpy,
      forRoutes: forRoutesSpy,
    } as any;

    module.configure(mockConsumer);

    const appliedMiddlewares = applySpy.mock.calls[0];
    expect(appliedMiddlewares[0]).toEqual(expect.any(Function));
    expect(appliedMiddlewares[1]).toBe(AuthMiddleware);
  });

  it('should only configure middleware for GET and PUT routes', () => {
    const module = new UserModule();
    const forRoutesSpy = jest.fn();
    const mockConsumer: MiddlewareConsumer = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: forRoutesSpy,
    } as any;

    module.configure(mockConsumer);

    const routes = forRoutesSpy.mock.calls[0];
    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({ path: 'user', method: RequestMethod.GET });
    expect(routes[1]).toMatchObject({ path: 'user', method: RequestMethod.PUT });
  });
});