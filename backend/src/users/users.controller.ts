import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    @Get()
    @Roles(UserRole.ADMIN)
    async findAll(@Query('relations') relations: string) {
        const relationsArray = relations ? relations.split(',') : [];
        const allowedRelations = ['jobRole'];
        const validRelations = relationsArray.filter(r => allowedRelations.includes(r));

        const users = await this.userRepository.find({
            select: ['id', 'email', 'firstName', 'lastName', 'role', 'department', 'isActive', 'createdAt', 'jobRoleId'],
            relations: validRelations,
        });
        return users;
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'email', 'firstName', 'lastName', 'role', 'department', 'isActive', 'createdAt'],
        });
        return user;
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() updateUserDto: Partial<User>) {
        await this.userRepository.update(id, updateUserDto);
        return this.findOne(id);
    }

    @Put(':id/deactivate')
    @Roles(UserRole.ADMIN)
    async deactivate(@Param('id') id: string) {
        await this.userRepository.update(id, { isActive: false });
        return { message: 'User deactivated successfully' };
    }

    @Put(':id/activate')
    @Roles(UserRole.ADMIN)
    async activate(@Param('id') id: string) {
        await this.userRepository.update(id, { isActive: true });
        return { message: 'User activated successfully' };
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        await this.userRepository.delete(id);
        return { message: 'User deleted successfully' };
    }
}
