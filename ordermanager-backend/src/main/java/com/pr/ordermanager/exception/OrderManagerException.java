package com.pr.ordermanager.exception;

public class OrderManagerException extends RuntimeException {
   public OrderManagerException(String message){
       super(message);
   }

    public OrderManagerException(String message, Throwable throwable){
        super(message,throwable);
    }

    public OrderManagerException(Throwable throwable){
        super(throwable);
    }
}
