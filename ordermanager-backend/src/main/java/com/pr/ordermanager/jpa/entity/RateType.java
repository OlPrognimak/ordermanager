package com.pr.ordermanager.jpa.entity;

public enum RateType {
    DAILY("Tages", "Tagessatz (Euro)"),
    HOURLY("Stunden", "Stundensatz (Euro)");

    String description;
    String rateName;
    RateType(String description, String rateName){
       this.description = description;
       this.rateName = rateName;
    }

    public java.lang.String getDescription(){
        return description;
    }
}
