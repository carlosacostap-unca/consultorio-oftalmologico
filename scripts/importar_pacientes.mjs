import fs from "fs";
import readline from "readline";

// Mapeo de códigos de mutual a nombres de mutual
// Basado en el CSV de mutuales que importamos anteriormente
const CODIGO_A_MUTUAL = {
  "1": "SMATA",
  "2": "OSPAGH",
  "3": "OSPIP",
  "4": "OSDE",
  "5": "DIGOS",
  "6": "APS",
  "7": "OSECAC",
  "8": "OSPIT",
  "9": "CON-SALUD",
  "10": "CORREO-ENCOTEL",
  "11": "INTA",
  "12": "OSPLAD",
  "13": "IOS",
  "14": "AGUA Y ENERGIA",
  "15": "SUTIAGA",
  "16": "OSTA",
  "17": "BANCO",
  "18": "PAMI (SISCAT)",
  "19": "ATSA",
  "20": "OSEP",
  "21": "OSPIL",
  "22": "ISSARA",
  "23": "UOCRA",
  "24": "IOSE",
  "25": "VIALIDAD NACIONAL (PART)",
  "26": "PREMEDICA",
  "27": "PAPELEROS",
  "28": "OSFATUM",
  "29": "UTEDYC",
  "30": "OSTEL",
  "31": "VITIVINICOLA",
  "32": "FATFA",
  "33": "ACA SALUD",
  "34": "OSFATLYF",
  "35": "OSPSA",
  "36": "IOSAME",
  "37": "CAJA NAYS",
  "38": "UOYEP",
  "39": "SEIVARA (VIDRIO)",
  "40": "AOMA (MINEROS)",
  "41": "SECA (CAUCHO)",
  "42": "UPFPARA (PINTURA)",
  "43": "OSDOP",
  "44": "MITA",
  "45": "OSETYA",
  "46": "OSAPM",
  "47": "PODER JUDICIAL",
  "48": "OSTYR",
  "49": "OSPIV",
  "50": "OSPES",
  "51": "SET-SALUD",
  "52": "OSTIG",
  "53": "PASTELEROS",
  "54": "OSPAGA",
  "55": "FOCRA",
  "56": "OSIM",
  "57": "AMFFA",
  "58": "OSPI",
  "59": "OSITAC",
  "60": "SAN PEDRO",
  "61": "OSPA",
  "62": "MEDICINA PRIVADA",
  "63": "OSPTV",
  "64": "OSDIC",
  "65": "OSPTA",
  "66": "OSPJAYE",
  "67": "SAFJP",
  "68": "OSPIA",
  "69": "OSPEA",
  "70": "ALTERNATIVA SALUD",
  "71": "ACCEDA SALUD",
  "72": "OSPAT",
  "73": "UNION PERSONAL",
  "74": "OSOUTGRA",
  "75": "CONDUCTORES CAMIONEROS",
  "76": "SWISS MEDICAL",
  "77": "CONSOLIDAR SALUD",
  "79": "OSPYQUIT",
  "80": "GERARQUICO SALUD",
  "81": "DOCTOS",
  "82": "MEDIFE",
  "83": "PROFE",
  "85": "OSPEGAP",
  "86": "OSAM",
  "87": "OSMTT",
  "88": "OSPES",
  "89": "UNIMED",
  "90": "OSPEP",
  "91": "MEDICUS",
  "92": "OSPIDA",
  "93": "OSUOMRA",
  "94": "OSPES",
  "95": "OMIN",
  "96": "OSMEDICA",
  "97": "RED SEGURO   MEDICO",
  "100": "OSIMRRA",
  "101": "OSMTT",
  "102": "UNIMED",
  "103": "OSFA",
  "107": "OCINRRA  BIT",
  "108": "PARTICULAR",
  "109": "SIN COBERTURA",
  "110": "SRT",
  "111": "ACCORD SALUD",
  "112": "OSPRERA",
  "113": "SANCOR SALUD",
  "114": "GALENO",
  "115": "TV SALUD",
  "116": "OSMATA",
  "117": "OSSEG",
  "118": "OSEGG",
  "119": "OSPSIP",
  "120": "OSPACA",
  "121": "NOBIS",
  "122": "OSPSIP",
  "123": "OSDEPYM",
  "124": "PREVENCION SALUD",
  "125": "CAPITANES Y BAQUEANOS MAR",
  "126": "FUTBOLISTAS ARG AGREMIADO",
  "127": "IOSFA",
  "128": "MEDICAL GROUP",
  "129": "NOBIS",
  "130": "1OSEP",
  "131": "OSJERA",
  "132": "OSPECON",
  "133": "JERARQUICOS",
  "134": "OSSACRA",
  "135": "CAMPAÐA VUELTA COLE",
  "136": "BRAMED",
  "137": "BIENESTAR SALUD",
  "138": "BRAMED",
  "139": "OSF"
};

