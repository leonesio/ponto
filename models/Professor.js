const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
const bcrypt = require('bcryptjs');
const Departamento = require('./Departamento');

const Professor = sequelize.define('Professor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  matricula: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
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
  },
  status: {
    type: DataTypes.ENUM('ativo', 'inativo'),
    defaultValue: 'ativo',
    allowNull: false
  }
});

// Método para verificar senha
Professor.prototype.verificarSenha = function(senha) {
  return bcrypt.compareSync(senha, this.senha);
};

// Relacionamento com Departamento
Professor.belongsTo(Departamento);
Departamento.hasMany(Professor);

module.exports = Professor;