const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Professor = require('../models/Professor');
const Departamento = require('../models/Departamento');
const Presenca = require('../models/Presenca');
const moment = require('moment-timezone');

// Middleware para verificar se o usuário está autenticado
const { ehProfessor, ehAdmin } = require('../middlewares/auth');

// Rota para a página de login do professor
router.get('/login', (req, res) => {
  if (req.session.user && req.session.user.tipo === 'professor') {
    return res.redirect('/professores/dashboard');
  }
  res.render('professores/login');
});

// Rota para logout do professor
router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

// Rota para processar o login do professor
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Busca o professor pelo email
    const professor = await Professor.findOne({ where: { email } });
    
    if (!professor) {
      req.session.error_msg = 'Email ou senha incorretos';
      return res.redirect('/professores/login');
    }
    
    // Verifica a senha
    const senhaCorreta = bcrypt.compareSync(senha, professor.senha);
    
    if (!senhaCorreta) {
      req.session.error_msg = 'Email ou senha incorretos';
      return res.redirect('/professores/login');
    }
    
    // Verifica se o professor está ativo
    if (professor.status !== 'ativo') {
      req.session.error_msg = 'Sua conta está inativa. Entre em contato com o administrador.';
      return res.redirect('/professores/login');
    }
    
    // Cria a sessão do usuário
    req.session.user = {
      id: professor.id,
      nome: professor.nome,
      email: professor.email,
      tipo: 'professor',
      departamentoId: professor.DepartamentoId
    };
    
    req.session.success_msg = 'Login realizado com sucesso!';
    res.redirect('/professores/dashboard');
    
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    req.session.error_msg = 'Erro ao fazer login. Tente novamente.';
    res.redirect('/professores/login');
  }
});

// Listar todos os professores
router.get('/', ehAdmin, async (req, res) => {
  try {
    // Paginação
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 10;
    const offset = (pagina - 1) * limite;
    
    // Busca todos os professores com paginação
    const { count, rows: professores } = await Professor.findAndCountAll({
      include: [{ model: Departamento }],
      order: [['nome', 'ASC']],
      limit: limite,
      offset: offset
    });
    
    // Calcula o total de páginas
    const totalPaginas = Math.ceil(count / limite);
    
    res.render('professores/listar', { 
      professores,
      paginaAtual: pagina,
      totalPaginas,
      temProximaPagina: pagina < totalPaginas,
      temPaginaAnterior: pagina > 1
    });
  } catch (error) {
    console.error('Erro ao listar professores:', error);
    req.session.error_msg = 'Erro ao listar professores';
    res.redirect('/admin/dashboard');
  }
});

// Formulário para adicionar professor
router.get('/adicionar', ehAdmin, async (req, res) => {
  try {
    const departamentos = await Departamento.findAll({ order: [['nome', 'ASC']] });
    res.render('professores/adicionar', { departamentos });
  } catch (error) {
    console.error('Erro ao carregar formulário de professor:', error);
    req.session.error_msg = 'Erro ao carregar formulário';
    res.redirect('/professores');
  }
});

// Adicionar professor
router.post('/adicionar', ehAdmin, async (req, res) => {
  try {
    const { nome, matricula, email, senha, status, DepartamentoId } = req.body;
    
    // Verifica se o email já está em uso
    const emailExiste = await Professor.findOne({ where: { email } });
    if (emailExiste) {
      req.session.error_msg = 'Este email já está em uso';
      return res.redirect('/professores/adicionar');
    }
    
    // Gera hash da senha
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senha, salt);
    
    // Verifica se a matrícula já está em uso
    const matriculaExiste = await Professor.findOne({ where: { matricula } });
    if (matriculaExiste) {
      req.session.error_msg = 'Já existe um professor com esta matrícula';
      return res.redirect('/professores/adicionar');
    }
    
    // Cria o professor
    await Professor.create({
      nome,
      matricula,
      email,
      senha: hash,
      status,
      DepartamentoId
    });
    
    req.session.success_msg = 'Professor adicionado com sucesso!';
    res.redirect('/professores');
    
  } catch (error) {
    console.error('Erro ao adicionar professor:', error);
    req.session.error_msg = 'Erro ao adicionar professor';
    res.redirect('/professores/adicionar');
  }
});

