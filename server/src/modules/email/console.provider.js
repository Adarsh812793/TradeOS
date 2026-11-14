// The email provider for DEVELOPMENT without an email account: it prints the email to the server log instead of sending
// it, so you can read the sign-up code in the terminal. The config refuses it outside development and test, because a
// sign-in code in a production log would be a security hole.

// A provider with the shared shape { name, send(message) }; `from` is the sender address from the config.
export function createConsoleProvider({ from }) {
    return {
        name: "console",

        async send({ to, subject, text }) {
            console.log(
                [
                    "",
                    "---------- EMAIL (console provider: not really sent) ----------",
                    `From:    ${from}`,
                    `To:      ${to}`,
                    `Subject: ${subject}`,
                    "",
                    text,
                    "---------------------------------------------------------------",
                    ""
                ].join("\n")
            );

            return { id: "console" };
        }
    };
}
