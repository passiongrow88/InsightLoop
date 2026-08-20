declare const __V5_BUILD_COMMIT__: string;
declare const __V5_BUILD_TIMESTAMP__: string;

export const V5_BUILD_INFO = {
  version: "V5 P0",
  commit: __V5_BUILD_COMMIT__,
  builtAt: __V5_BUILD_TIMESTAMP__,
  environment: "Preview",
} as const;
