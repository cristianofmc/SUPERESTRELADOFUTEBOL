import { exec } from "node:child_process";

function checkPostgres() {
  exec("podman exec postgres-dev pg_isready --host localhost", handleReturn);

  function handleReturn(error: Error | null, stdout: string) {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(".");
      setTimeout(checkPostgres, 500);
      return;
    }
    console.log("\n[◯] Postgres is ready to accept connections\n");
  }
}

process.stdout.write("\n[…] Waiting for Postgres to accept connections.");
setTimeout(checkPostgres, 2000);
