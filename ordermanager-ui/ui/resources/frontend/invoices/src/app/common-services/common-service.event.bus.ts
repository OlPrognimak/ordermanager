import { Injectable, OnInit } from "@angular/core";
import { Observable, Subject } from "rxjs";

/**
 * The event bus
 */
@Injectable({
  providedIn: 'root'
})
export class CommonServiceEventBus<T> {

  private events = new Subject<T>()

  /**
   *  Emit en Event
   * @param event
   */
  emitEvent(event: T) {
    console.log("++++++ EMIT EVENT ="+event)
    this.events.next(event)
  }


  /**
   * Subscribe to events
   */
  onEvent(): Observable<T> {
    return this.events.asObservable();
  }
}


/**
 * The listener of events from event bus.
 */
@Injectable({
  providedIn: 'root'
})
export class CommonServiceEventListener<T> implements OnInit {

  busEvent: T

  constructor(private eventBus: CommonServiceEventBus<T>) {}

  ngOnInit() {
    this.eventBus.onEvent().subscribe((event: T) => {
      this.busEvent = event;
    });
  }
}
