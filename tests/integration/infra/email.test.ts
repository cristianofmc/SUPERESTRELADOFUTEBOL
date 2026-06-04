import email from "#infra/email";
import orchestrator from "#tests/orchestrator";
import config from "#infra/config";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.ts", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmails();

    await email.send({
      from: `${config.appName} <${config.appEmail}>`,
      to: "fin@cristianofelipe.com",
      subject: "First email test",
      text: "The first email body",
    });

    await email.send({
      from: `${config.appName} <${config.appEmail}>`,
      to: "fin@cristianofelipe.com",
      subject: "Last email test",
      text: "The last email body",
    });

    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail!.sender).toBe(`<${config.appEmail}>`);
    expect((lastEmail!.recipients as string[])[0]).toBe(
      "<fin@cristianofelipe.com>",
    );
    expect(lastEmail!.subject).toBe("Last email test");
    expect(lastEmail!.text).toBe("The last email body\n");

    await orchestrator.deleteAllEmails();
  });
});
