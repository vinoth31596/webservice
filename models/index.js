const Sequelize = require('sequelize');
const config = require('../config/dbConfig');
const sequelize = new Sequelize(
  config.DB,
  config.USER,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: config.dialect,
    operatorsAliases: false,
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      acquire: config.pool.acquire,
      Idle: config.pool.idle
    }
  }
);

const models = {};
models.Sequelize = Sequelize;
models.sequelize = sequelize;
models.user = require('../models/user.model')(sequelize, Sequelize);
models.images = require('../models/images.model')(sequelize, Sequelize);

module.exports = models;