package com.pr.backend;

import java.util.ArrayList;
import java.util.List;

public class Person<T>{
    private List<Person<T>> persons;
    private double gehalt;
    private double total=0d;
    private T type;
    Person<T> p = this;


    /**
     *
     * @return
     */
    public double getTotal(){
      return  getTotal(this);
    }

    /**
     *
     * @return
     */
    public double getTotal2(){
        if(total==0d) total = this.getGehalt();
        for ( Person<T> curPerson: p.getPersons()){
            total+=curPerson.getGehalt();
            if(curPerson.getPersons()!=null){
                p=curPerson;
                total=+ getTotal2();
            }
        }
       return total;
    }

    private  double getTotal(Person<T> p){
        List<Person<T>> persons = p.getPersons();
        if(total==0d) total = this.getGehalt();
        for(Person pp: persons ){
            total+=pp.getGehalt();
            getTotal(pp);
        }
        return total;
    }

    public List<Person<T>>  getPersons() {
        if(this.persons==null){
            this.persons = new ArrayList<>();
        }
        return persons;
    }

    public void setPersons(List<Person<T>>  persons) {

        this.persons = persons;
    }

    public Double getGehalt() {
        return gehalt;
    }

    public void setGehalt(Double gehalt) {
        this.gehalt = gehalt;
    }

    public T getType() {
        return type;
    }

    public void setType(T type) {
        this.type = type;
    }
}
