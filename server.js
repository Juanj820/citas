const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Usamos la versión de promesas de mysql2 para async/await

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Configuración de la conexión a la base de datos MySQL
const dbConfig = {
    host: 'localhost', // O la IP de tu servidor de base de datos
    user: 'root',      // Tu usuario de MySQL
    password: 'juan',      // Tu contraseña de MySQL (déjalo vacío si no tienes)
    database: 'citas_medicas' // El nombre de la base de datos que creaste con citas_medicas.sql
};

// Función para establecer la conexión a la base de datos
async function connectDb() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Conexión a la base de datos MySQL exitosa!');
        return connection;
    } catch (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1); // Sale de la aplicación si no puede conectar a la DB
    }
}

let dbConnection; // Variable para almacenar la conexión a la DB

// Inicializar la conexión a la base de datos cuando el servidor arranca
(async () => {
    dbConnection = await connectDb();
})();


// --- Login endpoint ---
app.post('/login', async (req, res) => {
    const { usuario, clave } = req.body;
    try {
        const [rows] = await dbConnection.execute('SELECT * FROM usuarios WHERE usuario = ? AND clave = ?', [usuario, clave]);
        if (rows.length > 0) {
            res.json({ success: true, message: 'Inicio de sesión exitoso.' });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

// --- Patient Endpoints ---
app.post('/pacientes', async (req, res) => {
    const { nombre, documento, telefono } = req.body;
    try {
        const [result] = await dbConnection.execute(
            'INSERT INTO pacientes (nombre, documento, telefono) VALUES (?, ?, ?)',
            [nombre, documento, telefono]
        );
        res.status(201).json({ id: result.insertId, nombre, documento, telefono });
    } catch (error) {
        console.error('Error al registrar paciente:', error);
        res.status(500).json({ message: 'Error al registrar el paciente.' });
    }
});

app.get('/pacientes', async (req, res) => {
    try {
        const [rows] = await dbConnection.execute('SELECT * FROM pacientes');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener pacientes:', error);
        res.status(500).json({ message: 'Error al obtener los pacientes.' });
    }
});

// --- Doctor Endpoints ---
//app.post('/medicos', async (req, res) => {
// const { nombre, especialidad, estado } = req.body; // 'estado' en el modelo de BD es 'disponibilidad'
//try {
//const [result] = await dbConnection.execute(
//'INSERT INTO medicos (nombre, especialidad, disponibilidad) VALUES (?, ?, ?)',
// [nombre, especialidad, estado] // Mapeamos 'estado' del frontend a 'disponibilidad' en la BD
// );
// res.status(201).json({ id: result.insertId, nombre, especialidad, estado });
//} catch (error) {
// console.error('Error al registrar médico:', error);
//  res.status(500).json({ message: 'Error al registrar el médico.' });
// }
//});
app.post('/medicos', async (req, res) => {
    const { nombre, especialidad, estado } = req.body; // 'estado' en el modelo de BD es 'disponibilidad'
    try {
        // 1. Verificar si la especialidad ya existe
        const [existingSpeciality] = await dbConnection.execute(
            'SELECT id FROM especialidades WHERE nombre = ?',
            [especialidad]
        );

        let especialidadId;
        if (existingSpeciality.length === 0) {
            // Si la especialidad no existe, insertarla
            const [newSpecialityResult] = await dbConnection.execute(
                'INSERT INTO especialidades (nombre) VALUES (?)',
                [especialidad]
            );
            especialidadId = newSpecialityResult.insertId;
        } else {
            especialidadId = existingSpeciality[0].id;
        }

        // 2. Insertar el médico
        const [result] = await dbConnection.execute(
            'INSERT INTO medicos (nombre, especialidad, disponibilidad) VALUES (?, ?, ?)',
            [nombre, especialidad, estado] // Mapeamos 'estado' del frontend a 'disponibilidad' en la BD
        );
        res.status(201).json({ id: result.insertId, nombre, especialidad, estado });
    } catch (error) {
        console.error('Error al registrar médico o especialidad:', error);
        res.status(500).json({ message: 'Error al registrar el médico o la especialidad.' });
    }
});


app.get('/medicos', async (req, res) => {
    const { especialidad } = req.query;
    try {
        let query = 'SELECT id, nombre, especialidad, disponibilidad FROM medicos';
        let params = [];
        if (especialidad) {
            query += ' WHERE especialidad = ?';
            params.push(especialidad);
        }
        const [rows] = await dbConnection.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener médicos:', error);
        res.status(500).json({ message: 'Error al obtener los médicos.' });
    }
});

// --- Specialities Endpoints ---
app.get('/especialidades', async (req, res) => {
    try {
        const [rows] = await dbConnection.execute('SELECT id, nombre FROM especialidades ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener especialidades:', error);
        res.status(500).json({ message: 'Error al obtener las especialidades.' });
    }
});

// --- Appointment Endpoints ---
app.post('/agendarCita', async (req, res) => {
    const { paciente_id, medico_id, fecha, hora } = req.body;
    try {
        // Verificar si la hora ya está ocupada para este médico en esta fecha
        const [existingAppointments] = await dbConnection.execute(
            'SELECT COUNT(*) AS count FROM citas WHERE medico_id = ? AND fecha = ? AND hora = ?',
            [medico_id, fecha, hora]
        );

        if (existingAppointments[0].count > 0) {
            return res.status(400).json({ message: 'La hora seleccionada ya está ocupada para este médico.' });
        }

        // Obtener nombre del paciente y médico para la respuesta
        const [patientRows] = await dbConnection.execute('SELECT nombre FROM pacientes WHERE id = ?', [paciente_id]);
        const [doctorRows] = await dbConnection.execute('SELECT nombre, especialidad FROM medicos WHERE id = ?', [medico_id]);

        if (patientRows.length === 0 || doctorRows.length === 0) {
            return res.status(400).json({ message: 'Paciente o médico no encontrado.' });
        }

        const pacienteNombre = patientRows[0].nombre;
        const medicoNombre = doctorRows[0].nombre;
        const medicoEspecialidad = doctorRows[0].especialidad;

        // Insertar la nueva cita
        const [result] = await dbConnection.execute(
            'INSERT INTO citas (paciente_id, medico_id, fecha, hora) VALUES (?, ?, ? ,?)',
            [paciente_id, medico_id, fecha, hora]
        );

        const newAppointment = {
            id: result.insertId,
            paciente_id: parseInt(paciente_id),
            medico_id: parseInt(medico_id),
            fecha,
            hora,
            paciente: pacienteNombre,
            medico: medicoNombre,
            especialidad: medicoEspecialidad // Añadir la especialidad del médico
        };

        res.status(201).json({ success: true, message: 'Cita agendada correctamente', appointment: newAppointment });

    } catch (error) {
        console.error('Error al agendar cita:', error);
        res.status(500).json({ message: 'Error interno del servidor al agendar cita.' });
    }
});

app.get('/citas', async (req, res) => {
    try {
        const [rows] = await dbConnection.execute(`
            SELECT
                c.id,
                c.fecha,
                c.hora,
                p.nombre AS paciente,
                m.nombre AS medico,
                m.especialidad AS especialidad
            FROM
                citas c
            JOIN
                pacientes p ON c.paciente_id = p.id
            JOIN
                medicos m ON c.medico_id = m.id
            ORDER BY c.fecha DESC, c.hora DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ message: 'Error al obtener las citas.' });
    }
});

app.get('/verificar-cita', async (req, res) => {
    const { medico_id, fecha, hora } = req.query;
    try {
        const [rows] = await dbConnection.execute(
            'SELECT COUNT(*) AS count FROM citas WHERE medico_id = ? AND fecha = ? AND hora = ?',
            [medico_id, fecha, hora]
        );
        const ocupada = rows[0].count > 0;
        res.json({ ocupada });
    } catch (error) {
        console.error('Error al verificar cita:', error);
        res.status(500).json({ message: 'Error al verificar la disponibilidad de la cita.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});