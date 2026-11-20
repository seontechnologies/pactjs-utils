import path from 'node:path'
import { config } from 'dotenv'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import type { Client, Config } from '@libsql/client'
import { PrismaClient } from '../src/generated/prisma/client'

// Prisma 7 no longer loads .env, and the CLI resolves SQLite paths relative to
// prisma.config.ts (the backend root), so both are done here. This keeps the client working no matter which
// directory the process starts in (the pact provider tests start at the repo
// root, the backend tests and the server start in sample-app/backend).
config({ path: path.resolve(__dirname, '../.env'), quiet: true })

const toAbsoluteSqliteUrl = (url: string): string => {
  const filePath = url.replace(/^file:/, '')
  return path.isAbsolute(filePath)
    ? url
    : `file:${path.resolve(__dirname, '..', filePath)}`
}

// The libsql adapter has no busy timeout, so parallel test files writing to the
// same SQLite file fail with SQLITE_BUSY. Prisma 6's engine waited up to 5s;
// restore that. A local libsql client runs execute() synchronously, so the
// pragma is applied before the first Prisma query.
class SqliteLibSql extends PrismaLibSql {
  override createClient(config: Config): Client {
    const client = super.createClient(config)
    void client.execute('PRAGMA busy_timeout = 5000')
    return client
  }
}

type LogLevel = 'query' | 'info' | 'warn' | 'error'

export const createPrismaClient = (
  options: { log?: LogLevel[] } = {}
): PrismaClient => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  return new PrismaClient({
    ...options,
    adapter: new SqliteLibSql({ url: toAbsoluteSqliteUrl(url) })
  })
}

// Prisma notes
/*
To connect our applications to a database, we often use an Object-relational
Mapper (ORM). An ORM is a tool that sits between a database and an application.
It’s responsible for mapping database records to objects in an application.
Prisma is the most widely-used ORM for Next.js (or Node.js) applications.

1. **Define Models**: To use Prisma, first we have to define our data models.
   These are entities that represent our application domain, such as User,
   Order, Customer, etc. Each model has one or more fields (or properties).

 `npx prisma init` , and then at `./prisma/schema.prisma` create your models.

> We want to match these with our Zod types, ex: `./app/api/users/schema.ts`, `./app/api/products/schema.ts`

2. **Create migration file**: Once we create a model, we use Prisma CLI to
   create a migration file. A migration file contains instructions to generate
   or update database tables to match our models. These instructions are in SQL
   language, which is the language database engines understand.

 `npx prisma migrate dev`

3. **Create a Prisma client**: To connect with a database, we create an instance
   of PrismaClient. This client object gets automatically generated whenever we
   create a new migration. It exposes properties that represent our models (eg
   user).

 At `./prisma/client.ts` copy paste this code

```ts
import { PrismaClient } from '../src/generated/prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
*/