// Visualizar professor
router.get('/visualizar/:id', ehAdmin, async (req, res) => {
  try {
    const professor = await Professor.findByPk(req.params.id, {
      include: [{ model: Departamento }]
    });
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores');
    }
    
    res.render('professores/visualizar', { professor });
    
  } catch (error) {
    console.error('Erro ao visualizar professor:', error);
    req.session.error_msg = 'Erro ao visualizar professor';
    res.redirect('/professores');
  }
});

// Formulário para editar professor
router.get('/editar/:id', ehAdmin, async (req, res) => {
  try {
    const professor = await Professor.findByPk(req.params.id);
    const departamentos = await Departamento.findAll({ order: [['nome', 'ASC']] });
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores');
    }
    
    res.render('professores/editar', { professor, departamentos });
    
  } catch (error) {
    console.error('Erro ao carregar formulário de edição:', error);
    req.session.error_msg = 'Erro ao carregar formulário de edição';
    res.redirect('/professores');
  }
});

// Editar professor
router.put('/editar/:id', ehAdmin, async (req, res) => {
  try {
    const { nome, matricula, email, senha, status, DepartamentoId } = req.body;
    const professor = await Professor.findByPk(req.params.id);
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores');
    }
    
    // Verifica se o email já está em uso por outro professor
    if (email !== professor.email) {
      const emailExiste = await Professor.findOne({ where: { email } });
      if (emailExiste) {
        req.session.error_msg = 'Este email já está em uso';
        return res.redirect(`/professores/editar/${req.params.id}`);
      }
    }
    
    // Verifica se a matrícula já está em uso por outro professor
    if (matricula !== professor.matricula) {
      const matriculaExiste = await Professor.findOne({ where: { matricula } });
      if (matriculaExiste) {
        req.session.error_msg = 'Esta matrícula já está em uso';
        return res.redirect(`/professores/editar/${req.params.id}`);
      }
    }
    
    // Atualiza os dados do professor
    professor.nome = nome;
    professor.matricula = matricula;
    professor.email = email;
    professor.status = status;
    professor.DepartamentoId = DepartamentoId;
    
    // Se forneceu nova senha, atualiza a senha
    if (senha && senha.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(senha, salt);
      professor.senha = hash;
    }
    
    await professor.save();
    
    req.session.success_msg = 'Professor atualizado com sucesso!';
    res.redirect('/professores');
    
  } catch (error) {
    console.error('Erro ao editar professor:', error);
    req.session.error_msg = 'Erro ao editar professor';
    res.redirect(`/professores/editar/${req.params.id}`);
  }
});

// Excluir professor
router.delete('/excluir/:id', ehAdmin, async (req, res) => {
  try {
    const professor = await Professor.findByPk(req.params.id);
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores');
    }
    
    // Verifica se o professor possui registros de presença
    const presencas = await Presenca.findOne({
      where: { ProfessorId: professor.id }
    });
    
    if (presencas) {
      req.session.error_msg = 'Este professor possui registros de presença e não pode ser excluído';
      return res.redirect('/professores');
    }
    
    await professor.destroy();
    
    req.session.success_msg = 'Professor excluído com sucesso!';
    res.redirect('/professores');
    
  } catch (error) {
    console.error('Erro ao excluir professor:', error);
    req.session.error_msg = 'Erro ao excluir professor';
    res.redirect('/professores');
  }
});

