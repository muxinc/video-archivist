import * as Path from 'path';
import * as GetEnv from 'getenv';

import { ConnectionOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const dbOptions: ConnectionOptions = {
  type: 'postgres',
  
  host: GetEnv.string('DB_HOST'),
  port: GetEnv.int('DB_PORT'),
  username: GetEnv.string('DB_USERNAME'),
  password: GetEnv.string('DB_PASSWORD'),
  database: GetEnv.string('DB_NAME', GetEnv.string('DB_USERNAME')),

  migrations: [
    Path.resolve(__dirname, 'db', 'migrations', '*.{ts,js}'),
  ],
  entities: [
    Path.resolve(__dirname, '**', '*.entity.{ts,js}'),
  ],

  cli: {
    migrationsDir: `./db/migrations`,
    entitiesDir: `./db/entities`,
  },

  logging: true,
  synchronize: false,
  migrationsRun: !GetEnv.boolish('NO_MIGRATIONS', false),

  namingStrategy: new SnakeNamingStrategy(),
};

module.exports = dbOptions;
