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

/*let sql= "INSERT INTO userdetails(username, first_name, last_name, password, account_created, account_updated,id) VALUES('jane.doeexample.com', 'Jane', 'DoePut', '$2b$10$1cHw/AHJT6lmvhD7Ste/5uMXSKeH3PHFSafl.1xJLg/RqdbXMdb9u', current_timestamp, current_timestamp,'18c619d4-cdcc-420a-b091-8f0677bd3364')";

pool.query(sql);*/
/*let sql2 =`SELECT id, first_name, last_name, password, account_created, account_updated from userdetails where username='jane.doeexample.com'`;

pool.query(sql2,(err,res)=>{
  if(err)throw err;
  console.log(res);
})*/
//console.log(currentUserValues);

module.exports = pool.promise();