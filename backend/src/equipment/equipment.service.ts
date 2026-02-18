import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment, CalibrationStatus } from '../entities/equipment.entity';
import { CalibrationHistory } from '../entities/calibration-history.entity';
import { CreateEquipmentDto, UpdateEquipmentDto, CreateCalibrationHistoryDto } from './dto/equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
    @InjectRepository(CalibrationHistory)
    private calibrationHistoryRepository: Repository<CalibrationHistory>,
  ) {}

  async create(createDto: CreateEquipmentDto, userId: string): Promise<Equipment> {
    // Generate equipment number
    const count = await this.equipmentRepository.count();
    const equipmentNumber = `EQ-${String(count + 1).padStart(3, '0')}`;

    const equipment = this.equipmentRepository.create({
      ...createDto,
      equipmentNumber,
      createdById: userId,
    });

    return this.equipmentRepository.save(equipment);
  }

  async findAll(filters?: {
    department?: string;
    status?: string;
    calibrationStatus?: string;
    search?: string;
  }): Promise<Equipment[]> {
    const query = this.equipmentRepository.createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.createdBy', 'createdBy')
      .leftJoinAndSelect('equipment.calibrationHistory', 'calibrationHistory')
      .orderBy('equipment.createdAt', 'DESC');

    if (filters?.department) {
      query.andWhere('equipment.department = :department', { department: filters.department });
    }

    if (filters?.status) {
      query.andWhere('equipment.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(equipment.name ILIKE :search OR equipment.equipmentId ILIKE :search OR equipment.make ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const equipment = await query.getMany();

    // Filter by calibration status if provided
    if (filters?.calibrationStatus) {
      return equipment.filter(eq => eq.getCalibrationStatus() === filters.calibrationStatus);
    }

    return equipment;
  }

  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id },
      relations: ['createdBy', 'calibrationHistory', 'calibrationHistory.uploadedBy'],
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    return equipment;
  }

  async update(id: string, updateDto: UpdateEquipmentDto): Promise<Equipment> {
    const equipment = await this.findOne(id);
    Object.assign(equipment, updateDto);
    return this.equipmentRepository.save(equipment);
  }

  async remove(id: string): Promise<void> {
    const equipment = await this.findOne(id);
    await this.equipmentRepository.remove(equipment);
  }

  async getDashboard(): Promise<{
    totalEquipment: number;
    calibrationOk: number;
    calibrationDue: number;
    calibrationUpcoming: number;
    departmentSummary: Array<{ department: string; count: number }>;
    upcomingCalibrations: Array<{
      week: number;
      count: number;
      equipment: Array<{ id: string; name: string; department: string; nextCalibrationDate: Date }>;
    }>;
    allCalibrations: Array<{
      id: string;
      name: string;
      department: string;
      nextCalibrationDate: Date;
      status: string;
    }>;
  }> {
    const allEquipment = await this.equipmentRepository.find({
      relations: ['createdBy'],
    });

    let calibrationOk = 0;
    let calibrationDue = 0;
    let calibrationUpcoming = 0;

    allEquipment.forEach(eq => {
      const status = eq.getCalibrationStatus();
      if (status === CalibrationStatus.OK) calibrationOk++;
      else if (status === CalibrationStatus.DUE) calibrationDue++;
      else if (status === CalibrationStatus.UPCOMING) calibrationUpcoming++;
    });

    // Department summary (only departments with equipment)
    const departmentMap = new Map<string, number>();
    allEquipment.forEach(eq => {
      departmentMap.set(eq.department, (departmentMap.get(eq.department) || 0) + 1);
    });

    const departmentSummary = Array.from(departmentMap.entries()).map(([department, count]) => ({
      department,
      count,
    }));

    // Upcoming calibrations - weekly for next month
    const today = new Date();
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const upcomingEquipment = allEquipment.filter(eq => {
      const nextDue = new Date(eq.nextCalibrationDate);
      return nextDue >= today && nextDue <= oneMonthLater;
    });

    // Group by week
    const weeklyData: Array<{
      week: number;
      count: number;
      equipment: Array<{ id: string; name: string; department: string; nextCalibrationDate: Date }>;
    }> = [
      { week: 1, count: 0, equipment: [] },
      { week: 2, count: 0, equipment: [] },
      { week: 3, count: 0, equipment: [] },
      { week: 4, count: 0, equipment: [] },
    ];

    upcomingEquipment.forEach(eq => {
      const nextDue = new Date(eq.nextCalibrationDate);
      const diffTime = nextDue.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(Math.floor(diffDays / 7), 3); // 0-3 for weeks 1-4

      weeklyData[weekIndex].count++;
      weeklyData[weekIndex].equipment.push({
        id: eq.id,
        name: eq.name,
        department: eq.department,
        nextCalibrationDate: eq.nextCalibrationDate,
      });
    });

    return {
      totalEquipment: allEquipment.length,
      calibrationOk,
      calibrationDue,
      calibrationUpcoming,
      departmentSummary,
      upcomingCalibrations: weeklyData,
      allCalibrations: allEquipment.map((eq) => ({
        id: eq.id,
        name: eq.name,
        department: eq.department,
        nextCalibrationDate: eq.nextCalibrationDate,
        status: eq.getCalibrationStatus(),
      })),
    };
  }

  // Calibration History Management
  async addCalibrationHistory(
    equipmentId: string,
    createDto: CreateCalibrationHistoryDto,
    userId: string,
  ): Promise<CalibrationHistory> {
    const equipment = await this.findOne(equipmentId);

    const history = this.calibrationHistoryRepository.create({
      ...createDto,
      equipmentId: equipment.id,
      uploadedById: userId,
    });

    // Update equipment's last calibration date and calculate next due date
    equipment.lastCalibrationDate = new Date(createDto.calibrationDate);
    // Use manually provided next due date
    equipment.nextCalibrationDate = new Date(createDto.nextCalibrationDate);
    
    await this.equipmentRepository.save(equipment);

    return this.calibrationHistoryRepository.save(history);
  }

  async getCalibrationHistory(equipmentId: string): Promise<CalibrationHistory[]> {
    await this.findOne(equipmentId); // Ensure equipment exists

    return this.calibrationHistoryRepository.find({
      where: { equipmentId },
      relations: ['uploadedBy'],
      order: { calibrationDate: 'DESC' },
    });
  }

  async deleteCalibrationHistory(historyId: string): Promise<void> {
    const history = await this.getCalibrationHistoryById(historyId);
    await this.calibrationHistoryRepository.remove(history);
  }

  async getCalibrationHistoryById(id: string): Promise<CalibrationHistory> {
    const history = await this.calibrationHistoryRepository.findOne({
      where: { id },
    });

    if (!history) {
      throw new NotFoundException(`Calibration history with ID ${id} not found`);
    }

    return history;
  }
}
