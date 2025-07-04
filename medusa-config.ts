import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", "../../..");

const createConfig = async () => {
  return defineConfig({
    projectConfig: {
      databaseUrl: process.env.DATABASE_URL,
      http: {
        storeCors: process.env.STORE_CORS!,
        adminCors: process.env.ADMIN_CORS!,
        authCors: process.env.AUTH_CORS!,
      },
    },
    modules: [
      {
        resolve: "./src/modules/content-generator",
        options: {
          deepseek_api_key: "ss",
        },
      },
    ],
  });
};

module.exports = createConfig();
