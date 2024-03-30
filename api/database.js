require('dotenv').config()
const knex = require('knex')

const heroku = {
    ssl: { rejectUnauthorized: false },
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
}

const local = {
    host: process.env.DB_HOST_LOCAL,
    user: process.env.DB_USER_LOCAL,
    password: process.env.DB_PASSWORD_LOCAL,
    database: process.env.DB_DATABASE_LOCAL,
}

const local_debi = {
    host: process.env.DB_HOST_LOCAL_DEBIAN,
    user: process.env.DB_USER_LOCAL_DEBIAN,
    password: process.env.DB_PASSWORD_LOCAL_DEBIAN,
    database: process.env.DB_DATABASE_LOCAL_DEBIAN,
}

const db = knex({
    client: 'pg',
    connection: local,
})

module.exports = db
