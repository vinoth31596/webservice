const {createPool} = require('mysql2')
const pool =  createPool({  
  host: 'localhost',
  user: 'root',
  password: 'Passme@1234',
  database: 'users',
  connectionLimit: 100  
});


module.exports=pool.promise();
