import {Directive, Input} from "@angular/core";



@Directive()
export class CommonServicesEditService<T> {

  changesList: T[] = []
  @Input() modelList: T[] = []

  public rollbackChanges(id: number) {
    //step 1: search item in the changes list
    const originItem = this.changesList.filter(i =>i['id'] === id )?.at(0)
    //step 2: if item exists in changes list
    if (originItem !== undefined) {
      //step 3: removes item from changes list
      this.changesList = this.changesList.filter(i =>i['id']!== id )
      //step 4: sets original item back
      this.modelList.filter((i, idx) => {
        if (i['id'] === id) {
          this.modelList[idx] = originItem
          return
        }
      })
    }
  }
}

