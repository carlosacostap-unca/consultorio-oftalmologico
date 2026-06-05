## ADDED Requirements

### Requirement: Campos clinicos opcionales vacios
El sistema SHALL mantener vacios los campos clinicos opcionales que no fueron cargados.

#### Scenario: Mostrar consulta con ceros de relleno
- **WHEN** una consulta existente tiene `0`, `+0`, `+0.00` o valores equivalentes en agudeza visual, refraccion, ADD o presion ocular
- **THEN** el formulario muestra esos campos vacios
- **AND** no presenta `0` como valor clinico cargado

#### Scenario: Guardar consulta sin datos opcionales
- **WHEN** el usuario guarda una consulta sin cargar agudeza visual, refraccion, ADD o presion ocular
- **THEN** el sistema persiste esos campos como vacios
- **AND** no guarda ceros de relleno

#### Scenario: Imprimir consulta
- **WHEN** una impresion usa campos clinicos opcionales sin dato real
- **THEN** el sistema no imprime `0` como valor medido
