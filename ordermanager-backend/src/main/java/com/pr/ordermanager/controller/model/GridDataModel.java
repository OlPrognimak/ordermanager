package com.pr.ordermanager.controller.model;

/**
 *
 */
public class GridDataModel {

    public GridDataModel(){

    }

    public GridDataModel(String make,
             String model,
             Double price){

        this.make=make;
         this.model=model;
         this.price=price;

    }

    private String make;
    private String model;
    private Double price;

    public String getMake() {
        return make;
    }

    public void setMake(String make) {
        this.make = make;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }


}