// Rota para o dashboard do professor
router.get('/dashboard', async (req, res) => {
  try {
    // Verifica se o usuário está logado e é um professor
    if (!req.session.user || req.session.user.tipo !== 'professor') {
      req.session.error_msg = 'Você precisa estar logado como professor para acessar esta página';
      return res.redirect('/professores/login');
    }
    
    // Busca os dados do professor
    const professor = await Professor.findByPk(req.session.user.id, {
      include: [{ model: Departamento }]
    });
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores/login');
    }
    
    // Formata a data atual no formato dia/mês/ano para exibição
    const dataAtual = moment().tz('America/Sao_Paulo').format('DD/MM/YYYY');
    
    // Formata a data atual no formato ISO para busca no banco
    const dataAtualISO = moment().tz('America/Sao_Paulo').format('YYYY-MM-DD');
    
    // Verifica se o professor já registrou presença hoje
    const presencaHoje = await Presenca.findOne({
      where: {
        ProfessorId: professor.id,
        data: dataAtualISO
      }
    });
    
    // Busca o histórico de presenças do professor
    const presencas = await Presenca.findAll({
      where: { ProfessorId: professor.id },
      order: [['data', 'DESC']],
      limit: 30
    });
    
    res.render('professores/dashboard', {
      professor,
      dataAtual,
      jaRegistrouHoje: !!presencaHoje,
      horaRegistroHoje: presencaHoje ? moment(presencaHoje.hora_registro).tz('America/Sao_Paulo').format('HH:mm:ss') : null,
      presencas
    });
    
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    req.session.error_msg = 'Erro ao carregar dashboard';
    res.redirect('/professores/login');
  }
});

