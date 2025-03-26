const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
const Professor = require('./Professor');

const Presenca = sequelize.define('Presenca', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hora_registro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  retroativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  justificativa: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('aprovado', 'pendente', 'reprovado'),
    defaultValue: 'aprovado',
    allowNull: false
  }
});

// Relacionamento com Professor
Presenca.belongsTo(Professor);
Professor.hasMany(Presenca);

module.exports = Presenca;