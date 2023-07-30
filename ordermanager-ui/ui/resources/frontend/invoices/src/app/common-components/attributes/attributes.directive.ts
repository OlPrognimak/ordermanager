import {Directive, OnChanges, Input, Renderer2, ElementRef, SimpleChanges, NgModule} from '@angular/core';

@Directive({
  selector: '[attributes]'
})
export class AttributeDirective implements OnChanges {

  @Input()
  public attributes: { [key: string]: any; };

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef
  ) { }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['attributes']) {
      for (let attributeName in this.attributes) {
        const attributeValue = this.attributes[attributeName];
        if (attributeValue) {
          this.renderer.setAttribute(this.elementRef.nativeElement, attributeName, attributeValue);

        } else {
          this.renderer.removeAttribute(this.elementRef.nativeElement, attributeName, null);
        }
      }
    }
  }
}
@NgModule({
    declarations: [AttributeDirective],
     exports: [AttributeDirective]
  }
)
export class AttributeDirectiveModule{}
