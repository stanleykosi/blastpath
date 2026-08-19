if (process.env.SKIP_HYDRADB_INTEGRATION === "true") {
  process.stderr.write(
    "Verification stopped: SKIP_HYDRADB_INTEGRATION=true would skip required HydraDB tests.\n",
  );
  process.exitCode = 1;
}
