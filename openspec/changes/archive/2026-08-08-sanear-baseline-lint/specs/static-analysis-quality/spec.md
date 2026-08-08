## ADDED Requirements

### Requirement: Baseline de análisis estático limpio
El proyecto MUST mantener cero errores y cero advertencias en el análisis completo de ESLint sobre los archivos incluidos por la configuración vigente.

#### Scenario: Ejecución sobre una revisión limpia
- **WHEN** se ejecuta `npm run lint` antes de integrar o publicar un cambio
- **THEN** ESLint analiza toda la base configurada
- **AND** el comando termina correctamente únicamente cuando no existen errores ni advertencias

#### Scenario: Se introduce una advertencia nueva
- **WHEN** un cambio agrega una advertencia de ESLint aunque no agregue errores
- **THEN** `npm run lint` termina con error
- **AND** la integración permanece bloqueada hasta corregir el hallazgo

### Requirement: Correcciones explícitas y tipadas
El saneamiento MUST resolver los hallazgos mediante tipos, contratos y refactorizaciones explícitas sin desactivar globalmente reglas ni excluir archivos previamente analizados.

#### Scenario: Valor externo sin tipo seguro
- **WHEN** un valor de PocketBase, un evento o una excepción no tiene un tipo confiable
- **THEN** el código utiliza un tipo de dominio o `unknown` con validación antes de acceder a sus propiedades
- **AND** no utiliza `any` para omitir la comprobación

#### Scenario: Regla incumplida en un archivo existente
- **WHEN** ESLint identifica un hallazgo del baseline
- **THEN** se corrige la causa en el archivo afectado
- **AND** no se oculta mediante una relajación global, una exclusión nueva o una supresión destinada únicamente a reducir el contador

### Requirement: Comportamiento preservado al corregir hooks
Las correcciones de dependencias de hooks MUST conservar la carga, selección, edición y navegación esperadas en los flujos afectados.

#### Scenario: Efecto con dependencia faltante
- **WHEN** se corrige una advertencia de `react-hooks/exhaustive-deps`
- **THEN** las dependencias y callbacks quedan estables y representan los valores realmente utilizados
- **AND** el flujo no entra en ciclos, no repite solicitudes innecesarias y no utiliza estado obsoleto

#### Scenario: Verificación de un dominio afectado
- **WHEN** se modifica un hook de consultas, turnos, recetas, pacientes o agenda
- **THEN** se ejecuta una verificación focalizada del comportamiento correspondiente
- **AND** TypeScript y el build de producción continúan correctamente

### Requirement: Imagen compatible con Next.js
El elemento de imagen señalado por `@next/next/no-img-element` SHALL utilizar el mecanismo de imagen de Next.js sin alterar su recurso, dimensiones visibles ni compatibilidad con el build standalone.

#### Scenario: Render de la imagen migrada
- **WHEN** se carga la pantalla que contiene la imagen
- **THEN** la imagen se muestra con el mismo contenido y presentación esperada
- **AND** ESLint no reporta `@next/next/no-img-element`
