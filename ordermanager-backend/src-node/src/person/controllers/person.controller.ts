import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { CreatedResponseDto, DropdownDataTypeDto, RequestPeriodDateDto } from '../../common/dto/common.dto';
import { Roles } from '../../security/decorators/roles.decorator';
import { PersonFormModelDto } from '../dto/person.dto';
import { PersonService } from '../services/person.service';

@Controller()
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Put('/person')
  async putNewPerson(@Body() personFormModel: PersonFormModelDto, @Req() req: any): Promise<CreatedResponseDto> {
    this.personService.validatePersonDto(personFormModel);
    const person = this.personService.fromDto(personFormModel);
    await this.personService.savePerson(person, req.user.username);
    return new CreatedResponseDto(person.id);
  }

  @Post('/person')
  async updatePersons(@Body() persons: PersonFormModelDto[]): Promise<CreatedResponseDto> {
    persons.forEach((p) => this.personService.validatePersonDto(p));
    await this.personService.updatePersons(persons);
    return new CreatedResponseDto(1);
  }

  @Delete('/person/:personId')
  async deletePerson(@Param('personId') personId: string): Promise<CreatedResponseDto> {
    await this.personService.deletePerson(Number(personId));
    return new CreatedResponseDto(Number(personId));
  }

  @Roles('ROLE_USER')
  @Get('/person/personsdropdown')
  async getPersonsDropdown(@Req() req: any): Promise<DropdownDataTypeDto[]> {
    const all = await this.personService.getAllUserPersons(req.user.username);
    return this.personService.toDropdown(all);
  }

  @Roles('ROLE_USER')
  @Get('/persons')
  async getUserPersons(@Req() req: any): Promise<PersonFormModelDto[]> {
    const all = await this.personService.getAllUserPersons(req.user.username);
    return all.map(this.personService.toDto);
  }

  @Roles('ROLE_USER')
  @Post('/person/personsListPeriod')
  async getPersonsByPeriod(@Req() req: any, @Body() periodDate: RequestPeriodDateDto): Promise<PersonFormModelDto[]> {
    const all = await this.personService.getAllUserPersonsByPeriod(req.user.username, periodDate.startDate, periodDate.endDate);
    return all.map(this.personService.toDto);
  }
}
