import { Event, getEventInternalData } from "./lib/event";
import { getEventAttributeValue, setEventAttributeValue } from "./lib/event-attribute-handler";
import { EventTarget, getEventTargetInternalData } from "./lib/event-target";
import { defineCustomEventTarget, defineEventAttribute } from "./lib/legacy";
import { setWarningHandler } from "./lib/warning-handler";

export default EventTarget;
export {
	defineCustomEventTarget,
	defineEventAttribute,
	Event,
	EventTarget,
	getEventInternalData,
	getEventTargetInternalData,
	getEventAttributeValue,
	setEventAttributeValue,
	setWarningHandler,
};
