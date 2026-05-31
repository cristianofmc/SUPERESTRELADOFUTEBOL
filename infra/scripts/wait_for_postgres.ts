import { exec, ExecException } from "node:child_process";

function checkPostgres(): void {
  exec("podman exec postgres-dev pg_isready --host localhost", handleReturn);

  function handleReturn(error: ExecException | null, stdout: string): void {
    if (error && !error.message.includes("rejecting connections")) {
      console.error(
        `\n[Critical Error] Failed to check Postgres: ${error.message}`,
      );
      process.exit(1);
    }

    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(".");
      setTimeout(checkPostgres, 1000);
      return;
    }

    console.log("\n[◯] Postgres is ready to accept connections\n");
  }
}

process.stdout.write("\n\n[…] Waiting for Postgres to accept connections.");
checkPostgres();
