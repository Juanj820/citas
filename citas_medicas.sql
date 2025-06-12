
-- citas_medicas.sql
CREATE DATABASE IF NOT EXISTS citas_medicas;
USE citas_medicas;

CREATE TABLE IF NOT EXISTS pacientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  documento VARCHAR(20),
  telefono VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS medicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  especialidad VARCHAR(100),
  disponibilidad VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS citas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT,
  medico_id INT,
  fecha DATE,
  hora TIME,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (medico_id) REFERENCES medicos(id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL,
  clave VARCHAR(100) NOT NULL
);

INSERT INTO usuarios (usuario, clave) VALUES ('admin', '12345');

CREATE TABLE IF NOT EXISTS especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  especialidad VARCHAR(100) NOT NULL
);

-- Opcional: insertar especialidades de ejemplo
INSERT INTO especialidades (nombre) VALUES 
(1, 'Medicina General'),
(2, 'Pediatría'),
(3, 'Cardiología'),
(4, 'Dermatología'),
(5, 'Neurología'),
(6, 'Radiología'),
(7, 'Laboratorio Clínico'),
(8, 'Ginecología'),
(9, 'Medicina Interna'),
(10, 'Neumología'),
(11, 'Edocrinología'),
(12, 'Reumatología'),
(13, 'Gastroenterología'),
(14, 'Nefrología'),
(15, 'Urología'),
(16, 'Otorrinolaringología'),
(17, 'Psiquiatría');

