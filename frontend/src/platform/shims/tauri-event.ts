import { listen as listenInternal, type Event as AppEventType } from "../api";

export type Event<T> = AppEventType<T>;

export const listen = listenInternal;
