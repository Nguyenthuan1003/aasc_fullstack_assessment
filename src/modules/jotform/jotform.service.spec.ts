import { Test, TestingModule } from '@nestjs/testing';
import { JotformService } from './jotform.service';

describe('JotformService', () => {
  let service: JotformService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JotformService],
    }).compile();

    service = module.get<JotformService>(JotformService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
