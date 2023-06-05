const knex = require('knex')({
    client: 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        port: process.env.DB_PORT,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
    pool: { min: 0, max: 7 }
});
knex.raw('SELECT 1').then(() => {
    console.log('Connected to the database');
}).catch((err) => {
    console.log('Error connecting to the database:', err);
});
module.exports = knex;