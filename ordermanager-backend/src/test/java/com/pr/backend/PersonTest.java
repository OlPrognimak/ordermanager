package com.pr.backend;

import org.junit.Before;
import org.junit.Test;


public class PersonTest {
    enum PERSON_TYP {
        CHEF,
        MANAGER,
        MITARBEITER
    }

    Person<PERSON_TYP>  chef;
    Person<PERSON_TYP> manager;
    Person<PERSON_TYP> mitarbeiter1;
    Person<PERSON_TYP> mitarbeiter2;
    @Before
    public void setUp(){
        chef = new Person<>();
        chef.setGehalt(200d);
        chef.setType(PERSON_TYP.CHEF);

        manager = new Person<>();
        manager.setGehalt(100d);
        manager.setType(PERSON_TYP.MANAGER);
        chef.getPersons().add(manager);

        mitarbeiter1 = new Person<>();
        mitarbeiter1.setType(PERSON_TYP.MITARBEITER);
        mitarbeiter1.setGehalt(50d);
        manager.getPersons().add(mitarbeiter1);

        mitarbeiter2 = new Person<>();
        mitarbeiter2.setType(PERSON_TYP.MITARBEITER);
        mitarbeiter2.setGehalt(30d);
        manager.getPersons().add(mitarbeiter2);
    }

    @Test
    public void testGetTotalType1()
    {
        System.out.println("Total1 Chef:"+chef.getTotal());
        System.out.println("Total1 Manager:"+manager.getTotal());
        System.out.println("Total1 Mitarbeiter:"+mitarbeiter1.getTotal());
        System.out.println("Total1 Mitarbeiter:"+mitarbeiter2.getTotal());

    }


    @Test
    public void testGetTotalType2()
    {
        System.out.println("Total2 Chef:"+chef.getTotal2());
        System.out.println("Total2 Manager:"+ manager.getTotal2());
        System.out.println("Total2 Mitarbeiter:"+ mitarbeiter1.getTotal2());
        System.out.println("Total2 Mitarbeiter:"+ mitarbeiter2.getTotal2());


    }



}
