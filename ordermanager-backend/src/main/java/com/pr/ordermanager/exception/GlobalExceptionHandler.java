/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.common.model.ResponseException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;

/**
 * The exception handler for capturing application exceptions and mapping to the  response exception
 */
@ControllerAdvice
public class GlobalExceptionHandler {
    ObjectMapper objectMapper;
    GlobalExceptionHandler(){
        objectMapper = new ObjectMapper();
    }

//    @ResponseStatus(HttpStatus.BAD_REQUEST)
//    @ExceptionHandler(MethodArgumentNotValidException.class)
//    public Map<String, String> handleValidationExceptions(
//            MethodArgumentNotValidException ex) {
//        Map<String, String> errors = new HashMap<>();
//        ex.getBindingResult().getAllErrors().forEach((error) -> {
//            String fieldName = ((FieldError) error).getField();
//            String errorMessage = error.getDefaultMessage();
//            errors.put(fieldName, errorMessage);
//        });
//        return errors;
//    }

    /**
     * Handle currently with all exceptions
     * @param ex the exception which occurs in application
     * @param request the web request
     * @return response entity with response exception
     */
    @ExceptionHandler({ Exception.class })
    public ResponseEntity<ResponseException> handleAccessDeniedException(
            Exception ex, WebRequest request) {

        if (ex instanceof OrderManagerException) {
            OrderManagerException ordMngEx = (OrderManagerException) ex;
            ResponseException responseException = ResponseException.builder()
                    .errorCode(ordMngEx.getErrorCode())
                    .errorMessage(ordMngEx.getMessage()).build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseException);
        }else if (ex instanceof  MethodArgumentNotValidException){
            Map<String, String> errors = new HashMap<>();
            MethodArgumentNotValidException maex = (MethodArgumentNotValidException)ex;
            maex.getBindingResult().getAllErrors().forEach((error) -> {
                String fieldName = ((FieldError) error).getField();
                String errorMessage = error.getDefaultMessage();
                errors.put(fieldName, errorMessage);
            });
            try {
                String json = objectMapper.writeValueAsString(errors);
                ResponseException responseException = ResponseException.builder()
                        .errorCode(CODE_0000)
                        .errorMessage(json).build();
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseException);
            } catch (JsonProcessingException e) {
                return  ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                        ResponseException.builder().shortText(
                                "Unexpected validation erreor").errorCode(CODE_0000).build()
                );
            }
        }else{
            ResponseException responseException = ResponseException.builder()
                    .errorCode(CODE_0000)
                    .errorMessage(ex.getMessage()).build();

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseException);
        }

    }
}