// Rota para registrar presença
router.post('/registrar-presenca', async (req, res) => {
  try {
    // Verifica se o usuário está logado e é um professor
    if (!req.session.user || req.session.user.tipo !== 'professor') {
      req.session.error_msg = 'Você precisa estar logado como professor para registrar presença';
      return res.redirect('/professores/login');
    }
    
    const { data } = req.body;
    const professorId = req.session.user.id;
    
    // Converte a data do formato DD/MM/YYYY para YYYY-MM-DD com timezone
    let dataFormatada;
    
    if (data.includes('/')) {
      // Se a data vier no formato DD/MM/YYYY
      dataFormatada = moment(data, 'DD/MM/YYYY').format('YYYY-MM-DD');
    } else {
      // Se a data já vier no formato YYYY-MM-DD
      dataFormatada = moment(data, 'YYYY-MM-DD').format('YYYY-MM-DD');
    }
    
    // Verifica se já existe registro para esta data
    const registroExistente = await Presenca.findOne({
      where: {
        ProfessorId: professorId,
        data: dataFormatada
      }
    });
    
    if (registroExistente) {
      req.session.error_msg = 'Você já registrou presença nesta data';
      return res.redirect('/professores/dashboard');
    }
    
    // Cria o registro de presença
    const presenca = await Presenca.create({
      data: dataFormatada,
      hora_registro: moment().tz('America/Sao_Paulo'),
      ProfessorId: professorId,
      retroativo: false,
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

// Rota para registrar presença retroativa
router.post('/registrar-presenca-retroativa', async (req, res) => {
  try {
    // Verifica se o usuário está logado e é um professor
    if (!req.session.user || req.session.user.tipo !== 'professor') {
      req.session.error_msg = 'Você precisa estar logado como professor para registrar presença';
      return res.redirect('/professores/login');
    }
    
    const { data, justificativa } = req.body;
    const professorId = req.session.user.id;
    
    // Converte a data para o formato YYYY-MM-DD se estiver no formato DD/MM/YYYY
    let dataFormatada;
    
    // Se a data vier no formato DD/MM/YYYY (do input hidden)
    if (data.includes('/')) {
      // Usa o moment.js para converter a data especificando o formato sem aplicar timezone
      dataFormatada = moment(data, 'DD/MM/YYYY').format('YYYY-MM-DD');
    } else {
      // Se a data vier no formato YYYY-MM-DD (do input type="date")
      // Preserva a data original sem aplicar timezone
      dataFormatada = moment(data, 'YYYY-MM-DD').format('YYYY-MM-DD');
    }
    
    // Verifica se já existe registro para esta data
    const registroExistente = await Presenca.findOne({
      where: {
        ProfessorId: professorId,
        data: dataFormatada
      }
    });
    
    if (registroExistente) {
      req.session.error_msg = 'Você já registrou presença nesta data';
      return res.redirect('/professores/dashboard');
    }
    
    // Cria o registro de presença retroativa
    const presenca = await Presenca.create({
      data: dataFormatada,
      hora_registro: moment().tz('America/Sao_Paulo'),
      ProfessorId: professorId,
      retroativo: true,
      justificativa,
      status: 'pendente'
    });
    
    req.session.success_msg = 'Solicitação de presença retroativa enviada com sucesso! Aguarde aprovação.';
    res.redirect('/professores/dashboard');
    
  } catch (error) {
    console.error('Erro ao registrar presença retroativa:', error);
    req.session.error_msg = 'Erro ao registrar presença retroativa';
    res.redirect('/professores/dashboard');
  }
});

// Rota para visualizar histórico de presenças
router.get('/historico', async (req, res) => {
  try {
    // Verifica se o usuário está logado e é um professor
    if (!req.session.user || req.session.user.tipo !== 'professor') {
      req.session.error_msg = 'Você precisa estar logado como professor para acessar esta página';
      return res.redirect('/professores/login');
    }
    
    const professor = await Professor.findByPk(req.session.user.id, {
      include: [{ model: Departamento }]
    });
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores/login');
    }
    
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

// Rota para perfil do professor
router.get('/perfil', async (req, res) => {
  try {
    // Verifica se o usuário está logado e é um professor
    if (!req.session.user || req.session.user.tipo !== 'professor') {
      req.session.error_msg = 'Você precisa estar logado como professor para acessar esta página';
      return res.redirect('/professores/login');
    }
    
    const professor = await Professor.findByPk(req.session.user.id, {
      include: [{ model: Departamento }]
    });
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores/login');
    }
    
    // Busca todos os departamentos para o select
    const departamentos = await Departamento.findAll({ order: [['nome', 'ASC']] });
    
    res.render('professores/perfil', {
      professor,
      departamentos
    });
    
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    req.session.error_msg = 'Erro ao carregar perfil';
    res.redirect('/professores/dashboard');
  }
});

// Rota para atualizar perfil do professor
router.post('/perfil', ehProfessor, async (req, res) => {
  try {
    const { nome, email, senha_atual, nova_senha, DepartamentoId } = req.body;
    // Note: matricula is not included in the update as it's read-only in the profile form
    const professor = await Professor.findByPk(req.session.user.id);
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/professores/login');
    }
    
    // Verifica se o email já está em uso por outro professor
    if (email !== professor.email) {
      const emailExiste = await Professor.findOne({ where: { email } });
      if (emailExiste) {
        req.session.error_msg = 'Este email já está em uso';
        return res.redirect('/professores/perfil');
      }
    }
    
    // Atualiza os dados do professor
    professor.nome = nome;
    professor.email = email;
    professor.DepartamentoId = DepartamentoId;
    
    // Se forneceu senha atual e nova senha, atualiza a senha
    if (senha_atual && nova_senha) {
      // Verifica se a senha atual está correta
      const senhaCorreta = bcrypt.compareSync(senha_atual, professor.senha);
      if (!senhaCorreta) {
        req.session.error_msg = 'Senha atual incorreta';
        return res.redirect('/professores/perfil');
      }
      
      // Gera hash da nova senha
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(nova_senha, salt);
      professor.senha = hash;
    }
    
    await professor.save();
    
    // Atualiza a sessão
    req.session.user.nome = professor.nome;
    req.session.user.email = professor.email;
    req.session.user.departamentoId = professor.DepartamentoId;
    
    req.session.success_msg = 'Perfil atualizado com sucesso!';
    res.redirect('/professores/perfil');
    
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    req.session.error_msg = 'Erro ao atualizar perfil';
    res.redirect('/professores/perfil');
  }
});

module.exports = router;