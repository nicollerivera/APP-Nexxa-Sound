import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPeso, formatT, subtractMinutes, addMinutes } from '../utils/helpers';

// --- PDF GENERATOR (LOGISTICS MISSION) - STATE OF THE ART DESIGN ---
const COLORS = {
    DARK: [0, 0, 0],          // Pure Black
    WHITE: [255, 255, 255],
    ICE: [248, 249, 252],
    CYAN: [0, 242, 255],      // Official Nexxa Cyan
    PURPLE: [188, 111, 241],  // Official Nexxa Purple
    PURPLE_SOFT: [245, 243, 255],
    GREY_TEXT: [100, 110, 130],
    BORDERS: [225, 230, 240]
};

// --- PDF GENERATOR (LOGISTICS MISSION) ---
export const generateMissionPDF = async (evt, role = 'GENERAL', events = [], getCollectionResponsibility) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = 297;
        const margin = 15;

        const getBase64 = async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Fetch error');
                const blob = await response.blob();
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) { return null; }
        };

        const logoData = await getBase64('/logo_staff_new.jpg');

        doc.setFillColor(...COLORS.DARK);
        doc.rect(0, 0, pageWidth, 50, 'F');
        doc.setFillColor(15, 15, 20);
        doc.rect(0, 50, pageWidth, pageHeight - 50, 'F');

        if (logoData) {
            doc.addImage(logoData, 'JPEG', margin, 10, 30, 30);
            doc.setFillColor(0, 0, 0);
            doc.rect(margin + 26, 36, 4, 4, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const titlePart1 = 'NEXXA SOUND ';
        const titlePart2 = role === 'GENERAL' ? 'LEVEL PRODUCTIONS' : `ORDEN DE TRABAJO`;
        const w2 = doc.getTextWidth(titlePart2);
        const w1 = doc.getTextWidth(titlePart1);
        doc.setTextColor(...COLORS.PURPLE);
        doc.text(titlePart2, pageWidth - margin, 25, { align: 'right' });
        doc.setTextColor(...COLORS.CYAN);
        doc.text(titlePart1, pageWidth - margin - w2, 25, { align: 'right' });

        doc.save(`ORDEN_${role}_${(evt.client?.name || 'EVENTO').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error(err);
        alert('Error en Misión PDF: ' + err.message);
    }
};

export const generateQuotationPDF = async (quo) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = 297;
        const margin = 20;

        const getBase64 = async (url) => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) { return null; }
        };

        const logoData = await getBase64('/logo_staff_new.jpg');
        const signatureData = await getBase64('/firma_sharon.jpg');

        const THEME = {
            TEXT_MAIN: [17, 17, 17],
            TEXT_SUB: [51, 51, 51],
            TEXT_LEGAL: [119, 119, 119],
            ACCENT: [158, 101, 211], // Nexxa Purple
            GREY_LINE: [200, 200, 200]
        };

        // 1. HEADER
        let y = 15;
        if (logoData) {
            doc.addImage(logoData, 'JPEG', (pageWidth / 2) - 15, y, 30, 30);
            y += 42;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('Contrato de Prestación de Servicios', pageWidth / 2, y, { align: 'center' });
        y += 7;

        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Producción de eventos · Sonido · Iluminación · DJ', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setTextColor(...THEME.TEXT_LEGAL);
        doc.text(`Bogotá D.C. · ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, y, { align: 'center' });
        y += 15;

        // 2. DATOS DEL EVENTO
        doc.setFontSize(11);
        doc.setTextColor(...THEME.ACCENT);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL EVENTO', margin, y);
        y += 4;
        doc.setDrawColor(...THEME.GREY_LINE);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        const leftColX = margin;
        const rightColX = pageWidth / 2 + 10;
        
        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_MAIN);

        doc.setFont('helvetica', 'bold'); doc.text('Cliente:', leftColX, y);
        doc.setFont('helvetica', 'normal'); doc.text((quo.client?.name || '---').toUpperCase(), leftColX + 35, y);
        doc.setFont('helvetica', 'bold'); doc.text('Fecha:', rightColX, y);
        doc.setFont('helvetica', 'normal'); doc.text(quo.eventDetails?.date || '---', rightColX + 35, y);
        y += 8;

        doc.setFont('helvetica', 'bold'); doc.text('Ubicación:', leftColX, y);
        const locText = `${quo.eventDetails?.neighborhood || ''} - ${quo.eventDetails?.location || ''}`.toUpperCase();
        doc.setFont('helvetica', 'normal'); 
        const splitLoc = doc.splitTextToSize(locText, 60);
        doc.text(splitLoc, leftColX + 35, y);
        
        doc.setFont('helvetica', 'bold'); doc.text('H. Evento:', rightColX, y);
        doc.setFont('helvetica', 'normal'); doc.text(`${formatT(quo.eventDetails?.startTime)} - ${formatT(quo.eventDetails?.endTime)}`, rightColX + 35, y);
        y += 10;

        const st = quo.eventDetails || {};
        const timeList = [
            { l: 'H. Fotografía:', v: st.photoStartTime ? `${formatT(st.photoStartTime)} - ${formatT(st.photoEndTime)}` : 'N/A' },
            { l: 'H. Decoración:', v: st.decorStartTime ? `${formatT(st.decorStartTime)} - ${formatT(st.decorEndTime)}` : 'N/A' },
            { l: 'H. Audiovisual:', v: st.avStartTime ? `${formatT(st.avStartTime)} - ${formatT(st.avEndTime)}` : 'N/A' }
        ];

        timeList.forEach((item, i) => {
            doc.setFont('helvetica', 'bold'); doc.text(item.l, rightColX, y + (i * 6));
            doc.setFont('helvetica', 'normal'); doc.text(item.v, rightColX + 35, y + (i * 6));
        });

        y += (timeList.length * 6) + 10;

        // 3. DETALLE DEL SERVICIO (TABLE)
        const packName = (quo.logistics?.packName || 'A LA CARTA').toUpperCase();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...THEME.ACCENT);
        doc.text(`DETALLES DEL SERVICIO - Paquete: ${packName}`, margin, y);
        y += 8;

        const tableRows = [];
        const isONIX = packName.includes('ONIX');
        const isMULTII = packName.includes('MULTII');
        const isKAIZEN = packName.includes('KAIZEN');

        const serviceDescriptions = {
            av: "SONIDO PROFESIONAL: 2 Cabinas activas, 2 Micrófonos Inalámbricos, 4 Luces Rítmicas, Cámara de Humo y DJ Crossover en vivo con montaje/desmontaje.",
            photo: "FOTOGRAFÍA PROFESIONAL: Incluye cámara profesional, cumplimiento de cronograma y entrega digital del material en Micro SD corregido.",
            cam: "CÁMARA 360 XL: Plataforma de 3x2 metros con capacidad para 15 personas, videos en resolución 4K, entrega inmediata y personal encargado.",
            makeup: "STAND MAQUILLAJE NEÓN: Incluye maquillador profesional, pinturas UV especiales de alta pigmentación y pinceles por 2 horas de servicio.",
            decor: `DECORACIÓN PERSONALIZADA: Set temático adaptado al espacio (incluye mobiliario premium, arco de globos orgánico y accesorios del set).`
        };

        const services = [
            { id: 'av', label: 'AUDIOVISUALES', start: st.avStartTime || st.startTime, end: st.avEndTime || st.endTime, desc: serviceDescriptions.av, incl: isONIX || isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_av'] },
            { id: 'photo', label: 'FOTOGRAFÍA', start: st.photoStartTime || st.startTime, end: st.photoEndTime || st.endTime, desc: serviceDescriptions.photo, incl: isONIX || isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_photo'] },
            { id: 'cam', label: 'CÁMARA 360 XL', start: st.cam360StartTime || st.startTime, end: st.cam360EndTime || st.endTime, desc: serviceDescriptions.cam, incl: isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_cam360'] },
            { id: 'makeup', label: 'MAQUILLAJE NEÓN', start: st.makeupStartTime || st.startTime, end: st.makeupEndTime || st.endTime, desc: serviceDescriptions.makeup, incl: isKAIZEN || quo.logistics?.selectedExtras?.['extra_makeup'] },
            { id: 'decor', label: 'DECORACIÓN', start: st.decorStartTime || st.startTime, end: st.decorEndTime || st.endTime, desc: serviceDescriptions.decor, incl: isONIX || isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_decor_onix'] || quo.logistics?.selectedExtras?.['extra_decor_multii'] || quo.logistics?.selectedExtras?.['extra_decor_kaizen'] }
        ];

        const extras = quo.logistics?.selectedExtras || {};
        const extraQtys = quo.logistics?.extraQtys || {};
        Object.keys(extras).forEach(k => {
            if (extras[k] && !['extra_photo', 'extra_cam360', 'extra_makeup', 'extra_av', 'extra_decor_onix', 'extra_decor_multii', 'extra_decor_kaizen'].includes(k)) {
                const qty = extraQtys[k] || 1;
                tableRows.push(['---', k.replace('extra_', '').replace('acc_', '').toUpperCase(), `KIT/ACCESORIO: Cantidad ${qty} unidades. Especificar al personal.`, '---', '---', 'INCLUIDO']);
            }
        });

        services.filter(s => s.incl).forEach(s => {
            const h1 = s.start || '20:00';
            const h2 = s.end || '00:00';
            const [ho1, mo1] = h1.split(':').map(Number);
            const [ho2, mo2] = h2.split(':').map(Number);
            let diff = (ho2 * 60 + mo2) - (ho1 * 60 + mo1);
            if (diff < 0) diff += 24 * 60;
            const hours = (diff / 60).toFixed(1);

            tableRows.push([
                `${formatT(h1)} - ${formatT(h2)}`,
                s.label,
                s.desc,
                `${hours}h`,
                '---',
                'INCLUIDO'
            ]);
        });

        autoTable(doc, {
            startY: y,
            theme: 'grid',
            head: [['Franja Horaria', 'Servicio', 'Detalles técnicos incluidos', 'Horas', 'Valor/h', 'Subtotal']],
            body: tableRows,
            styles: { fontSize: 7.5, cellPadding: 3, textColor: THEME.TEXT_MAIN, lineColor: [240, 240, 240] },
            headStyles: { fillColor: [250, 250, 250], textColor: THEME.ACCENT, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 32 },
                1: { cellWidth: 28, fontStyle: 'bold' },
                2: { cellWidth: 70 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' }
            }
        });

        y = doc.lastAutoTable.finalY + 12;

        const total = quo.financials?.totalValue || 0;
        const deposit = quo.financials?.deposit || (total * 0.3);
        const finalBalance = total - deposit;
        const extraHourValue = quo.financials?.extraHourPrice || 85000;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Costo de transporte y logística:', margin, y);
        doc.text('INCLUIDO', margin + 60, y);
        y += 6;
        doc.text('Valor hora extra contratada:', margin, y);
        doc.setTextColor(...THEME.ACCENT); doc.setFont('helvetica', 'bold');
        doc.text(formatPeso(extraHourValue), margin + 60, y);
        doc.setTextColor(...THEME.TEXT_MAIN); doc.setFont('helvetica', 'normal');
        y += 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...THEME.ACCENT);
        doc.text('TOTAL DEL CONTRATO:', pageWidth - margin - 80, y);
        doc.text(formatPeso(total), pageWidth - margin, y, { align: 'right' });
        y += 12;

        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text(`Abono realizado (30%): ${formatPeso(deposit)}`, margin, y);
        doc.text(`Saldo pendiente a recaudar (70%): ${formatPeso(finalBalance)}`, pageWidth - margin, y, { align: 'right' });

        y += 18;

        const fullConditions = [
            {
                title: "PAGO DEL SERVICIO",
                items: [
                    "El saldo pendiente se pagará en su totalidad el día del evento. Se podrá cancelar en efectivo o mediante transferencia a las cuentas autorizadas (Nequi/Daviplata: 3002596935).",
                    "El pago correspondiente debe ser realizado al Gestor asignado ANTES de dar inicio al servicio.",
                    "Sin excepción alguna, el servicio no podrá dar inicio si el saldo pendiente no ha sido cancelado en su totalidad."
                ]
            },
            {
                title: "CANCELACIÓN",
                items: [
                    "En caso de necesitar cancelar el servicio, es necesario hacerlo con un mínimo de 2 días de anticipación. De lo contrario, se deberá asumir el 35% del valor total del servicio.",
                    "Si el servicio es cancelado después de haber realizado el abono, NO se realizarán devoluciones debido a costos administrativos y de reserva."
                ]
            },
            {
                title: "APLAZAMIENTO",
                items: [
                    "En caso de que el servicio sea aplazado, la reserva se mantendrá únicamente por un plazo máximo de un (1) mes. De lo contrario, se considerará como una cancelación.",
                    "La reprogramación del servicio solo será posible si disponemos de disponibilidad para la nueva fecha solicitada."
                ]
            },
            {
                title: "TENER EN CUENTA (LOGÍSTICA)",
                items: [
                    "Los datos del Gestor (nombre y cédula) podrán ser solicitados SOLAMENTE un día antes del servicio sin excepciones, ya que la programación se realiza basada en la disponibilidad del personal en esa fecha.",
                    "En caso de que el Gestor llegue tarde, se repondrá el tiempo perdido. Si no es posible debido al horario, se descontarán $5.000 por cada media hora de retraso, cubriendo la nómina del Gestor."
                ]
            },
            {
                title: "INCONVENIENTES Y RECLAMOS",
                items: [
                    "La empresa se compromete a garantizar la entrega de todos los elementos descritos en este contrato.",
                    "Cualquier inconformidad relacionada con la prestación del servicio deberá ser abordada y resuelta EN EL MOMENTO por el personal presente en el evento para dar solución inmediata."
                ]
            }
        ];

        doc.setFontSize(11);
        doc.setTextColor(...THEME.ACCENT);
        doc.setFont('helvetica', 'bold');
        doc.text('Información del Servicio y Recomendaciones', margin, y);
        y += 8;

        fullConditions.forEach((section) => {
            if (y > pageHeight - 50) { doc.addPage(); y = 30; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_MAIN);
            doc.text(section.title, margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...THEME.TEXT_SUB);
            section.items.forEach(item => {
                const split = doc.splitTextToSize(`• ${item}`, pageWidth - (margin * 2));
                doc.text(split, margin, y);
                y += (split.length * 4.5);
            });
            y += 4;
        });

        y += 5;
        if (y > pageHeight - 60) { doc.addPage(); y = 30; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(220, 20, 60); 
        doc.text('¡IMPORTANTE!', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_MAIN);
        const warning = "Cualquier servicio, equipo o indicación que NO esté especificada explícitamente dentro de este contrato no tendrá derecho a reclamos ni devoluciones. Solo se cumplirá estrictamente con los ítems y servicios pactados en este documento.";
        const splitW = doc.splitTextToSize(warning, pageWidth - (margin * 2.5));
        doc.text(splitW, pageWidth / 2, y, { align: 'center' });
        y += (splitW.length * 5) + 12;

        doc.setFontSize(8.5); doc.setTextColor(...THEME.TEXT_LEGAL);
        const hoy = new Date().toLocaleDateString('es-CO');
        doc.text(`Este contrato se rige por las leyes de la República de Colombia.\nPara constancia se firma en Bogotá D.C. el ${hoy}.`, margin, y);
        y += 35;

        if (y > pageHeight - 60) { doc.addPage(); y = 60; }
        const sigWidth = 75;
        doc.setLineWidth(0.5); doc.setDrawColor(...THEME.GREY_LINE);
        doc.line(margin, y, margin + sigWidth, y);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('EL CLIENTE', margin, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_SUB);
        doc.text(`Nombre: ${quo.client?.name || ''}`, margin, y + 10);
        doc.text(`Cédula: ________________`, margin, y + 15);

        const pX = pageWidth - margin - sigWidth;
        if (signatureData) {
            doc.addImage(signatureData, 'JPEG', pX + 15, y - 35, 45, 30);
        }
        doc.line(pX, y, pX + sigWidth, y);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('EL PROVEEDOR', pX, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text('Nombre: Sharon Nicolle Rivera Tocasuche', pX, y + 10);
        doc.text('Cédula: 1024488302', pX, y + 15);
        doc.text('Nombre comercial: NEXXA', pX, y + 20);

        const totalP = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalP; i++) {
            doc.setPage(i);
            doc.setFontSize(7); doc.setTextColor(...THEME.TEXT_LEGAL);
            doc.text(`NEXXA SOUND · CONTRATO OPERATIVO · PÁGINA ${i} DE ${totalP}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        doc.save(`CONTRATO_NEXXA_${(quo.client?.name || 'CLIENTE').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        alert('Error en Contrato: ' + err.message);
    }
};
