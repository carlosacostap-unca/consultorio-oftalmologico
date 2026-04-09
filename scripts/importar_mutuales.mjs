import fs from "fs";
import readline from "readline";

async function importMutuales() {
  const filePath = "data/MUTUALES.DBF.csv";
  
  if (!fs.existsSync(filePath)) {
    console.error("No se encontró el archivo CSV en", filePath);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isFirstLine = true;
  let successCount = 0;
  let errorCount = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue; // Saltar encabezado
    }

    // Saltar líneas vacías
    if (!line.trim()) continue;

    // Formato: NOM_MUT;COD_MUT;DIR_MUT;TEL_MUT
    const parts = line.split(";");
    
    // Si no hay al menos un nombre, saltar
    if (parts.length < 1 || !parts[0].trim()) continue;

    const nombre = parts[0].trim().toUpperCase();
    const codigo = parts.length > 1 ? parts[1].trim() : "";
    const direccion = parts.length > 2 ? parts[2].trim() : "";
    const telefono = parts.length > 3 ? parts[3].trim() : "";

    try {
      const response = await fetch("https://pocketbase-consultorio-oftalmologico.acostaparra.com/api/collections/mutuales/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          codigo,
          direccion,
          telefono
        }),
      });

      if (response.ok) {
        console.log(`✅ Importado: ${nombre}`);
        successCount++;
      } else {
        const err = await response.json();
        console.error(`❌ Error al importar ${nombre}:`, err);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error de conexión al importar ${nombre}:`, error.message);
      errorCount++;
    }
  }

  console.log("\n--- Resumen de Importación ---");
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
}

importMutuales();
