## Approach

Se elimina el boton secundario que enviaba el formulario con `value="en_curso"`. La funcion de guardado de nueva consulta usara `finalizada` como estado objetivo unico, incluso si el formulario se dispara sin submitter explicito.

Cuando la consulta viene desde un turno, el turno se marcara como `Atendido` al guardar, ya que ya no existe el flujo visible que lo deja `En consulta`.
