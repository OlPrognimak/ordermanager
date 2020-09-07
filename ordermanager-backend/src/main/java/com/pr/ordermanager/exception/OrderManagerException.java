package com.pr.ordermanager.exception;

import lombok.*;

@ToString
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class OrderManagerException extends RuntimeException {
   private ErrorCode errorCode;


   public OrderManagerException(ErrorCode errorCode,String message){
       super(message);
       this.errorCode = errorCode;
   }

    public OrderManagerException(ErrorCode errorCode,String message, Throwable throwable){
        super(message,throwable);
        this.errorCode = errorCode;
    }

    public OrderManagerException(Throwable throwable){
        super(throwable);
    }
}
