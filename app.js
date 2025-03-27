// Carrega variáveis de ambiente
require('dotenv').config();

const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const { sequelize } = require('./models/db');

// Inicializa o app
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Handlebars
const helpers = require('./helpers/handlebars');
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: helpers,
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Configuração da sessão
app.use(cookieSession({
  name: 'session',
  keys: ['sistema_presenca_secret'],
  // Cookie options
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}));

// Middleware global para variáveis de sessão
app.use((req, res, next) => {
  // Obter mensagens da sessão
  res.locals.success_msg = req.session.success_msg;
  res.locals.error_msg = req.session.error_msg;
  
  // Limpar mensagens após serem obtidas
  delete req.session.success_msg;
  delete req.session.error_msg;
  
  res.locals.user = req.session.user || null;
  next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/admin', require('./routes/admin'));
app.use('/professores', require('./routes/professores'));
app.use('/professores', require('./routes/professor_dashboard'));
app.use('/departamentos', require('./routes/departamentos'));
app.use('/admin', require('./routes/relatorios'));

// Sincroniza o banco de dados e inicia o servidor
sequelize.sync({ })
  .then(() => {
    console.log('Banco de dados sincronizado');
    // Verifica se existe um administrador, se não, cria um padrão
    const Admin = require('./models/Admin');
    Admin.findOne({ where: { email: 'admin@example.com' } })
      .then(admin => {
        if (!admin) {
          const bcrypt = require('bcryptjs');
          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync('admin123', salt);
          
          Admin.create({
            nome: 'Administrador',
            email: 'admin@example.com',
            senha: hash
          }).then(() => {
            console.log('Administrador padrão criado!');
          }).catch(err => {
            console.log('Erro ao criar administrador padrão:', err);
          });
        }
      });
  })
  .catch(err => {
    console.log('Erro ao sincronizar banco de dados:', err);
  });

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});