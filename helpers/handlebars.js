// Helpers personalizados para o Handlebars
const moment = require('moment-timezone');

module.exports = {
  // Helper para comparação de igualdade
  eq: function(a, b) {
    return a === b;
  },
  
  // Helper para comparação de desigualdade
  ne: function(a, b) {
    return a !== b;
  },
  
  // Helper para maior que
  gt: function(a, b) {
    return a > b;
  },
  
  // Helper para menor que
  lt: function(a, b) {
    return a < b;
  },
  
  // Helper para maior ou igual a
  gte: function(a, b) {
    return a >= b;
  },
  
  // Helper para menor ou igual a
  lte: function(a, b) {
    return a <= b;
  },
  
  // Helper para verificar se um valor está em um array
  includes: function(array, value) {
    return Array.isArray(array) && array.includes(value);
  },

  // Helper para formatar data no fuso horário do Brasil
  formatDate: function(date, format) {
    if (!date) return '';
    // Converte explicitamente para o fuso horário do Brasil antes de formatar
    return moment(date).tz('America/Sao_Paulo').format('DD/MM/YYYY');
  },

  // Helper para formatar data e hora no fuso horário do Brasil
  formatDateTime: function(date, format) {
    if (!date) return '';
    // Converte explicitamente para o fuso horário do Brasil antes de formatar
    return moment(date).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm');
  },
  
  // Helper para formatar apenas a hora no fuso horário do Brasil
  formatTime: function(time, format) {
    if (!time) return '';
    // Converte explicitamente para o fuso horário do Brasil antes de formatar
    return moment(time).tz('America/Sao_Paulo').format('HH:mm:ss');
  },
  
  // Helper para criar um array com um intervalo de números (para paginação)
  range: function(start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  },
  
  // Helper para adicionar valores (para paginação)
  add: function(a, b) {
    return parseInt(a) + parseInt(b);
  },
  
  // Helper para subtrair valores (para paginação)
  subtract: function(a, b) {
    return parseInt(a) - parseInt(b);
  }
};