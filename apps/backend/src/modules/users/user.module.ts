import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { InviteRepository } from './invite.repository';
import { InviteService } from './invite.service';
import { Invite, InviteSchema } from './schemas/invite.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UserManagementService } from './user-management.service';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invite.name, schema: InviteSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UserRepository,
    UserService,
    UserManagementService,
    InviteRepository,
    InviteService,
  ],
  exports: [
    UserService,
    UserRepository,
    UserManagementService,
    InviteService,
  ],
})
export class UserModule {}
