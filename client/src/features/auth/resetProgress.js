// The forgot-password page's remembered email (see emailProgress.js for why and how): a reload comes back to the code step.
import { createEmailProgress } from "./emailProgress.js";

const store = createEmailProgress("tradeos-reset-progress");

export const saveResetProgress = store.save; // saves that a code was sent to this email just now
export const readResetProgress = store.read; // the email a reset is waiting on, or null
export const clearResetProgress = store.clear; // forgets it (the password was reset or the attempt abandoned)
