const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
const bcrypt = require('bcryptjs');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Método para verificar senha
Admin.prototype.verificarSenha = function(senha) {
  return bcrypt.compareSync(senha, this.senha);
};

module.exports = Admin;