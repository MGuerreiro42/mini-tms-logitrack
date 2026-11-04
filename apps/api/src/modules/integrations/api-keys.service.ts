import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ApiKey,
  ApprovalStatus,
  GlobalRole,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { API_KEY_PREFIX, generateApiKey, hashApiKey } from './api-key';
import type {
  ApiKeyResponseDto,
  CreatedApiKeyResponseDto,
} from './dto/api-key-response.dto';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';

export interface ApiKeyIdentity {
  apiKeyId: string;
  user: AuthenticatedUser;
}

// Last use is shown to the minute; writing it on every call would update the same row per request.
const LAST_USED_PRECISION_MS = 60_000;

const isStale = (lastUsedAt: Date | null) =>
  !lastUsedAt || Date.now() - lastUsedAt.getTime() > LAST_USED_PRECISION_MS;

const toApiKeyResponseDto = (apiKey: ApiKey): ApiKeyResponseDto => ({
  id: apiKey.id,
  name: apiKey.name,
  prefix: apiKey.prefix,
  lastUsedAt: apiKey.lastUsedAt,
  createdAt: apiKey.createdAt,
});

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResponseDto> {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    if (seller.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Only an approved seller can create API keys',
      );
    }

    const { key, prefix, hash } = generateApiKey();
    const apiKey = await this.prisma.apiKey.create({
      data: { sellerId: seller.id, name: dto.name, prefix, hash },
    });
    return { ...toApiKeyResponseDto(apiKey), key };
  }

  async findAll(userId: string): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { seller: { userId }, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return apiKeys.map(toApiKeyResponseDto);
  }

  async revoke(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.apiKey.updateMany({
      where: { id, seller: { userId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  async authenticate(key: string): Promise<ApiKeyIdentity | null> {
    if (!key.startsWith(API_KEY_PREFIX)) return null;
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { hash: hashApiKey(key) },
      include: {
        seller: { select: { user: { select: { id: true, email: true } } } },
      },
    });
    if (!apiKey || apiKey.revokedAt) return null;

    if (isStale(apiKey.lastUsedAt)) {
      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });
    }
    const { id, email } = apiKey.seller.user;
    return {
      apiKeyId: apiKey.id,
      user: { id, email, role: GlobalRole.SELLER },
    };
  }
}