// Función para convertir fecha de DD/MM/YYYY a YYYY-MM-DD
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return '';
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  
  // Asumir años 19xx para fechas mayores al año actual (ej. 56 -> 1956)
  // Pocketbase requiere un string con formato ISO o datetime válido
  return `${year}-${month}-${day} 12:00:00.000Z`;
}

async function importPacientes() {
  const filePath = "data/PACIENTE.DBF - 60001-70000.csv";
  
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

    // Formato: APELLIDOS;NOMBRES;NUM_FICH;DOMICI;TELE;COD_MUTU;DOCUM;TIPO;NUM_AF;FEC_NACI
    // Para resolver problemas de comillas o caracteres especiales si los hay, 
    // en este caso es un split directo por punto y coma.
    const parts = line.split(";");
    
    // Si no hay al menos un apellido, saltar
    if (parts.length < 1 || !parts[0].trim()) continue;

    const apellido = parts[0] ? parts[0].trim().toUpperCase() : "";
    const nombre = parts[1] ? parts[1].trim().toUpperCase() : "";
    const numero_ficha = parts[2] ? parts[2].trim().toUpperCase() : "";
    const domicilio = parts[3] ? parts[3].trim() : "";
    const telefono = parts[4] ? parts[4].trim() : "";
    const cod_mutu = parts[5] ? parts[5].trim() : "";
    const tipo_documento = "DNI";
    const numero_documento = parts[6] ? parts[6].trim() : "";
    // Ignoramos tipo de doc (parts[7]) por ahora ya que no hay campo en BD
    const numero_afiliado = parts[8] ? parts[8].trim() : "";
    const fec_naci = parts[9] ? parts[9].trim() : "";

    // Determinar la obra social por el código
    let obra_social = "PARTICULAR";
    if (cod_mutu && cod_mutu !== "0" && CODIGO_A_MUTUAL[cod_mutu]) {
      obra_social = CODIGO_A_MUTUAL[cod_mutu];
    } else if (cod_mutu === "108") { // Particular
      obra_social = "PARTICULAR";
    }

    const fecha_nacimiento = parseDate(fec_naci);

    const payload = {
      nombre,
      apellido,
      tipo_documento,
      numero_documento,
      telefono,
      email: "", // No hay email en el CSV
      fecha_nacimiento: fecha_nacimiento || "",
      obra_social,
      numero_afiliado,
      domicilio,
      numero_ficha
    };

    try {
      const response = await fetch("https://pocketbase-consultorio-oftalmologico.acostaparra.com/api/collections/pacientes/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`✅ Importado: ${apellido} ${nombre}`);
        successCount++;
      } else {
        const err = await response.json();
        console.error(`❌ Error al importar ${apellido} ${nombre}:`, err);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error de conexión al importar ${apellido} ${nombre}:`, error.message);
      errorCount++;
    }
  }

  console.log("\n--- Resumen de Importación de Pacientes ---");
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
}

importPacientes();