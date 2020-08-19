package com.pr.backend;

import org.junit.Test;

public class TestInterface {

    @Test
   public void testTest(){
       Example obj = new Example();
       // Method reference using the object of the class
       MyInterface ref = obj::myMethod;
       // Calling the method of functional interface
       ref.display("Hallo");
   }

}

@FunctionalInterface
interface MyInterface{
    void display(String text);
}
class Example {
    public void myMethod(String text){
        System.out.println(text);
    }

}
