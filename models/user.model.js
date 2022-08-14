module.exports = (sequelize, DataTypes)=>{
    const User = sequelize.define("userdetails", {
      id: {
        allowNull: false,        
        type: DataTypes.STRING,
        primaryKey:true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull:false,
        unique: true
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull:false,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull:false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull:false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Not Verified"
    },
    });
    return User;
  }