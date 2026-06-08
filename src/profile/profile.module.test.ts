import { Test, TestingModule } from '@nestjs/testing';
import { ProfileModule, PingController } from './profile.module';

describe('ProfileModule', () => {
  it('should be defined', () => {
    const module = new ProfileModule();
    expect(module).toBeDefined();
  });

  it('should configure middlewares without error', () => {
    const module = new ProfileModule();
    const mockConsumer = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
    expect(() => module.configure(mockConsumer as any)).not.toThrow();
    expect(mockConsumer.apply).toHaveBeenCalledTimes(2);
    expect(mockConsumer.forRoutes).toHaveBeenCalledTimes(2);
  });
});

describe('PingController', () => {
  let controller: PingController;

  beforeEach(() => {
    controller = new PingController();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return "pong"', () => {
    expect(controller.ping()).toBe('pong');
  });

  it('should consistently return "pong" on multiple calls', () => {
    for (let i = 0; i < 100; i++) {
      expect(controller.ping()).toBe('pong');
    }
  });
});