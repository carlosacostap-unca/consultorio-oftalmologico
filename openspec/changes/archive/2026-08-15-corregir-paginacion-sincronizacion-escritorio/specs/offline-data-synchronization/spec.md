## ADDED Requirements

### Requirement: Descarga extensa reanudable
El sistema SHALL procesar las descargas centrales extensas en tramos acotados y reanudables, conservando el orden de dependencias y el último cursor confirmado hasta alcanzar al servidor central.

#### Scenario: Colección mayor que el presupuesto de un tramo
- **WHEN** una colección contiene más páginas que las permitidas en una ejecución acotada
- **THEN** la PC aplica las páginas completas del tramo y conserva su último cursor confirmado
- **AND** registra que la descarga continúa sin clasificar el agotamiento del presupuesto como error
- **AND** programa automáticamente otro tramo desde ese cursor

#### Scenario: Reinicio con descarga pendiente
- **WHEN** la aplicación se cierra o Windows se reinicia antes de alcanzar la última página central
- **THEN** la siguiente sincronización reanuda la colección desde el cursor durable existente
- **AND** no exige reinstalar la aplicación ni volver a descargar páginas ya confirmadas

#### Scenario: Página que no avanza el cursor
- **WHEN** el servidor devuelve una página con más resultados pero el cursor está ausente, repetido o no es posterior al solicitado
- **THEN** la PC detiene la continuación automática y clasifica la respuesta como error técnico
- **AND** conserva el último cursor durable anterior a esa página

#### Scenario: Falla mientras se aplica una página
- **WHEN** una página no puede persistirse completamente en PocketBase local
- **THEN** la PC no guarda el cursor de esa página
- **AND** el reintento vuelve a solicitarla y aplica sus registros de manera idempotente

## MODIFIED Requirements

### Requirement: Estado de sincronización visible
El sistema SHALL mostrar conectividad, fase de sincronización, colección en curso, última sincronización completa, cantidad de pendientes, errores y conflictos, y SHALL permitir iniciar una sincronización manual no concurrente.

#### Scenario: Ver resumen persistente
- **WHEN** un usuario autenticado navega por la aplicación de escritorio
- **THEN** la barra lateral muestra el estado y el total de pendientes
- **AND** enlaza a `/sincronizacion`

#### Scenario: Sincronizar manualmente
- **WHEN** el usuario selecciona `Sincronizar ahora`
- **THEN** el sistema ejecuta una sola sincronización aunque se pulse varias veces
- **AND** actualiza el avance y resultado sin bloquear el trabajo local

#### Scenario: Descarga con continuaciones pendientes
- **WHEN** una colección requiere más de un tramo para alcanzar al servidor central
- **THEN** la pantalla mantiene el estado `Sincronizando` y muestra la colección en curso y contadores técnicos no clínicos
- **AND** no presenta el agotamiento del presupuesto como error ni actualiza la última sincronización completa

#### Scenario: Descarga central completada
- **WHEN** pacientes, consultas y recetas responden que no quedan páginas posteriores a sus cursores confirmados
- **THEN** el sistema presenta la copia local como actualizada
- **AND** registra la fecha de última sincronización completa

#### Scenario: Error visible y recuperable
- **WHEN** una operación falla por red, autenticación, validación, persistencia, cursor inválido o conflicto
- **THEN** la pantalla clasifica el error y conserva la operación y los cursores confirmados
- **AND** ofrece la acción adecuada de reintentar, revalidar o revisar
