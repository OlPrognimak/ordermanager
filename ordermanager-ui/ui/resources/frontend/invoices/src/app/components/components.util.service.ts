import {Injectable} from '@angular/core';
import {Message, MessageService} from 'primeng';
import {of} from 'rxjs';
import {delay, map} from 'rxjs/operators';

/**
 * The useful utility service
 */
@Injectable({
  providedIn: 'root',
})
export class ComponentsUtilService{

  constructor( private messageService: MessageService) {
  }

  /**
   * Hide message after delay time
   */
  public hideMassage(message: Message, delayTimeMs: number): void{
    const observable = of(message).pipe(delay(delayTimeMs));
    const operatorFunction = map((msg: Message) => {
      this.messageService.clear(msg.key);
      return true;
    } );
    const messageFunction = operatorFunction(observable);
    messageFunction.toPromise().then((data) => {
        console.log('Message clear');
      }
    );
  }

}
