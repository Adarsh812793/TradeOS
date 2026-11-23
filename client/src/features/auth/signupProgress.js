// The sign-up's remembered email (see emailProgress.js for why and how): a reload comes back to the code step.
import { createEmailProgress } from "./emailProgress.js";

const store = createEmailProgress("tradeos-signup-progress");

export const saveSignupProgress = store.save; // saves that a code was sent to this email just now
export const readSignupProgress = store.read; // the email a sign-up is waiting on, or null
export const clearSignupProgress = store.clear; // forgets it (the sign-up finished or was abandoned)
