const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Função para substituir req.flash por req.session nas rotas
function updateFlashToSession(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Substituir todos os padrões de req.flash com uma regex mais abrangente
    // Esta regex captura todas as variações de espaçamento e formatação
    content = content.replace(/req\s*\.\s*flash\s*\(\s*['"](\w+)['"]\s*,\s*([^)]+)\s*\)/g, 'req.session.$1 = $2');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Atualizado: ${filePath}`);
  } catch (error) {
    console.error(`Erro ao atualizar ${filePath}:`, error);
  }
}

// Encontrar todos os arquivos de rotas
const routeFiles = glob.sync(path.join(__dirname, 'routes', '**', '*.js'));

// Adicionar explicitamente arquivos específicos se existirem
const specificFiles = [
  path.join(__dirname, 'routes', 'professor_dashboard.js'),
  path.join(__dirname, 'routes', 'relatorios.js'),
  path.join(__dirname, 'routes', 'professores.js'),
  path.join(__dirname, 'routes', 'admin.js'),
  path.join(__dirname, 'routes', 'departamentos.js')
];

specificFiles.forEach(filePath => {
  if (fs.existsSync(filePath) && !routeFiles.includes(filePath)) {
    routeFiles.push(filePath);
    console.log(`Adicionado arquivo específico: ${filePath}`);
  }
});

// Atualizar cada arquivo
routeFiles.forEach(updateFlashToSession);

// Atualizar middlewares
const middlewareFiles = glob.sync(path.join(__dirname, 'middlewares', '**', '*.js'));
middlewareFiles.forEach(updateFlashToSession);

console.log('Atualização concluída!');