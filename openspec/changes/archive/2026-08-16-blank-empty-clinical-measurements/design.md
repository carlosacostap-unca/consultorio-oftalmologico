## Context

Los formularios, las rutas de persistencia y las impresiones de consultas manejan varios campos clinicos opcionales de agudeza visual, refraccion, ADD y presion ocular. En registros existentes o cargas incompletas, algunos de esos campos contienen ceros de relleno (`0`, `+0`, `+0.00`, `-0.00` o equivalentes) que pueden presentarse como si fueran mediciones reales.

La solucion debe mantener una representacion vacia consistente durante la carga, la persistencia y la impresion, sin alterar datos narrativos ni reinterpretar valores clinicos fuera del alcance definido.

## Goals / Non-Goals

**Goals:**

- Aplicar una normalizacion compartida solamente a campos clinicos opcionales de agudeza visual, refraccion, ADD y presion ocular.
- Distinguir los ceros de relleno de los textos narrativos y de otros valores que puedan ser clinicamente significativos.
- Mantener los campos sin dato real vacios al cargar, crear, editar, guardar e imprimir una consulta.
- Evitar placeholders con ceros o unidades de medida que sugieran una medicion inexistente.

**Non-Goals:**

- No migrar ni reescribir registros historicos en PocketBase.
- No convertir ceros en campos narrativos, campos obligatorios ni campos clinicos fuera del conjunto explicitamente normalizado.
- No considerar vacio cualquier cero que sea clinicamente significativo fuera de este alcance.
- No cambiar el esquema de datos ni introducir una nueva representacion persistida para las consultas.

## Decisions

1. Se utilizara una funcion de normalizacion compartida para los campos clinicos opcionales alcanzados.
   - La misma regla se aplicara al cargar datos existentes, preparar la persistencia y construir impresiones.
   - La centralizacion evita diferencias entre formularios, APIs y documentos imprimibles.

2. La normalizacion se limitara mediante una lista explicita de campos.
   - Solo agudeza visual, refraccion, ADD y presion ocular admitiran la conversion de ceros de relleno a vacio.
   - Los campos narrativos se conservaran literalmente y no se analizaran como valores numericos.

3. Los ceros de relleno se reconoceran por sus representaciones conocidas, incluyendo variantes con signo y decimales sin magnitud.
   - Los datos que no coincidan inequívocamente con esas representaciones se conservaran.
   - La interfaz no agregara `0`, `+0.00`, `-0.00` ni `mmHg` como placeholder cuando no exista una medicion real.

4. La correccion sera no destructiva para los registros historicos.
   - Los valores historicos se normalizaran solo en el borde de lectura, edicion, nueva persistencia o impresion.
   - Abrir o imprimir una consulta no modificara su registro fuente.

## Risks / Trade-offs

- Un cero que hubiera sido cargado intencionalmente en uno de los campos alcanzados puede mostrarse vacio. Se mitiga limitando la regla a campos donde las variantes identificadas representan relleno en los flujos actuales.
- Una regla aplicada de forma diferente entre UI, API e impresion produciria inconsistencias. Se mitiga usando una unica normalizacion compartida.
- Ampliar la lista de campos sin revision clinica podria ocultar datos significativos. Cualquier ampliacion queda fuera de este cambio y requiere evaluacion explicita.

## Migration Plan

1. Incorporar la normalizacion compartida y aplicarla en carga, creacion, edicion e impresion.
2. Verificar que consultas con ceros de relleno se presenten vacias y que nuevas consultas sin mediciones persistan valores vacios.
3. No ejecutar backfill ni modificar registros historicos existentes.
4. Ante una regresion, revertir el uso de la normalizacion compartida. Como no existe migracion de datos ni cambio de esquema, el rollback no requiere restaurar registros y conserva intacta la informacion original.
