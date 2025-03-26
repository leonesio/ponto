const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Professor = require('../models/Professor');
const Departamento = require('../models/Departamento');
const Presenca = require('../models/Presenca');
const moment = require('moment-timezone');

// Middleware para verificar se o usuário está autenticado
const { ehAdmin } = require('../middlewares/auth');

// Rota para a página de login
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login');
});

// Rota para processar o login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Busca o admin pelo email
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      req.session.error_msg = 'Email ou senha incorretos';
      return res.redirect('/admin/login');
    }
    
    // Verifica a senha
    const senhaCorreta = admin.verificarSenha(senha);
    
    if (!senhaCorreta) {
      req.session.error_msg = 'Email ou senha incorretos';
      return res.redirect('/admin/login');
    }
    
    // Cria a sessão do usuário
    req.session.user = {
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      tipo: 'admin'
    };
    
    req.session.success_msg = 'Login realizado com sucesso!';
    res.redirect('/admin/dashboard');
    
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    req.session.error_msg = 'Erro ao fazer login. Tente novamente.';
    res.redirect('/admin/login');
  }
});

// Rota para o dashboard
router.get('/dashboard', ehAdmin, async (req, res) => {
  try {
    // Busca estatísticas para o dashboard
    const totalProfessores = await Professor.count();
    const totalDepartamentos = await Departamento.count();
    const totalProfessoresAtivos = await Professor.count({ where: { status: 'ativo' } });
    const totalProfessoresInativos = await Professor.count({ where: { status: 'inativo' } });
    
    // Busca os últimos professores cadastrados
    const ultimosProfessores = await Professor.findAll({
      include: [{ model: Departamento }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Busca os últimos departamentos cadastrados
    const ultimosDepartamentos = await Departamento.findAll({
      include: [{ model: Professor }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Busca solicitações de presença pendentes
    const solicitacoesPendentes = await Presenca.findAll({
      where: { status: 'pendente' },
      include: [{ 
        model: Professor,
        include: [{ model: Departamento }]
      }],
      order: [['data', 'DESC']],
      limit: 5
    });
    
    res.render('admin/dashboard', {
      totalProfessores,
      totalDepartamentos,
      totalProfessoresAtivos,
      totalProfessoresInativos,
      ultimosProfessores,
      ultimosDepartamentos,
      solicitacoesPendentes
    });
    
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    req.session.error_msg = 'Erro ao carregar dashboard';
    res.redirect('/');
  }
});

// Rota para logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Rota para perfil do administrador
router.get('/perfil', ehAdmin, async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.session.user.id);
    res.render('admin/perfil', { admin });
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    req.session.error_msg = 'Erro ao carregar perfil';
    res.redirect('/admin/dashboard');
  }
});

// Rota para atualizar perfil
router.post('/perfil', ehAdmin, async (req, res) => {
  try {
    const { nome, email, senha_atual, nova_senha } = req.body;
    const admin = await Admin.findByPk(req.session.user.id);
    
    // Verifica se o email já está em uso por outro admin
    if (email !== admin.email) {
      const emailExiste = await Admin.findOne({ where: { email } });
      if (emailExiste) {
        req.session.error_msg = 'Este email já está em uso';
        return res.redirect('/admin/perfil');
      }
    }
    
    // Atualiza nome e email
    admin.nome = nome;
    admin.email = email;
    
    // Se forneceu senha atual e nova senha, atualiza a senha
    if (senha_atual && nova_senha) {
      // Verifica se a senha atual está correta
      if (!admin.verificarSenha(senha_atual)) {
        req.session.error_msg = 'Senha atual incorreta';
        return res.redirect('/admin/perfil');
      }
      
      // Gera hash da nova senha
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(nova_senha, salt);
      admin.senha = hash;
    }
    
    await admin.save();
    
    // Atualiza a sessão
    req.session.user.nome = admin.nome;
    req.session.user.email = admin.email;
    
    req.session.success_msg = 'Perfil atualizado com sucesso!';
    res.redirect('/admin/perfil');
    
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    req.session.error_msg = 'Erro ao atualizar perfil';
    res.redirect('/admin/perfil');
  }
});

// Rota para visualizar todas as solicitações de presença
router.get('/solicitacoes-presenca', ehAdmin, async (req, res) => {
  try {
    // Busca todas as solicitações de presença
    const solicitacoes = await Presenca.findAll({
      include: [{ 
        model: Professor,
        include: [{ model: Departamento }]
      }],
      order: [['data', 'DESC']]
    });
    
    res.render('admin/solicitacoes-presenca', { solicitacoes });
    
  } catch (error) {
    console.error('Erro ao carregar solicitações de presença:', error);
    req.session.error_msg = 'Erro ao carregar solicitações de presença';
    res.redirect('/admin/dashboard');
  }
});

// Rota para aprovar solicitação de presença
router.post('/aprovar-presenca/:id', ehAdmin, async (req, res) => {
  try {
    const presenca = await Presenca.findByPk(req.params.id);
    
    if (!presenca) {
      req.session.error_msg = 'Solicitação de presença não encontrada';
      return res.redirect('/admin/solicitacoes-presenca');
    }
    
    presenca.status = 'aprovado';
    await presenca.save();
    
    req.session.success_msg = 'Solicitação de presença aprovada com sucesso!';
    res.redirect('/admin/solicitacoes-presenca');
    
  } catch (error) {
    console.error('Erro ao aprovar solicitação de presença:', error);
    req.session.error_msg = 'Erro ao aprovar solicitação de presença';
    res.redirect('/admin/solicitacoes-presenca');
  }
});

// Rota para reprovar solicitação de presença
router.post('/reprovar-presenca/:id', ehAdmin, async (req, res) => {
  try {
    const presenca = await Presenca.findByPk(req.params.id);
    
    if (!presenca) {
      req.session.error_msg = 'Solicitação de presença não encontrada';
      return res.redirect('/admin/solicitacoes-presenca');
    }
    
    presenca.status = 'reprovado';
    await presenca.save();
    
    req.session.success_msg = 'Solicitação de presença reprovada com sucesso!';
    res.redirect('/admin/solicitacoes-presenca');
    
  } catch (error) {
    console.error('Erro ao reprovar solicitação de presença:', error);
    req.session.error_msg = 'Erro ao reprovar solicitação de presença';
    res.redirect('/admin/solicitacoes-presenca');
  }
});

// Rota para a página de relatórios
router.get('/relatorios', ehAdmin, async (req, res) => {
  try {
    // Busca todos os professores para o select
    const professores = await Professor.findAll({
      include: [{ model: Departamento }],
      order: [['nome', 'ASC']]
    });
    
    // Gera lista de anos disponíveis (do ano atual até 3 anos atrás)
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = 0; i < 4; i++) {
      anos.push(anoAtual - i);
    }
    
    res.render('admin/relatorios', { professores, anos });
    
  } catch (error) {
    console.error('Erro ao carregar página de relatórios:', error);
    req.session.error_msg = 'Erro ao carregar página de relatórios';
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;