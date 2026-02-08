/* Orchestrates docker compose + Prisma for local dev reset.
 * Requirements: Docker, docker compose, Node.js
 */
const { execSync, spawnSync } = require('child_process');

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
}

async function main() {
  try {
    run('docker compose down -v');
    run('docker compose up -d postgres');

    // Wait for Postgres to be healthy
    const start = Date.now();
    const timeoutMs = 60_000;
    while (true) {
      try {
        run('docker compose exec -T postgres pg_isready -U nextage -d nextage_db');
        break;
      } catch (e) {
        if (Date.now() - start > timeoutMs) throw e;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Prisma generate + push
    run('npx prisma generate');
    run('npx prisma db push --accept-data-loss');

    // Seed via data-generator container (optional)
    try {
      run('docker compose run --rm data-generator');
    } catch (e) {
      console.warn('Data generator failed or not available; continuing.');
    }

    console.log('Database reset completed.');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
