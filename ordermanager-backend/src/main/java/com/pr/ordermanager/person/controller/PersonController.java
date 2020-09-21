package com.pr.ordermanager.person.controller;

/**

 */

import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.service.EntityToModelMapperHelper;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.person.service.PersonService;
import com.pr.ordermanager.report.service.ModelToEntityMapperHelper;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
public class PersonController {
    private static final String PATH_BANK_ACC = "/account";
    private static final String PATH_PERSONS_DROPDOWN = "/personsdropdown";
    private static final String PATH_PERSON = "/person";
    private static final String APPLICATION_JSON = "application/json";

    @Autowired
    PersonService personService;


    /**
     * Saves new person to the databse
     * @param personFormModel the model with data for creation and saving person to the database
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
    @RequestMapping(value = PATH_PERSON, method = RequestMethod.PUT, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewPerson(@RequestBody PersonFormModel personFormModel) {

        Person person = ModelToEntityMapperHelper.mapPersonFormModelToEntity(personFormModel);
        personService.savePerson(person);
        return ResponseEntity.status(CREATED).body(new CreatedResponse(person.getId()));
    }

    /**
     *
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
    @RequestMapping(value = PATH_PERSONS_DROPDOWN, method = RequestMethod.GET,
            produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<List<DropdownDataType>> getPersonsDropdown() {
        List<Person> allPersons = personService.getAllPersons();
        List<DropdownDataType> dropdownDataTypes =
                EntityToModelMapperHelper.mapPersonToDropdownType(allPersons);
        return ResponseEntity.status(OK).body(dropdownDataTypes);
    }
}
