## ADDED Requirements

### Requirement: Ajuste global por teclado
La aplicación de Windows SHALL aumentar o disminuir todas las fuentes de la interfaz en pasos de 10 puntos porcentuales, entre 80% y 200% del tamaño predeterminado, con Ctrl + «+» y Ctrl + «−» respectivamente. SHALL admitir teclado numérico, Ctrl+= y Ctrl+0 para restaurar 100%, sin ejecutar simultáneamente el zoom nativo.

#### Scenario: Ajustar durante una consulta
- **WHEN** un profesional usa Ctrl + «+» con el foco en un campo de consulta
- **THEN** aumenta la tipografía de títulos, navegación, campos y botones sin alterar el contenido del campo
- **AND** Ctrl + «−» revierte un paso y Ctrl + 0 restaura el tamaño inicial

#### Scenario: Alcanzar los límites
- **WHEN** se repite el atajo en el límite inferior o superior
- **THEN** el porcentaje permanece dentro de 80% a 200%

### Requirement: Preferencia local durable
La aplicación SHALL conservar el porcentaje por perfil de Windows al navegar, recargar, reiniciar y actualizar. SHALL usar 100% si la preferencia falta o es inválida y permitir trabajar si no puede guardarse.

#### Scenario: Reiniciar sin conexión
- **WHEN** el usuario ajusta el tamaño y reinicia con otro puerto local sin Internet
- **THEN** la interfaz recupera el último porcentaje guardado

### Requirement: Alcance exclusivo de pantalla de escritorio
El ajuste SHALL afectar sólo las fuentes de la interfaz de escritorio en pantalla, sin modificar los documentos impresos o exportados ni la aplicación web.

#### Scenario: Imprimir una receta
- **WHEN** se imprime una receta después de aumentar la tipografía en pantalla
- **THEN** la receta conserva sus tamaños de impresión originales

#### Scenario: Acceder desde navegador
- **WHEN** se accede a la aplicación web
- **THEN** el cambio de escritorio no aplica estilos ni intercepta sus atajos
