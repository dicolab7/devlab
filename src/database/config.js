import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtém o diretório raiz do projeto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuração do pool de conexão
const dbConfig = {};

// Priorizar DATABASE_URL (usada no Render)
if (process.env.DATABASE_URL) {
  dbConfig.connectionString = process.env.DATABASE_URL;
  dbConfig.ssl = { rejectUnauthorized: false }; // Necessário para o Render
} else {
  // Configurações para ambiente local
  dbConfig.database = process.env.DB_NAME;
  dbConfig.user = process.env.DB_USER;
  dbConfig.password = process.env.DB_PASSWORD;
  dbConfig.host = process.env.DB_HOST;
  dbConfig.port = process.env.DB_PORT || 5432;
  dbConfig.ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
}

// Criar o pool de conexão
const pool = new Pool(dbConfig);

// Testar a conexão
pool.connect()
  .then(() => console.log('Conexão com o banco de dados estabelecida com sucesso.'))
  .catch((error) => console.error('Erro ao conectar ao banco de dados:', error));

// Exportar o pool diretamente
export default pool; //

// import { Pool } from 'pg';
// import dotenv from 'dotenv';
// import path from 'path';
// import { fileURLToPath } from 'url';

// // Obtém o diretório raiz do projeto
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// console.log('Variáveis de ambiente:', {
//   DATABASE_URL: process.env.DATABASE_URL ? '******' : 'undefined',
//   DB_NAME: process.env.DB_NAME,
//   DB_USER: process.env.DB_USER,
//   DB_PASSWORD: process.env.DB_PASSWORD ? '******' : 'undefined',
//   DB_HOST: process.env.DB_HOST,
//   DB_PORT: process.env.DB_PORT,
//   DB_SSL: process.env.DB_SSL,
// });

// // Configuração do pool de conexão com pg
// const dbConfig = {
//   database: process.env.DB_NAME,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT || 5432,
//   ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
// };

// // Se DATABASE_URL estiver definida, usá-la diretamente
// if (process.env.DATABASE_URL) {
//   dbConfig.connectionString = process.env.DATABASE_URL;
//   dbConfig.ssl = { rejectUnauthorized: false };
// }

// const pool = new Pool(dbConfig);

// // Testar a conexão
// pool.connect()
//   .then(() => console.log('Conexão com o banco de dados estabelecida com sucesso.'))
//   .catch((error) => console.error('Erro ao conectar ao banco de dados:', error));

// // Exportar o pool diretamente
// export default dbConfig;