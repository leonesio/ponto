const express = require('express');
const router = express.Router();
const Departamento = require('../models/Departamento');
const Professor = require('../models/Professor');

// Middleware para verificar se o usuário está autenticado
const { ehAdmin } = require('../middlewares/auth');

// Listar todos os departamentos
router.get('/', ehAdmin, async (req, res) => {
  try {
    // Paginação
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 10;
    const offset = (pagina - 1) * limite;
    
    // Busca todos os departamentos com paginação
    const { count, rows: departamentos } = await Departamento.findAndCountAll({
      include: [{ model: Professor }],
      order: [['nome', 'ASC']],
      limit: limite,
      offset: offset
    });
    
    // Calcula o total de páginas
    const totalPaginas = Math.ceil(count / limite);
    
    res.render('departamentos/listar', { 
      departamentos,
      paginaAtual: pagina,
      totalPaginas,
      temProximaPagina: pagina < totalPaginas,
      temPaginaAnterior: pagina > 1
    });
  } catch (error) {
    console.error('Erro ao listar departamentos:', error);
    req.session.error_msg = 'Erro ao listar departamentos';
    res.redirect('/admin/dashboard');
  }
});

// Formulário para adicionar departamento
router.get('/adicionar', ehAdmin, (req, res) => {
  res.render('departamentos/adicionar');
});

// Adicionar departamento
router.post('/adicionar', ehAdmin, async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    
    // Verifica se o nome já está em uso
    const nomeExiste = await Departamento.findOne({ where: { nome } });
    if (nomeExiste) {
      req.session.error_msg = 'Já existe um departamento com este nome';
      return res.redirect('/departamentos/adicionar');
    }
    
    // Cria o departamento
    await Departamento.create({
      nome,
      descricao
    });
    
    req.session.success_msg = 'Departamento adicionado com sucesso!';
    res.redirect('/departamentos');
    
  } catch (error) {
    console.error('Erro ao adicionar departamento:', error);
    req.session.error_msg = 'Erro ao adicionar departamento';
    res.redirect('/departamentos/adicionar');
  }
});

// Visualizar departamento
router.get('/visualizar/:id', ehAdmin, async (req, res) => {
  try {
    const departamento = await Departamento.findByPk(req.params.id, {
      include: [{ model: Professor }]
    });
    
    if (!departamento) {
      req.session.error_msg = 'Departamento não encontrado';
      return res.redirect('/departamentos');
    }
    
    res.render('departamentos/visualizar', { departamento });
    
  } catch (error) {
    console.error('Erro ao visualizar departamento:', error);
    req.session.error_msg = 'Erro ao visualizar departamento';
    res.redirect('/departamentos');
  }
});

// Formulário para editar departamento
router.get('/editar/:id', ehAdmin, async (req, res) => {
  try {
    const departamento = await Departamento.findByPk(req.params.id);
    
    if (!departamento) {
      req.session.error_msg = 'Departamento não encontrado';
      return res.redirect('/departamentos');
    }
    
    res.render('departamentos/editar', { departamento });
    
  } catch (error) {
    console.error('Erro ao carregar formulário de edição:', error);
    req.session.error_msg = 'Erro ao carregar formulário de edição';
    res.redirect('/departamentos');
  }
});

// Editar departamento
router.put('/editar/:id', ehAdmin, async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const departamento = await Departamento.findByPk(req.params.id);
    
    if (!departamento) {
      req.session.error_msg = 'Departamento não encontrado';
      return res.redirect('/departamentos');
    }
    
    // Verifica se o nome já está em uso por outro departamento
    if (nome !== departamento.nome) {
      const nomeExiste = await Departamento.findOne({ where: { nome } });
      if (nomeExiste) {
        req.session.error_msg = 'Já existe um departamento com este nome';
        return res.redirect(`/departamentos/editar/${req.params.id}`);
      }
    }
    
    // Atualiza os dados do departamento
    departamento.nome = nome;
    departamento.descricao = descricao;
    
    await departamento.save();
    
    req.session.success_msg = 'Departamento atualizado com sucesso!';
    res.redirect('/departamentos');
    
  } catch (error) {
    console.error('Erro ao editar departamento:', error);
    req.session.error_msg = 'Erro ao editar departamento';
    res.redirect(`/departamentos/editar/${req.params.id}`);
  }
});

// Excluir departamento
router.delete('/excluir/:id', ehAdmin, async (req, res) => {
  try {
    const departamento = await Departamento.findByPk(req.params.id, {
      include: [{ model: Professor }]
    });
    
    if (!departamento) {
      req.session.error_msg = 'Departamento não encontrado';
      return res.redirect('/departamentos');
    }
    
    // Verifica se há professores associados ao departamento
    if (departamento.Professors && departamento.Professors.length > 0) {
      req.session.error_msg = 'Este departamento possui professores associados e não pode ser excluído';
      return res.redirect('/departamentos');
    }
    
    await departamento.destroy();
    
    req.session.success_msg = 'Departamento excluído com sucesso!';
    res.redirect('/departamentos');
    
  } catch (error) {
    console.error('Erro ao excluir departamento:', error);
    req.session.error_msg = 'Erro ao excluir departamento';
    res.redirect('/departamentos');
  }
});

module.exports = router;