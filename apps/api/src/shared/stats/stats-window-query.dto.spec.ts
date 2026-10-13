import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { daysAgo } from './stats';
import { StatsWindowQueryDto } from './stats-window-query.dto';

const parse = (query: Record<string, unknown>) =>
  plainToInstance(StatsWindowQueryDto, query);

describe('StatsWindowQueryDto', () => {
  it('accepts a missing since', async () => {
    expect(await validate(parse({}))).toHaveLength(0);
  });

  it('transforms an ISO string into a Date', async () => {
    const since = daysAgo(30).toISOString();
    const dto = parse({ since });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.since).toEqual(new Date(since));
  });

  it.each([
    ['garbage', 'not-a-date'],
    ['older than the maximum window', daysAgo(366).toISOString()],
    ['in the future', daysAgo(-1).toISOString()],
  ])('rejects a since that is %s', async (_label, since) => {
    expect(await validate(parse({ since }))).not.toHaveLength(0);
  });
});
