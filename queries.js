const {
  createPool
} = require('mysql2')
const pool = createPool({
  host: process.env.DB_HOSTNAME || 'csye6225.c4jziesnpx3p.us-east-1.rds.amazonaws.com',
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USERNAME || 'csye6225',
  password: process.env.DB_PASSWORD || 'hellohihi',
  database: process.env.DB_NAME || 'csye6225',
  connectionLimit: 100
});


module.exports = pool.promise();