---
description: Guía de funcionamiento del módulo de Eventos y Logística
---

# Guía de Gestión de Eventos - Nexxa Sound

Este documento describe el flujo operativo y las funcionalidades del módulo de Eventos, el corazón de la aplicación Nexxa-Staff.

## 1. El Tablero de Eventos (Dashboard)
Desde la vista principal de "Eventos", se gestiona el calendario activo. Cada tarjeta de evento proporciona indicadores visuales de estado:

*   **Barras de Progreso (4 niveles)**:
    1.  **Staff**: Indica si el personal (DJ, Fotógrafos, etc.) ha sido confirmado.
    2.  **Entregado**: El material ha salido de bodega y está en el sitio del evento.
    3.  **Recibido**: El material ha sido retornado a bodega.
    4.  **Pagado**: Se ha completado el pago de nómina al staff.
*   **Alertas Financieras**: Etiquetas en amarillo indican saldos pendientes por cobrar al cliente.
*   **Estados de Color**:
    *   Borde **Verde**: Evento liquidado y finalizado.
    *   Borde **Cian**: Evento en curso o con gestiones pendientes.

## 2. Gestión Multi-Rol (Áreas)
La aplicación separa la logística en tres áreas principales para permitir horarios y materiales independientes:

*   **🎧 DJ / Sonido**: Gestión de equipos de audio e iluminación.
*   **📸 Fotografía**: Seguimiento de cámara y accesorios de registro. Posee cálculo de nómina basado en horas extras tras las 4h iniciales ($15k/hr extra).
*   **🎈 Decoración**: Control de materiales de montaje visual y accesorios.

## 3. Nómina Automática
El sistema calcula los pagos del staff en tiempo real al visualizar el detalle del evento:
*   **DJ/Gestor**: Base + variable por hora.
*   **Fotógrafo**: Base de $45k + horas extras.
*   **Decorador**: Tarifa de montaje fija ($35k).

## 4. Documentación Operativa
*   **Orden de Misión (PDF)**: Genera un documento técnico para el staff con los materiales agrupados por área (DJ, Foto, Decor), facilitando la carga y descarga sin confusiones.

---
*Nexxa Sound - Gestión Ágil de Eventos*
