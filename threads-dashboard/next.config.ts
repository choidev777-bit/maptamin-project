import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDev && {
    turbopack: {
      root: ".",
    },
  }),
};

export default nextConfig;
