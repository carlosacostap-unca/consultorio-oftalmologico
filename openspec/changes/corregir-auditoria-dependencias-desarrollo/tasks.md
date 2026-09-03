## 1. Actualización reproducible

- [x] 1.1 Crear una rama dedicada desde `develop` y registrar el baseline de las auditorías de producción y del árbol completo.
- [x] 1.2 Aplicar la corrección compatible de npm únicamente al lockfile, sin `--force`, y revisar que el diff se limite a las dependencias necesarias.
- [x] 1.3 Ejecutar `npm ci` para reproducir desde cero el árbol corregido.

## 2. Validación de seguridad y compatibilidad

- [x] 2.1 Confirmar que `npm audit --omit=dev` no contiene vulnerabilidades altas o críticas y que `npm audit` no conserva hallazgos altos o críticos corregibles.
- [x] 2.2 Ejecutar lint, pruebas automatizadas y build de producción sobre la instalación limpia.
- [x] 2.3 Ejecutar las verificaciones aplicables del empaquetado de escritorio sin generar ni publicar un release, y confirmar que no se modificaron artefactos o punteros de `pilot` o `stable`.
- [x] 2.4 Validar estrictamente los artefactos OpenSpec y documentar cualquier hallazgo moderado residual.

## 3. Integración previa al release

- [x] 3.1 Revisar el diff final, crear el commit y publicar la rama dedicada.
- [ ] 3.2 Crear un pull request hacia `develop` con la evidencia de auditoría y validación; mantener separada la posterior promoción a `main`.
