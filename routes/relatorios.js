const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Professor = require('../models/Professor');
const Departamento = require('../models/Departamento');
const Presenca = require('../models/Presenca');
const moment = require('moment-timezone');
const { ehAdmin } = require('../middlewares/auth');

// Rota para gerar relatório de presença
router.post('/gerar-relatorio', ehAdmin, async (req, res) => {
  try {
    const { ano, mes, professorId } = req.body;
    
    // Busca o professor
    const professor = await Professor.findByPk(professorId, {
      include: [{ model: Departamento }]
    });
    
    if (!professor) {
      req.session.error_msg = 'Professor não encontrado';
      return res.redirect('/admin/relatorios');
    }
    
    // Define o primeiro e último dia do mês
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    
    // Formata as datas para busca no banco
    const dataInicio = moment(primeiroDia).format('YYYY-MM-DD');
    const dataFim = moment(ultimoDia).format('YYYY-MM-DD');
    
    // Busca as presenças do professor no período selecionado
    const presencas = await Presenca.findAll({
      where: {
        ProfessorId: professorId,
        status: 'aprovado',
        data: {
          [require('sequelize').Op.between]: [dataInicio, dataFim]
        }
      },
      order: [['data', 'ASC']]
    });
    
    // Cria o documento PDF com opções de página
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4'
    });
    
    // Define o nome do arquivo
    const nomeArquivo = `relatorio_${professor.nome.replace(/\s+/g, '_')}_${mes}_${ano}.pdf`;
    
    // Define os headers para download do arquivo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    
    // Pipe o PDF para a resposta
    doc.pipe(res);
    
    // Adiciona um cabeçalho com borda
    doc.rect(50, 50, doc.page.width - 100, 100).fillAndStroke('#f6f6f6', '#dddddd');
    
    // Adiciona o título com estilo melhorado
    doc.fontSize(22).fillColor('#333333').text('RELATÓRIO DE PRESENÇAS', 70, 70, { align: 'center' });
    doc.moveDown(0.5);
    
    // Adiciona uma linha decorativa
    doc.moveTo(100, 100).lineTo(doc.page.width - 100, 100).stroke('#999999');
    
    // Adiciona informações do professor com melhor formatação
    doc.fontSize(14).fillColor('#333333').text(`Professor: ${professor.nome}`, 70, 110);
    doc.fontSize(12).fillColor('#555555').text(`Matrícula: ${professor.matricula}`, 70, 130);
    doc.fontSize(12).fillColor('#555555').text(`Departamento: ${professor.Departamento.nome}`, 70, 150);
    doc.fontSize(12).fillColor('#555555').text(`Período: ${obterNomeMes(mes)} de ${ano}`, 70, 170);
    doc.moveDown(2);
    
    // Adiciona a tabela de presenças
    doc.fontSize(14).text('Registro de Presenças', { underline: true });
    doc.moveDown();
    
    // Verifica se há presenças registradas
    if (presencas.length === 0) {
      doc.fontSize(12).fillColor('#555555').text('Nenhuma presença registrada no período selecionado.');
    } else {
      // Desenha o fundo do cabeçalho da tabela
      const inicioY = doc.y;
      doc.rect(50, inicioY, doc.page.width - 100, 25).fillAndStroke('#4b6cb7', '#3a539b');
      
      // Cabeçalho da tabela com texto branco
      doc.fillColor('#ffffff').fontSize(12);
      doc.text('Data', 60, inicioY + 7);
      doc.text('Dia da Semana', 160, inicioY + 7);
      doc.text('Hora de Registro', 310, inicioY + 7);
      doc.text('Status', 460, inicioY + 7);
      
      // Dados da tabela
      let y = inicioY + 30;
      
      // Conjunto para armazenar as semanas únicas
      const semanas = new Set();
      
      presencas.forEach((presenca, index) => {
        const data = moment(presenca.data);
        const diaSemana = obterDiaSemana(data.day());
        const semana = data.week(); // Obtém o número da semana do ano
        semanas.add(semana);
        
        // Adiciona linhas alternadas para melhor legibilidade
        if (index % 2 === 0) {
          doc.rect(50, y - 5, doc.page.width - 100, 25).fill('#f9f9f9');
        }
        
        // Texto da tabela em cor escura
        doc.fillColor('#333333').fontSize(11);
        doc.text(data.format('DD/MM/YYYY'), 60, y);
        doc.text(diaSemana, 160, y);
        doc.text(moment(presenca.hora_registro).format('HH:mm:ss'), 310, y);
        doc.fillColor('#28a745').text('Aprovado', 460, y);
        
        y += 25;
        
        // Adiciona uma nova página se necessário
        if (y > 700 && index < presencas.length - 1) {
          doc.addPage();
          y = 50;
        }
      });
      
      doc.moveDown(2);
      
      // Adiciona o resumo com estilo melhorado
      doc.rect(50, y, doc.page.width - 100, 30).fillAndStroke('#f6f6f6', '#dddddd');
      doc.fontSize(16).fillColor('#333333').text('RESUMO', 70, y + 8, { align: 'center' });
      doc.moveDown(1.5);
      
      // Cria uma caixa para os totais
      const resumoY = doc.y;
      doc.rect(50, resumoY, doc.page.width - 100, 60).fill('#f9f9f9');
      
      // Adiciona os totais com ícones e formatação melhorada
      doc.fontSize(12).fillColor('#333333');
      doc.text(`• Total de dias com presença: `, 70, resumoY + 15);
      doc.fontSize(14).fillColor('#4b6cb7').text(`${presencas.length}`, 270, resumoY + 15);
      
      doc.fontSize(12).fillColor('#333333');
      doc.text(`• Total de semanas com presença: `, 70, resumoY + 35);
      doc.fontSize(14).fillColor('#4b6cb7').text(`${semanas.size}`, 270, resumoY + 35);
    }
    
    // Adiciona um rodapé com informações adicionais na primeira página
    const rodapeY = doc.page.height - 50;
    
    // Adiciona uma linha separadora para o rodapé
    doc.moveTo(50, rodapeY - 10).lineTo(doc.page.width - 50, rodapeY - 10).stroke('#dddddd');
    
    // Adiciona informações do rodapé
    doc.fontSize(8).fillColor('#999999');
   
    
    // Adiciona um evento para numerar as páginas corretamente
    let pageNumber = 1;
    doc.on('pageAdded', () => {
      pageNumber++;
      const rodapeY = doc.page.height - 50;
      
      // Adiciona uma linha separadora para o rodapé na nova página
      doc.moveTo(50, rodapeY - 10).lineTo(doc.page.width - 50, rodapeY - 10).stroke('#dddddd');
      
      // Adiciona informações do rodapé na nova página
      doc.fontSize(8).fillColor('#999999');
     
    });
    
    // Finaliza o documento
    doc.end();
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    req.session.error_msg = 'Erro ao gerar relatório';
    res.redirect('/admin/relatorios');
  }
});

// Função para obter o nome do mês
function obterNomeMes(mes) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[mes - 1];
}

// Função para obter o nome do dia da semana
function obterDiaSemana(dia) {
  const diasSemana = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  return diasSemana[dia];
}

module.exports = router;