const estaAutenticado = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.session.error_msg = 'Você precisa estar logado para acessar esta página';
  res.redirect('/admin/login');
};

const ehAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.tipo === 'admin') {
    return next();
  }
  req.session.error_msg = 'Acesso negado. Você não tem permissão para acessar esta página';
  res.redirect('/');
};

const ehProfessor = (req, res, next) => {
  if (req.session.user && req.session.user.tipo === 'professor') {
    return next();
  }
  req.session.error_msg = 'Acesso negado. Você não tem permissão para acessar esta página';
  res.redirect('/');
};

module.exports = {
  estaAutenticado,
  ehAdmin,
  ehProfessor
};