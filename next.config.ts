import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes nativos/WASM ficam fora do bundle do servidor.
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "exceljs"],
  images: { unoptimized: true },
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // arquivos lidos em tempo de execução pelas funções
  outputFileTracingIncludes: { "/api/seed": ["./seed/**"] },
};

export default nextConfig;
