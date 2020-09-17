import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

const dbOptions: PostgresConnectionOptions = {
  type: 'postgres',
  
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  migrations: [`${__dirname}/db/migrations`],
  entities: [`${__dirname}/db/entities`],
};

export default dbOptions;
