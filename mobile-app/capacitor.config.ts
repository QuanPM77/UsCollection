import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnvValue(envPath: string, key: string) {
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => new RegExp(`^${key}\\s*=`).test(entry));
  const value = line?.slice(line.indexOf("=") + 1).trim();
  return value?.replace(/^(["'])(.*)\1$/, "$2");
}

const siteUrl = process.env.CAPACITOR_SERVER_URL
  ?? readEnvValue(resolve(__dirname, ".env"), "CAPACITOR_SERVER_URL")
  ?? process.env.APP_URL
  ?? readEnvValue(resolve(__dirname, "../.env"), "APP_URL");

if (!siteUrl) {
  throw new Error(
    "Set CAPACITOR_SERVER_URL to the deployed UsStory HTTPS address, or set APP_URL in the web project's root .env file.",
  );
}

const parsedSiteUrl = new URL(siteUrl);
if (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost" && parsedSiteUrl.hostname !== "10.0.2.2") {
  throw new Error("The mobile app website URL must use HTTPS, except for localhost Android emulator development.");
}

const config: CapacitorConfig = {
  appId: "com.usstory.mobile",
  appName: "UsStory",
  webDir: "www",
  server: {
    url: parsedSiteUrl.toString().replace(/\/$/, ""),
    cleartext: parsedSiteUrl.protocol === "http:",
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SocialLogin: {
      providers: { google: true },
      logLevel: 1,
    },
  },
};

export default config;
