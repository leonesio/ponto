const express = require('express');
const router = express.Router();
const Professor = require('../models/Professor');
const Presenca = require('../models/Presenca');
const { ehProfessor } = require('../middlewares/auth');
const moment = require('moment-timezone');

// Rota para o dashboard do professor
router.get('/dashboard', ehProfessor, async (req, res) => {
  try {
    const professor = await Professor.findByPk(req.session.user.id);
    const hoje = moment().tz('America/Sao_Paulo').format('YYYY-MM-DD');
    
    // Busca a presença do dia atual
    const presencaHoje = await Presenca.findOne({
      where: {
        ProfessorId: professor.id,
        data: hoje
      }
    });
    
    // Busca o histórico das últimas presenças
    const historicoPresencas = await Presenca.findAll({
      where: {
        ProfessorId: professor.id
      },
      order: [['data', 'DESC']],
      limit: 10
    });
    
    res.render('professores/dashboard', {
      professor,
      presencaHoje,
      historicoPresencas,
      jaRegistrouHoje: presencaHoje ? true : false,
      horaRegistroHoje: presencaHoje ? moment(presencaHoje.hora).format('HH:mm:ss') : null})
    
  } catch (error) {
    console.error('Erro ao carregar dashboard do professor:', error);
    req.session.error_msg = 'Erro ao carregar dashboard';
    res.redirect('/');
  }
});

// Rota para registrar presença
router.post('/presenca/registrar', ehProfessor, async (req, res) => {
  try {
    const professor = await Professor.findByPk(req.session.user.id);
    const hoje = moment().tz('America/Sao_Paulo').format('YYYY-MM-DD');
    
    // Verifica se já existe presença registrada hoje
    const presencaExistente = await Presenca.findOne({
      where: {
        ProfessorId: professor.id,
        data: hoje
      }
    });
    
    if (presencaExistente) {
      req.session.error_msg = 'Você já registrou presença hoje';
      return res.redirect('/professores/dashboard');
    }
    
    // Registra a presença
    await Presenca.create({
      ProfessorId: professor.id,
      data: hoje,
      hora_registro: moment().tz('America/Sao_Paulo'),
      status: 'aprovado'
    });
    
    req.session.success_msg = 'Presença registrada com sucesso!';
    res.redirect('/professores/dashboard');
    
  } catch (error) {
    console.error('Erro ao registrar presença:', error);
    req.session.error_msg = 'Erro ao registrar presença';
    res.redirect('/professores/dashboard');
  }
});

// Rota para solicitar presença retroativa
router.get('/solicitar-presenca', ehProfessor, (req, res) => {
  res.render('professores/solicitar-presenca');
});

// Rota para processar solicitação de presença retroativa
router.post('/solicitar-presenca', ehProfessor, async (req, res) => {
  try {
    const { data, justificativa } = req.body;
    const professor = await Professor.findByPk(req.session.user.id);
    
    // Verifica se já existe presença registrada para esta data
    const presencaExistente = await Presenca.findOne({
      where: {
        ProfessorId: professor.id,
        data
      }
    });
    
    if (presencaExistente) {
      req.session.error_msg = 'Você já possui uma presença registrada para esta data';
      return res.redirect('/professores/solicitar-presenca');
    }
    
    // Registra a solicitação de presença retroativa
    await Presenca.create({
      ProfessorId: professor.id,
      data,
      hora_registro: moment().tz('America/Sao_Paulo'),
      retroativo: true,
      justificativa,
      status: 'pendente'
    });
    
    req.session.success_msg = 'Solicitação de presença retroativa enviada com sucesso! Aguarde a aprovação do administrador.';
    res.redirect('/professores/dashboard');
    
  } catch (error) {
    console.error('Erro ao solicitar presença retroativa:', error);
    req.session.error_msg = 'Erro ao solicitar presença retroativa';
    res.redirect('/professores/solicitar-presenca');
  }
});

// Rota para visualizar histórico de presenças
router.get('/historico', ehProfessor, async (req, res) => {
  try {
    const professor = await Professor.findByPk(req.session.user.id);
    
    // Paginação
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 10;
    const offset = (pagina - 1) * limite;
    
    // Busca as presenças do professor com paginação
    const { count, rows: presencas } = await Presenca.findAndCountAll({
      where: {
        ProfessorId: professor.id
      },
      order: [['data', 'DESC']],
      limit: limite,
      offset: offset
    });
    
    // Calcula o total de páginas
    const totalPaginas = Math.ceil(count / limite);
    
    res.render('professores/historico', {
      professor,
      presencas,
      paginaAtual: pagina,
      totalPaginas,
      temProximaPagina: pagina < totalPaginas,
      temPaginaAnterior: pagina > 1
    });
    
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    req.session.error_msg = 'Erro ao carregar histórico';
    res.redirect('/professores/dashboard');
  }
});

module.exports = router;