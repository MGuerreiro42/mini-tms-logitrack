import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';

@Module({
  providers: [InvitesService],
})
export class InvitesModule {}
