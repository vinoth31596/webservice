module.exports = (sequelize, DataTypes)=>{
    const Images = sequelize.define("images", {
      id: {
        allowNull: false,        
        type: DataTypes.STRING,
        primaryKey:true,
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull:false,
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull:false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull:false,
      },
      upload_date: {
          type: 'TIMESTAMP',
          allowNull: false,
          default: DataTypes.literal('CURRENT_TIMESTAMP')
      }
    });
    return Images;
  }