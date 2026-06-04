import retry from "async-retry";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { db } from "#infra/database";
import migrator from "#models/migrator";
import user, { type CreateUserInput } from "#models/user";
import session from "#models/session";
import activation from "#models/activation";

const getAppUrl = () => process.env.APP_URL || "http://localhost:3000";
const getEmailUrl = () =>
  `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

interface RequestResult {
  response: Response;
  body: unknown;
}

interface EmailItem {
  id: string;
  text?: string;
  [key: string]: unknown;
}

async function request(
  path: string,
  options: RequestInit = {},
): Promise<RequestResult> {
  const url = `${getAppUrl()}${path}`;
  const response = await fetch(url, options);

  let body: unknown;
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      console.log(`No JSON body found for ${url}`);
    }
  }

  return { response, body };
}

async function waitForAllServices() {
  console.log("APP_URL:", process.env.APP_URL);
  console.log("EMAIL_HTTP_HOST:", process.env.EMAIL_HTTP_HOST);
  console.log("EMAIL_HTTP_PORT:", process.env.EMAIL_HTTP_PORT);
  const results = await Promise.allSettled([
    waitForWebServer(),
    waitForEmailServer(),
  ]);

  const failedErrors = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) => result.reason);

  if (failedErrors.length > 0) {
    throw new AggregateError(
      failedErrors,
      "Failed to start infrastructure services",
    );
  }
}

async function waitForWebServer() {
  return retry(fetchStatusPage, { retries: 100, maxTimeout: 1000 });
}

async function waitForEmailServer() {
  return retry(fetchEmailPage, { retries: 100, maxTimeout: 1000 });
}

async function fetchStatusPage() {
  const result = await request("/api/v1/status");

  if (result.response.status !== 200) {
    throw new Error(
      `Web server is not ready. Status: ${result.response.status}`,
    );
  }
}

async function fetchEmailPage() {
  const url = getEmailUrl();
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(
      `Email server is not ready at ${url}. Status: ${response.status}`,
    );
  }
}

async function cleanDatabase() {
  await db.execute(sql`drop schema public cascade; create schema public;`);
  await db.execute(sql`drop schema if exists drizzle cascade;`);
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject: Partial<CreateUserInput> = {}) {
  const newUser = await user.create({
    username:
      userObject.username || faker.internet.username().replace(/[.-]/g, ""),
    email: userObject.email || faker.internet.email(),
    password: userObject.password || "validP@ssw0rd",
  });
  return newUser;
}

async function createActivatedUser(userObject: Partial<CreateUserInput> = {}) {
  const userCreated = await createUser(userObject);
  return await activation.activateUserByUserId(userCreated.id);
}

async function addFeaturesToUser(
  userObject: { id: string },
  features: string[],
) {
  const updatedUser = await user.addFeatures(userObject.id, features);
  return updatedUser;
}

async function createSession(userId: string) {
  return await session.create(userId);
}

async function deleteAllEmails() {
  await fetch(`${getEmailUrl()}/messages`, { method: "DELETE" });
}

async function getLastEmail(): Promise<EmailItem | null> {
  const baseUrl = getEmailUrl();

  const emailListResponse = await fetch(`${baseUrl}/messages`);
  const emailListBody = (await emailListResponse.json()) as EmailItem[];

  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) return null;

  const emailTextResponse = await fetch(
    `${baseUrl}/messages/${lastEmailItem.id}.plain`,
  );
  lastEmailItem.text = await emailTextResponse.text();

  return lastEmailItem;
}

function extractUUID(text: string): string | null {
  const match = text.match(/[0-9a-fA-F-]{36}/);
  return match ? match[0] : null;
}

const orchestrator = {
  waitForAllServices,
  cleanDatabase,
  runPendingMigrations,
  request,
  createUser,
  createActivatedUser,
  addFeaturesToUser,
  createSession,
  deleteAllEmails,
  getLastEmail,
  extractUUID,
};

export default orchestrator;
