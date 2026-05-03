import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const PARAM_META = { type: 'param' as const, metatype: String, data: 'id' };

describe('ParseUUIDPipe', () => {
  let pipe: ParseUUIDPipe;

  beforeEach(() => {
    pipe = new ParseUUIDPipe();
  });

  it('passes a valid UUID v4 through unchanged', async () => {
    const result = await pipe.transform(VALID_UUID, PARAM_META);
    expect(result).toBe(VALID_UUID);
  });

  it('throws BadRequestException for a plain string', async () => {
    await expect(pipe.transform('not-a-uuid', PARAM_META)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for an empty string', async () => {
    await expect(pipe.transform('', PARAM_META)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for a numeric string', async () => {
    await expect(pipe.transform('12345', PARAM_META)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for a malformed UUID (missing segment)', async () => {
    await expect(
      pipe.transform('550e8400-e29b-41d4-a716', PARAM_META),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for a UUID v1 when version is fixed to 4', async () => {
    const pipeV4 = new ParseUUIDPipe({ version: '4' });

    await expect(
      pipeV4.transform('6ba7b810-9dad-11d1-80b4-00c04fd430c8', PARAM_META),
    ).rejects.toThrow(BadRequestException);
  });
});
