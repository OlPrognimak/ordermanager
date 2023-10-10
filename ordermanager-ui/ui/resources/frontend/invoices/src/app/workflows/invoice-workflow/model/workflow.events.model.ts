import {WorkflowStatuses} from "../state/invoice.state";


export class WorkflowEventsModel {
  statusDesc: string | undefined | null
  status: WorkflowStatuses
  date: Date | null
  level: number = 0
  icon: string | undefined
  color: string | undefined
  image: string | undefined

  constructor (data: Partial<WorkflowEventsModel>) {
    Object.assign(this, data)
  }
}
