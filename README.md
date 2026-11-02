# Sistema de Préstamo de Libros

Sistema web integral basado en una arquitectura cliente-servidor para la gestión eficiente de préstamos y devoluciones de libros. 

## Descripción General
Este proyecto proporciona una plataforma completa para administrar una biblioteca o catálogo de libros. Soporta la gestión de usuarios, control de sesiones, roles de administración y un sistema de reglas y permisos para validar las transacciones[cite: 1]. El ciclo de desarrollo emplea un enfoque riguroso en TDD (Desarrollo Guiado por Pruebas) y BDD (Desarrollo Guiado por Comportamiento)[cite: 1].

## Características Principales
- **Gestión de Cuentas y Sesiones**: Autenticación de usuarios, manejo de sesiones y encriptación (hash) de contraseñas[cite: 1].
- **Catálogo de Libros**: Registro y consulta de libros disponibles en el sistema[cite: 1].
- **Préstamos y Devoluciones**: Lógica central para pedir y devolver ejemplares aplicando validaciones y reglas de negocio[cite: 1].
- **Módulo de Administración**: Panel de control con gestión de permisos y roles avanzados[cite: 1].

## Tecnologías y Arquitectura
- **Frontend**: Aplicación SPA (Single Page Application) construida con Angular y TypeScript[cite: 1].
- **Backend**: API desarrollada en Python que centraliza el modelo de dominio y las reglas de negocio[cite: 1].
- **Base de Datos**: Firebase y Firestore con reglas de seguridad estructuradas[cite: 1].
- **Aseguramiento de Calidad (Testing)**: Pruebas unitarias, de integración y E2E utilizando Pytest, Vitest, Playwright y Cucumber (para archivos `.feature`)[cite: 1].
- **Infraestructura y CI/CD**: Contenedorización mediante Docker y Docker Compose, con despliegue e integración continua a través de GitHub Actions[cite: 1].

## Estructura del Repositorio
- `/app` y `/src`: Código fuente del backend en Python, lógica de dominio, datos y servicios HTTP[cite: 1].
- `/frontend` y `/web`: Código fuente de la interfaz de usuario en Angular[cite: 1].
- `/features`: Especificaciones de comportamiento detalladas para cada caso de uso del sistema[cite: 1].
- `/docs`: Documentación técnica del programador, backlog, prácticas XP y reportes de cobertura[cite: 1].
- `/tests`, `/pruebas` y `/e2e`: Entorno completo de automatización de pruebas[cite: 1].

## Ejecución en Entorno de Desarrollo
El proyecto está configurado para desplegarse mediante contenedores, lo que garantiza la paridad entre entornos.

1. Clonar el repositorio.
2. Verificar la instalación de Docker y Docker Compose en el sistema local.
3. Levantar los servicios ejecutando:
   ```bash
   docker-compose up --build