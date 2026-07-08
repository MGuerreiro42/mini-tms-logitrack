import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateSellerDto } from './dto/create-seller.dto';
import type { SellerResponseDto } from './dto/seller-response.dto';

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(dto: CreateSellerDto): Promise<SellerResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const seller = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            role: 'SELLER',
          },
        });

        return tx.seller.create({
          data: {
            userId: user.id,
            companyName: dto.companyName,
            document: dto.document,
          },
        });
      });

      return {
        id: seller.id,
        email: dto.email,
        companyName: seller.companyName,
        document: seller.document,
        status: seller.status,
        createdAt: seller.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[] | undefined)?.join(', ');
        throw new ConflictException(
          `Email or document already registered${target ? ` (${target})` : ''}`,
        );
      }
      throw error;
    }
  }
}
