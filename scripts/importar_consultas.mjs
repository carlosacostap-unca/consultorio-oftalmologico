import fs from "fs";
import readline from "readline";

// Función para convertir fecha de DD/MM/YYYY a YYYY-MM-DD HH:mm:ss.SSSZ
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return '';
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  let year = parts[2];
  
  if (year.length === 2) {
    // Asumir 19xx o 20xx
    const y = parseInt(year, 10);
    year = y > 30 ? `19${year}` : `20${year}`;
  }
  
  return `${year}-${month}-${day} 12:00:00.000Z`;
}

async function getPacienteIdPorFicha(numero_ficha) {
  if (!numero_ficha) return null;
  
  try {
    const url = `https://pocketbase-consultorio-oftalmologico.acostaparra.com/api/collections/pacientes/records?filter=(numero_ficha='${numero_ficha}')&perPage=1`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }
    }
  } catch (error) {
    console.error(`Error buscando paciente con ficha ${numero_ficha}:`, error.message);
  }
  return null;
}

async function importConsultas() {
  const filePath = "data/DATOMED.DBF - 160001-210000.csv";
  
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
  let skippedCount = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue; // Saltar encabezado
    }

    // Saltar líneas vacías
    if (!line.trim()) continue;

    // Formato: NUM_FICH;MED_FEC;MOT_CONS;AG_VI_SCD;AG_VI_SCI;AG_VI_CCD;AG_VI_CCI;LEJ_ESF_D;LEJ_CIL_D;LEJ_GRA_D;LEJ_ESF_I;LEJ_CIL_I;LEJ_GRA_I;CER_ESF_D;CER_CIL_D;CER_GRA_D;CER_ESF_I;CER_CIL_I;CER_GRA_I;PRE_OCU_D;PRE_OCU_I;FONDO_OJO;TRATA;MED_DIAG
    const parts = line.split(";");
    
    const numero_ficha = parts[0] ? parts[0].trim() : "";
    if (!numero_ficha) {
      console.log("Fila sin número de ficha, saltando...");
      skippedCount++;
      continue;
    }

    const paciente_id = await getPacienteIdPorFicha(numero_ficha);
    
    if (!paciente_id) {
      console.log(`⚠️ Paciente con ficha ${numero_ficha} no encontrado. Saltando consulta.`);
      skippedCount++;
      continue;
    }

    const fecha = parseDate(parts[1] ? parts[1].trim() : "");
    const motivo_consulta = parts[2] ? parts[2].trim() : "";
    const av_sc_od = parts[3] ? parts[3].trim() : "";
    const av_sc_oi = parts[4] ? parts[4].trim() : "";
    const av_cc_od = parts[5] ? parts[5].trim() : "";
    const av_cc_oi = parts[6] ? parts[6].trim() : "";
    
    const ref_lejos_od_esf = parts[7] ? parts[7].trim() : "";
    const ref_lejos_od_cil = parts[8] ? parts[8].trim() : "";
    const ref_lejos_od_eje = parts[9] ? parts[9].trim() : "";
    const ref_lejos_oi_esf = parts[10] ? parts[10].trim() : "";
    const ref_lejos_oi_cil = parts[11] ? parts[11].trim() : "";
    const ref_lejos_oi_eje = parts[12] ? parts[12].trim() : "";
    
    const ref_cerca_od_esf = parts[13] ? parts[13].trim() : "";
    const ref_cerca_od_cil = parts[14] ? parts[14].trim() : "";
    const ref_cerca_od_eje = parts[15] ? parts[15].trim() : "";
    const ref_cerca_oi_esf = parts[16] ? parts[16].trim() : "";
    const ref_cerca_oi_cil = parts[17] ? parts[17].trim() : "";
    const ref_cerca_oi_eje = parts[18] ? parts[18].trim() : "";
    
    const pio_od = parts[19] ? parts[19].trim() : "";
    const pio_oi = parts[20] ? parts[20].trim() : "";
    const fondo_ojo = parts[21] ? parts[21].trim() : "";
    const tratamiento = parts[22] ? parts[22].trim() : "";
    const diagnostico = parts[23] ? parts[23].trim() : "";

    const payload = {
      paciente_id,
      numero_ficha,
      fecha,
      motivo_consulta,
      av_sc_od,
      av_sc_oi,
      av_cc_od,
      av_cc_oi,
      ref_lejos_od_esf,
      ref_lejos_od_cil,
      ref_lejos_od_eje,
      ref_lejos_oi_esf,
      ref_lejos_oi_cil,
      ref_lejos_oi_eje,
      ref_cerca_od_esf,
      ref_cerca_od_cil,
      ref_cerca_od_eje,
      ref_cerca_oi_esf,
      ref_cerca_oi_cil,
      ref_cerca_oi_eje,
      pio_od,
      pio_oi,
      fondo_ojo,
      tratamiento,
      diagnostico
    };

    try {
      const response = await fetch("https://pocketbase-consultorio-oftalmologico.acostaparra.com/api/collections/consultas/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`✅ Consulta importada para ficha: ${numero_ficha}`);
        successCount++;
      } else {
        const err = await response.json();
        console.error(`❌ Error al importar consulta para ficha ${numero_ficha}:`, err);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error de conexión al importar consulta para ficha ${numero_ficha}:`, error.message);
      errorCount++;
    }
  }

  console.log("\n--- Resumen de Importación de Consultas ---");
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`⚠️  Saltados (sin paciente): ${skippedCount}`);
  console.log(`❌ Errores: ${errorCount}`);
}

importConsultas();
