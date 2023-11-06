// (c) Meta Platforms, Inc. and affiliates. Copyright
import { getSecretValue } from "./secrets";

const production = process.env.NODE_ENV === "production";

export async function settings() {
  return {
    production,
    elasticache: production
      ? ((await getSecretValue("prod/isptoolbox_django")) as any).elastiCache
      : "redis://redis:6379",
  };
}
