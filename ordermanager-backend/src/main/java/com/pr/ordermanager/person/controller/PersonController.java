package com.pr.ordermanager.person.controller;


import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.common.model.RequestPeriodDate;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.person.service.PersonModelToEntityMapperHelper;
import com.pr.ordermanager.person.service.PersonService;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.CREATED;
import static org.springframework.http.HttpStatus.OK;

/**
 * This controler provide the rest services for UI and  for management with person on UI
 * @author Oleksandr Prognimak
 *
 * @since  21.09.2020 - 14:48
 */
@OpenAPIDefinition(
        info = @Info(
                title = "This controller contains the end points for deliver metadata for  person forms" +
                        "and for management with ones",
                contact = @Contact(url = "", name = "Oleksandr Prognimak", email = "ol.prognimak@gmail.com")
        )
)
@RestController
@CrossOrigin
@AllArgsConstructor
public class PersonController {
    private static final String ROOT_PATH = "/person";

    private static final String PERSONS = "/persons";

    private static final String PATH_PERSONS_LIST_PERIOD = ROOT_PATH +"/personsListPeriod";
    private static final String PATH_PERSON = ROOT_PATH;
    private static final String PATH_PERSONS_DROPDOWN = ROOT_PATH + "/personsdropdown";

    private static final String APPLICATION_JSON = "application/json";


    private final PersonService personService;


    /**
     * Saves new person to the databse
     * @param personFormModel the model with data for creation and saving person to the database
     * @param principal injects by SpringBoot
     * @return the response with status and created id of person
     */
    @Operation(description = "Puts new person to the database",
            method = "put",
            operationId = "putNewPerson",
            responses = {
                    @ApiResponse(responseCode = "201",
                            description = "The saving of new person to the database was successful",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0001 in case if validation of request happens, " +
                                    "and with code CODE_0000 in case if something else happens ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Person",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )

    @PutMapping(value= PATH_PERSON, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewPerson(
            @RequestBody @Valid PersonFormModel personFormModel, Principal principal) {
        PersonValidator.validate(personFormModel);
        Person person = PersonModelToEntityMapperHelper.mapPersonFormModelToEntity(personFormModel);
        personService.savePerson(person, principal.getName());
        return ResponseEntity.status(CREATED).body(new CreatedResponse(person.getId()));
    }

    @PostMapping(value= PATH_PERSON, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> updatePersons(
            @RequestBody @Valid List<PersonFormModel> persons, Principal principal) {
        persons.forEach(PersonValidator::validate
        );
        personService.updatePersons(persons, principal.getName());

        return ResponseEntity.status(CREATED).body(new CreatedResponse(1L));
    }

    @DeleteMapping(value= PATH_PERSON+"/{personId}", produces = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> deletePerson(
            @PathVariable @Valid Long personId, Principal principal) {
        personService.deletePerson(personId, principal.getName());

        return ResponseEntity.status(OK).body(new CreatedResponse(personId));
    }


    /**
     * @param principal Security principal. Injects by SpringBoot
     * @return the response with list of {@link DropdownDataType} with persons
     */
    @Operation(description = "Delivers the list of persons for drop down in UI as key and value map where " +
            "key is ID of person and value is " +
            "concatenation of person first name, last name and company name ",
            method = "get",
            operationId = "getPersonsDropdown",
            responses = {
                    @ApiResponse(responseCode = "200",
                            description = "In case of successful delivering of person list ",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0000 in case if somme error occurs ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Person",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    @PreAuthorize("hasRole('USER')")
    @GetMapping(value = PATH_PERSONS_DROPDOWN, produces = APPLICATION_JSON)
    public ResponseEntity<List<DropdownDataType>> getPersonsDropdown(Principal principal) {
        List<Person> allPersons = personService.getAllUserPersons(principal.getName());
        List<DropdownDataType> dropdownDataTypes =
                PersonModelToEntityMapperHelper.mapPersonToDropdownType(allPersons);
        return ResponseEntity.status(OK).body(dropdownDataTypes);
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping(value = PERSONS, produces = APPLICATION_JSON)
    public ResponseEntity<List<PersonFormModel>> getUserPersons(Principal principal) {
        List<Person> allPersons = personService.getAllUserPersons(principal.getName());
        List<PersonFormModel> personFormModels = allPersons.stream().map(
                PersonModelToEntityMapperHelper::mapPersonEntityToModel).collect(Collectors.toList());

        return ResponseEntity.status(OK).body(personFormModels);
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping(value = PATH_PERSONS_LIST_PERIOD,  produces = APPLICATION_JSON)
    public ResponseEntity<List<PersonFormModel>> getPersonsByPeriod(Principal principal,
                                                                    @RequestBody RequestPeriodDate periodDate) {
        List<Person> allPersons = personService.getAllUserPersons(principal.getName(), periodDate);
        List<PersonFormModel> personFormModels = allPersons.stream().map(
                PersonModelToEntityMapperHelper::mapPersonEntityToModel).collect(Collectors.toList());

        return ResponseEntity.status(OK).body(personFormModels);
    }
}
