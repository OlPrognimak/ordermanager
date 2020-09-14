import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'standardFloat',
})
export class ComponentsPipesNumberDouble implements PipeTransform {
  transform( val: number): string{
        return Number(val).toFixed(2);
   }
}
