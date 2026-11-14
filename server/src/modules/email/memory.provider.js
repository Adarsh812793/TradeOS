// The email provider used by TESTS: nothing is sent anywhere; every email is kept in a list that a test can read (for
// example to take the sign-up code out of the message). The config refuses this provider outside NODE_ENV=test.

// All emails "sent" so far, oldest first. Module-level on purpose: a test and the app code share the same list.
const outbox = [];

// A provider with the shared shape { name, send(message) }; `from` is the sender address from the config.
export function createMemoryProvider({ from }) {
    return {
        name: "memory",

        async send({ to, subject, text, html }) {
            outbox.push({ from, to, subject, text, html, sentAt: new Date() });

            return { id: `memory-${outbox.length}` };
        }
    };
}

// Every email sent so far (a copy, so a test cannot change the real list by accident)
export function getOutbox() {
    return [...outbox];
}

// The newest email sent to one address, or undefined. Tests use it to read the code that was "emailed".
export function getLastEmailTo(address) {
    const wanted = String(address).trim().toLowerCase();

    return [...outbox].reverse().find((message) => message.to.toLowerCase() === wanted);
}

// Empties the list (call it in a test's setup so earlier tests cannot leak in)
export function clearOutbox() {
    outbox.length = 0;
}
