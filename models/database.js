const mySql = require('mysql');

const pool = mySql.createPool({
    connectionLimit: 100,
    user:'csye6225',
    password:'hellohihi',
    database:'csye6225',
    host:'csye6225.c4jziesnpx3p.us-east-1.rds.amazonaws.com',
    port:"3306"
});

module.exports = pool;
