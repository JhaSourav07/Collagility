import { EventEmitter } from 'node:events';

export type StreamState =
  | 'Idle'
  | 'Preparing'
  | 'Streaming'
  | 'Paused'
  | 'WaitingForInput'
  | 'WaitingForApproval'
  | 'WaitingForSelection'
  | 'ExecutingTool'
  | 'Cancelling'
  | 'Completed'
  | 'Failed'
  | 'Timeout';

export interface StateChangeEvent {
  streamId: string;
  previousState: StreamState;
  newState: StreamState;
  timestamp: number;
  reason?: string;
}

const VALID_TRANSITIONS: Record<StreamState, StreamState[]> = {
  Idle: ['Preparing', 'Streaming'],
  Preparing: ['Streaming', 'WaitingForInput', 'WaitingForApproval', 'WaitingForSelection', 'ExecutingTool', 'Cancelling', 'Failed', 'Timeout', 'Idle'],
  Streaming: ['Paused', 'WaitingForInput', 'WaitingForApproval', 'WaitingForSelection', 'ExecutingTool', 'Cancelling', 'Completed', 'Failed', 'Timeout', 'Idle'],
  Paused: ['Streaming', 'WaitingForInput', 'WaitingForApproval', 'WaitingForSelection', 'ExecutingTool', 'Cancelling', 'Failed', 'Timeout', 'Idle'],
  WaitingForInput: ['Streaming', 'ExecutingTool', 'WaitingForApproval', 'WaitingForSelection', 'Cancelling', 'Completed', 'Failed', 'Timeout', 'Idle'],
  WaitingForApproval: ['Streaming', 'ExecutingTool', 'WaitingForInput', 'WaitingForSelection', 'Cancelling', 'Completed', 'Failed', 'Timeout', 'Idle'],
  WaitingForSelection: ['Streaming', 'ExecutingTool', 'WaitingForInput', 'WaitingForApproval', 'Cancelling', 'Completed', 'Failed', 'Timeout', 'Idle'],
  ExecutingTool: ['Streaming', 'WaitingForInput', 'WaitingForApproval', 'WaitingForSelection', 'Cancelling', 'Completed', 'Failed', 'Timeout', 'Idle'],
  Cancelling: ['Idle', 'Failed', 'Completed'],
  Completed: ['Idle', 'Preparing', 'Streaming'],
  Failed: ['Idle', 'Preparing', 'Streaming'],
  Timeout: ['Idle', 'Preparing', 'Streaming'],
};

export class StreamStateMachine extends EventEmitter {
  private currentState: StreamState = 'Idle';
  private streamId: string;
  private stateHistory: StateChangeEvent[] = [];

  constructor(streamId: string, initialState: StreamState = 'Idle') {
    super();
    this.streamId = streamId;
    this.currentState = initialState;
  }

  public transitionTo(newState: StreamState, reason?: string): boolean {
    if (this.currentState === newState) {
      return true;
    }

    const allowedNextStates = VALID_TRANSITIONS[this.currentState];
    if (!allowedNextStates.includes(newState)) {
      throw new Error(
        `Invalid stream state transition from '${this.currentState}' to '${newState}' for stream '${this.streamId}'`
      );
    }

    const previousState = this.currentState;
    this.currentState = newState;

    const event: StateChangeEvent = {
      streamId: this.streamId,
      previousState,
      newState,
      timestamp: Date.now(),
      reason,
    };

    this.stateHistory.push(event);
    this.emit('stateChanged', event);
    return true;
  }

  public getState(): StreamState {
    return this.currentState;
  }

  public getStreamId(): string {
    return this.streamId;
  }

  public getHistory(): StateChangeEvent[] {
    return [...this.stateHistory];
  }

  public isTerminal(): boolean {
    return (
      this.currentState === 'Completed' ||
      this.currentState === 'Failed' ||
      this.currentState === 'Timeout' ||
      this.currentState === 'Idle'
    );
  }

  public reset(): void {
    this.currentState = 'Idle';
    this.stateHistory = [];
  }
}
