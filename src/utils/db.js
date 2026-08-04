import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER || 'cognodb';
const password = process.env.NEO4J_PASSWORD;

if (!uri || !password) {
  console.warn(
    '[db] Missing NEO4J_URI or NEO4J_PASSWORD. Create server/.env with CognoDB credentials.'
  );
}

let driver = null;

export function getDriver() {
  if (!driver) {
    if (!uri || !password) {
      throw new Error('Database not configured: set NEO4J_URI and NEO4J_PASSWORD in .env');
    }
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function withSession(work) {
  const d = getDriver();
  const session = d.session();
  try {
    return await work(session);
  } finally {
    await session.close();
  }
}

export async function verifyConnectivity() {
  const d = getDriver();
  await d.verifyConnectivity();
  return true;
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
