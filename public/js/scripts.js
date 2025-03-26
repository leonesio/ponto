// Scripts personalizados para o sistema

document.addEventListener('DOMContentLoaded', function() {
  // Inicializa todos os tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })

  // Inicializa todos os popovers
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl)
  })

 

  // Adiciona a classe 'active' ao item de menu atual
  var currentLocation = window.location.pathname;
  var navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  
  navLinks.forEach(function(link) {
    var linkPath = link.getAttribute('href');
    if (currentLocation.startsWith(linkPath) && linkPath !== '/') {
      link.classList.add('active');
    }
  });
});