import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Roles } from '../security/decorators/roles.decorator';
import { RequestPeriodDateDto } from '../common/dto/common.dto';
import { PersonFormDto } from './dto/person.dto';
import { PersonService } from './person.service';

@Controller()
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Put('/person')
  async putNewPerson(@Body() personFormModel: PersonFormDto, @Req() req: { user: { username: string } }) {
    const person = await this.personService.savePerson(personFormModel, req.user.username);
    return { createdId: Number(person.id) };
  }

  @Post('/person')
  async updatePersons(@Body() persons: PersonFormDto[]) {
    await this.personService.updatePersons(persons);
    return { createdId: 1 };
  }

  @Delete('/person/:personId')
  async deletePerson(@Param('personId') personId: string) {
    await this.personService.deletePerson(Number(personId));
    return { createdId: Number(personId) };
  }

  @Roles('USER')
  @Get('/person/personsdropdown')
  async getPersonsDropdown(@Req() req: { user: { username: string } }) {
    const allPersons = await this.personService.getAllUserPersons(req.user.username);
    return allPersons.map((p) => ({
      label: `${p.personFirstName ?? ''} ${p.personLastName ?? ''} ${p.companyName ?? ''}`.trim(),
      value: String(p.id),
    }));
  }

  @Roles('USER')
  @Get('/persons')
  async getUserPersons(@Req() req: { user: { username: string } }) {
    const allPersons = await this.personService.getAllUserPersons(req.user.username);
    return allPersons.map((p) => this.personService.mapEntityToModel(p));
  }

  @Roles('USER')
  @Post('/person/personsListPeriod')
  async getPersonsByPeriod(@Req() req: { user: { username: string } }, @Body() periodDate: RequestPeriodDateDto) {
    const allPersons = await this.personService.getAllUserPersonsByPeriod(
      req.user.username,
      periodDate.startDate,
      periodDate.endDate,
    );
    return allPersons.map((p) => this.personService.mapEntityToModel(p));
  }
}
