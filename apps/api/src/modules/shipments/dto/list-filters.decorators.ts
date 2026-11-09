import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const MAX_SEARCH_LENGTH = 100;

export const ViewQuery = (views: readonly string[]) =>
  applyDecorators(
    ApiPropertyOptional({ enum: views }),
    IsOptional(),
    IsIn(views),
  );

// A blank search is no search, not a 400.
export const SearchQuery = () =>
  applyDecorators(
    ApiPropertyOptional({
      maxLength: MAX_SEARCH_LENGTH,
      description:
        'Tracking code or city (contains, case-insensitive) or zip prefix (3+ digits)',
    }),
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim() || undefined : value,
    ),
    IsOptional(),
    IsString(),
    MaxLength(MAX_SEARCH_LENGTH),
  );
