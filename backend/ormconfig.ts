import * as Path from 'path';

import { ConnectionOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const dbOptions: ConnectionOptions = {
  type: 'postgres',
  
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

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
  migrationsRun: process.env.NO_MIGRATIONS !== '1',

  namingStrategy: new SnakeNamingStrategy(),
};

module.exports = dbOptions;
