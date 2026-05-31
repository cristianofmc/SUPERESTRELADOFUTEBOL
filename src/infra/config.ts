function getOrigin(): string {
  const nodeEnv = process.env.NODE_ENV || "development";

  if (["test", "development"].includes(nodeEnv)) {
    return "http://localhost:3000";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "https://tab-news.cristianofelipe.com";
}

function getAppName(): string {
  return process.env.APP_NAME || "SEF";
}

function getContactEmail(): string {
  return process.env.APP_CONTACT_EMAIL || "contact@cristianofelipe.com";
}

const config = {
  origin: getOrigin(),
  appName: getAppName(),
  appEmail: getContactEmail(),
} as const;

export default config;
