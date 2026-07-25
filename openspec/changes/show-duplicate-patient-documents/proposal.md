# Mostrar DNI duplicados en calidad de datos

## Por que
Luego de bloquear nuevas fichas con DNI repetido, administracion necesita detectar los casos existentes para corregir el padron. Hoy la aplicacion tiene vistas para duplicados generales y fichas duplicadas, pero no una vista focalizada en DNI presentes en mas de una ficha.

## Que cambia
- Agregar al menu admin, dentro de Calidad de datos, la opcion "DNI duplicados".
- Crear una pantalla que liste cada DNI encontrado en mas de una ficha activa.
- Mostrar los pacientes/fichas asociados a cada DNI con enlaces a sus fichas.
- Proteger la consulta y la pantalla para usuarios con rol activo admin.

## Impacto
- Navegacion lateral admin.
- Nueva ruta de paciente para calidad de datos.
- Nueva API de diagnostico de DNI duplicados.
- Especificacion de gestion/calidad de pacientes.
