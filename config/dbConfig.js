module.exports = {
    HOST: process.env.DB_HOSTNAME|| 'csye6225.c4jziesnpx3p.us-east-1.rds.amazonaws.com',
    USER: process.env.DB_USERNAME||'csye6225',
    PASSWORD: process.env.DB_PASSWORD||'hellohihi',
    DB: process.env.DB_NAME||'csye6225',
    dialect: "mysql",
    dialectOptions:{
        ssl: 'Amazon RDS'
    },
    port: process.env.DB_PORT||'3306',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};