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

// --- PDF GENERATOR (LOGISTICS MISSION) - STATE OF THE ART DESIGN ---
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

        // 0. BACKGROUND & STRUCTURE
        doc.setFillColor(...COLORS.DARK);
        doc.rect(0, 0, pageWidth, 50, 'F'); // Header block

        doc.setFillColor(15, 15, 20); // Deep Dark Body
        doc.rect(0, 50, pageWidth, pageHeight - 50, 'F');

        // 1. BRANDING (HEADER)
        if (logoData) {
            doc.addImage(logoData, 'JPEG', margin, 10, 30, 30);
            // Mask the "Gemini Star" or artifacts in the bottom right corner of the logo
            doc.setFillColor(0, 0, 0);
            doc.rect(margin + 26, 36, 4, 4, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);

        const titlePart1 = 'NEXXA SOUND ';
        const titlePart2 = role === 'GENERAL' ? 'LEVEL PRODUCTIONS' : `ORDEN DE TRABAJO`;
        const w2 = doc.getTextWidth(titlePart2);
        const w1 = doc.getTextWidth(titlePart1);

        // Right-aligned dual color title with Nexxa Colors
        doc.setTextColor(...COLORS.PURPLE);
        doc.text(titlePart2, pageWidth - margin, 25, { align: 'right' });
        doc.setTextColor(...COLORS.CYAN);
        doc.text(titlePart1, pageWidth - margin - w2, 25, { align: 'right' });

        // Subtle premium accent line
        doc.setDrawColor(...COLORS.CYAN);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - margin - (w1 + w2), 28, pageWidth - margin - (w2 * 0.5), 28); // Short line

        // Improved ID Logic: Sequential for the day
        let displayId = 'N/A';
        if (evt.eventDetails?.date) {
            const dateStr = evt.eventDetails.date;
            const shortDate = dateStr.replace(/-/g, '').substring(2); // YYMMDD
            const sameDayEvents = (events || []).filter(e => e.eventDetails?.date === dateStr)
                .sort((a, b) => (a.createdAt || a.id || '').localeCompare(b.createdAt || b.id || ''));
            const index = sameDayEvents.findIndex(e => e.id === evt.id);
            const sequence = index !== -1 ? index + 1 : sameDayEvents.length + 1;
            displayId = `${shortDate}-${String(sequence).padStart(2, '0')}`;
        } else {
            displayId = (evt.id || '---').substring(0, 8);
        }

        // FIND ASSIGNED STAFF
        const roleMapping = {
            'DJ': 'DJ / OPERADOR',
            'PHOTO': 'FOTÓGRAFO',
            'FOTO': 'FOTÓGRAFO',
            'DECOR': 'DECORADOR',
            'AV': 'AV / OPERADOR',
            'GENERAL': 'DJ / OPERADOR'
        };
        const staffRole = (roleMapping[role.toUpperCase()] || role).toUpperCase().trim();
        let assignedStaff = (evt.staff || []).find(s =>
            s && (s.role || '').toUpperCase().trim() === staffRole
        );

        // If not found and it's general, take the first one available
        if (!assignedStaff && (role === 'GENERAL' || !role) && (evt.staff || []).length > 0) {
            assignedStaff = evt.staff[0];
        }

        const staffName = assignedStaff ? (assignedStaff.name || '').toUpperCase() : 'POR ASIGNAR';

        const gestorName = (role === 'GENERAL' || !role)
            ? (evt.logistics?.managerName || evt.managerName || 'Por asignar').toUpperCase()
            : staffName;

        doc.setTextColor(110, 110, 130);
        doc.setFontSize(8.5);
        doc.text(`ID: ${displayId}  |  GESTOR: ${gestorName}`, pageWidth - margin, 37, { align: 'right' });

        let y = 58;

        // 2. LOGISTICS \u0026 DATE CARD (DARK)
        doc.setFillColor(0, 0, 0);
        doc.setDrawColor(40, 40, 50);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 24, 2, 2, 'FD');

        // Dynamic Times based on Role
        let timeLlegada = evt.eventDetails?.warehouseTime || subtractMinutes(evt.eventDetails?.startTime, 150);
        let timeLabel = 'LLEGADA A BODEGA';
        let assignedLabel = 'PERSONAL ASIGNADO';

        if (role === 'PHOTO' || role === 'FOTO') {
            timeLlegada = evt.eventDetails?.photoStartTime ? subtractMinutes(evt.eventDetails.photoStartTime, 30) : evt.eventDetails?.startTime;
            timeLabel = 'LLEGADA AL LUGAR';
            assignedLabel = 'FOTÓGRAFO ASIGNADO';
        } else if (role === 'DECOR') {
            timeLlegada = evt.eventDetails?.decorStartTime ? subtractMinutes(evt.eventDetails.decorStartTime, 30) : evt.eventDetails?.startTime;
            timeLabel = 'LLEGADA PARA MONTAJE';
            assignedLabel = 'DECORADOR ASIGNADO';
        }

        // Warehouse Col
        doc.setTextColor(160, 160, 180);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(timeLabel, margin + 7, y + 7);
        doc.setTextColor(...COLORS.CYAN);
        doc.setFontSize(13);
        doc.text(formatT(timeLlegada), margin + 7, y + 16);

        // Assigned Col
        doc.setTextColor(160, 160, 180);
        doc.setFontSize(7);
        doc.text(assignedLabel, margin + 60, y + 7);
        doc.setTextColor(...COLORS.WHITE);
        doc.setFontSize(10);
        doc.text(staffName, margin + 60, y + 16);

        // Role Col
        doc.setTextColor(160, 160, 180);
        doc.setFontSize(7);
        doc.text('ROL DEL CARGO', margin + 115, y + 7);
        doc.setTextColor(...COLORS.CYAN);
        doc.setFontSize(10);
        doc.text(staffRole, margin + 115, y + 16);

        // Date Col
        doc.setTextColor(160, 160, 180);
        doc.setFontSize(7);
        doc.text('FECHA SERVICIO', pageWidth - margin - 7, y + 7, { align: 'right' });
        doc.setTextColor(...COLORS.PURPLE);
        doc.setFontSize(12);
        doc.text(evt.eventDetails?.date || '---', pageWidth - margin - 7, y + 16, { align: 'right' });

        y += 30;

        // 3. CLIENT CARD (DARK)
        doc.setFillColor(0, 0, 0);
        doc.setDrawColor(...COLORS.PURPLE);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 1.5, 1.5, 'FD');

        doc.setTextColor(...COLORS.PURPLE);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE TITULAR / EVENTO', margin + 7, y + 7);

        doc.setTextColor(...COLORS.WHITE);
        doc.setFontSize(12);
        // Fallback for names: client.name or clientName (legacy)
        const nameText = (evt.client?.name || evt.clientName || 'Invitado').toUpperCase();
        const occasionText = (evt.eventDetails?.occasion || evt.eventDetails?.type || '---').toUpperCase();
        doc.text(`${nameText}  |  ${occasionText}`, margin + 7, y + 15);

        // Client Phones & WhatsApp Link
        const phone1 = evt.client?.phone || '';
        const phone2 = evt.client?.phone2 || '';
        if (phone1 || phone2) {
            doc.setFontSize(12);
            let phoneX = margin + 15 + doc.getTextWidth(`${nameText}  |  ${occasionText}`);
            doc.setFontSize(8.5);
            if (phone1) {
                doc.setTextColor(...COLORS.CYAN);
                const p1Label = `WP: ${phone1}`;
                doc.text(p1Label, phoneX, y + 15, { link: { url: `https://wa.me/${phone1.replace(/\D/g, '')}` } });
                const tw = doc.getTextWidth(p1Label);
                doc.setDrawColor(...COLORS.CYAN);
                doc.setLineWidth(0.2);
                doc.line(phoneX, y + 16, phoneX + tw, y + 16);
                phoneX += tw + 8;
            }
            if (phone2) {
                doc.setTextColor(160, 160, 180);
                doc.text(`|  CEL: ${phone2}`, phoneX, y + 15);
            }
        }

        y += 28;

        // 4. OPERATION TABLE (DARK THEME)
        doc.setTextColor(200, 200, 220);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('LOCALIZACIÓN Y CRONOGRAMA', margin, y);
        y += 5;

        // Logic for ROLE SPECIFIC TIMES (Robust for old quotations)
        let startT = evt.eventDetails?.startTime || '00:00';
        let endT = evt.eventDetails?.endTime || '00:00';
        let isFallbackTime = false;

        if (role === 'PHOTO' || role === 'FOTO') {
            if (evt.eventDetails?.photoStartTime && evt.eventDetails.photoStartTime !== '') {
                startT = evt.eventDetails.photoStartTime;
                endT = evt.eventDetails.photoEndTime;
            } else {
                isFallbackTime = true;
            }
        } else if (role === 'DECOR') {
            if (evt.eventDetails?.decorStartTime && evt.eventDetails.decorStartTime !== '') {
                startT = evt.eventDetails.decorStartTime;
                endT = evt.eventDetails.decorEndTime;
            } else {
                // Rule: Decorator starts 1 hour before event and lasts 2 hours
                startT = subtractMinutes(evt.eventDetails?.startTime, 60);
                endT = addMinutes(startT, 120);
                // We don't mark as Fallback to avoid confusing the user with '(HORARIO GENERAL)'
                // since this is a specific business rule.
            }
        }

        const [ho1, mo1] = startT.split(':').map(Number);
        const [ho2, mo2] = endT.split(':').map(Number);
        let diffMinO = (ho2 * 60 + mo2) - (ho1 * 60 + mo1);
        if (diffMinO < 0) diffMinO += 24 * 60;
        const durationO = `${(diffMinO / 60).toFixed(1)} HORAS`;

        const scheduleString = `${formatT(startT)} - ${formatT(endT)}${isFallbackTime ? ' (HORARIO GENERAL)' : ''}`;

        const rows = [];
        if (role === 'GENERAL') {
            rows.push([
                evt.eventDetails?.neighborhood || evt.neighborhood || '---',
                evt.eventDetails?.location || '---',
                `DJ: ${formatT(evt.eventDetails?.startTime)} - ${formatT(evt.eventDetails?.endTime)}`,
                `${durationO}`
            ]);
            if (evt.eventDetails?.photoStartTime) {
                rows.push(['', '', `FOTO: ${formatT(evt.eventDetails.photoStartTime)} - ${formatT(evt.eventDetails.photoEndTime)}`, '']);
            }
            if (evt.eventDetails?.decorStartTime) {
                rows.push(['', '', `DECOR: ${formatT(evt.eventDetails.decorStartTime)} - ${formatT(evt.eventDetails.decorEndTime)}`, '']);
            }
            if (evt.eventDetails?.avStartTime) {
                rows.push(['', '', `AV: ${formatT(evt.eventDetails.avStartTime)} - ${formatT(evt.eventDetails.avEndTime)}`, '']);
            }
        } else {
            rows.push([
                evt.eventDetails?.neighborhood || evt.neighborhood || '---',
                evt.eventDetails?.location || '---',
                scheduleString,
                durationO
            ]);
        }

        autoTable(doc, {
            startY: y,
            theme: 'grid',
            head: [['ZONA / BARRIO', 'DIRECCIÓN EXACTA', role === 'GENERAL' ? 'CRONOGRAMA DE TRABAJO' : `HORARIO (${role})`, 'DURACIÓN']],
            body: rows,
            styles: { fontSize: 8.5, cellPadding: 5, fillColor: [25, 25, 30], textColor: [255, 255, 255], lineColor: [40, 40, 50] },
            headStyles: { fillColor: [0, 0, 0], textColor: COLORS.CYAN, lineWidth: 0.1, lineColor: [40, 40, 50] },
            columnStyles: { 0: { width: 40 }, 1: { width: 55 }, 2: { width: 60 }, 3: { width: 25 } }
        });

        y = doc.lastAutoTable.finalY + 12;

        // 5. MATERIALS IN CHARGE (STRICT FILTERING PER ROLE)
        let filteredItems = [];

        if (role === 'DJ') {
            const strictDJ = [
                'CABINAS ACTIVAS 15" + TRÍPODES',
                'PC PORTÁTIL + CARGADOR + CABLE AUDIO 2 a 1',
                'LUCES LED x4 + SOPORTE TRÍPODE',
                'MÁQUINA HUMO + CONTROL + LÍQUIDO',
                'KIT ENERGÍA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)'
            ];
            filteredItems = strictDJ.map(name => {
                const found = (evt.logistics?.items || []).find(i => i && i.name && String(i.name).toUpperCase().includes(name.split('"')[0]));
                return found || { name, qty: 1, area: 'DJ' };
            });
            // Add other DJ items from logistics if exist
            (evt.logistics?.items || []).filter(i => i && i.name).forEach(item => {
                if ((item.area === 'DJ' || item.area === 'LOGÍSTICA') && !filteredItems.some(f => f.name && String(f.name).toUpperCase().includes(String(item.name).toUpperCase().substring(0, 5)))) {
                    filteredItems.push(item);
                }
            });
        } else if (role === 'PHOTO' || role === 'FOTO') {
            filteredItems = (evt.logistics?.items || []).filter(i => i.area === 'PHOTO');
            if (filteredItems.length === 0) {
                filteredItems = [
                    { name: 'CÁMARA PROFESIONAL', qty: 1, area: 'PHOTO' },
                    { name: 'MICRO SD 64GB/128GB', qty: 1, area: 'PHOTO' },
                    { name: 'FLASH EXTERNO + PILAS', qty: 1, area: 'PHOTO' }
                ];
            }
        } else if (role === 'DECOR' || role === 'DECORADOR') {
            filteredItems = (evt.logistics?.items || []).filter(i => i.area === 'DECOR' || i.area === 'EXTRAS');
            if (filteredItems.length === 0) {
                filteredItems = [
                    { name: 'KIT DECORACIÓN BÁSICO', qty: 1, area: 'DECOR' }
                ];
            }
        } else {
            filteredItems = (evt.logistics?.items || []).filter(i => i && i.name) || [];
        }

        const materialsTable = filteredItems.map(item => [
            (item.name || 'SIN NOMBRE').toUpperCase(),
            (item.quantity || item.qty || 1).toString(),
            item.area || role
        ]);

        doc.setTextColor(200, 200, 220);
        doc.setFontSize(10);
        doc.text(`MATERIAL A CARGO (${role})`, margin, y);

        autoTable(doc, {
            startY: y + 5,
            theme: 'grid',
            head: [['ÍTEM / EQUIPO', 'CANTIDAD', 'ÁREA']],
            body: materialsTable.length > 0 ? materialsTable : [['SIN MATERIALES ESPECÍFICOS', '-', '-']],
            styles: { fontSize: 7.5, cellPadding: 2.2, fillColor: [25, 25, 30], textColor: [255, 255, 255], lineColor: [40, 40, 50] },
            headStyles: { fillColor: [0, 0, 0], textColor: COLORS.PURPLE, lineWidth: 0.1, lineColor: [40, 40, 50] }
        });

        let finalY = doc.lastAutoTable.finalY + 12;

        // 6. FINANCIALS & RESPONSIBILITY WARNING
        const { responsibleRole } = getCollectionResponsibility(evt);
        const totalValue = evt.financials?.totalValue || 0;
        const balanceToCollect = totalValue * 0.7; // Business Rule: Staff collects 70%

        const reallyIsMe = (role === 'DJ' && responsibleRole.includes('DJ')) ||
            (role.includes('FOTO') && (responsibleRole.includes('FOTÓGRAFO') || responsibleRole.includes('FOTO'))) ||
            (role.includes('DECOR') && responsibleRole.includes('DECORADOR'));

        // NEXXA AESTHETIC: Dark Card with specific emphasis
        if (reallyIsMe) {
            doc.setFillColor(20, 10, 35); // Dark Purple background
            doc.setDrawColor(...COLORS.CYAN); // Cyan border for contrast
        } else {
            doc.setFillColor(10, 10, 15); // Dark Nexxa background
            doc.setDrawColor(50, 50, 60); // Subtle border
        }

        doc.roundedRect(margin, finalY, pageWidth - (margin * 2), 34, 2, 2, 'FD');

        if (reallyIsMe) {
            doc.setTextColor(...COLORS.CYAN);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.text(`¡ATENCIÓN! USTED ES EL ENCARGADO DE COBRAR EL SALDO`, margin + 8, finalY + 8);

            doc.setTextColor(180, 180, 200);
            doc.setFontSize(8.5);
            const deposit = totalValue * 0.3;
            doc.text(`VALOR TOTAL: ${formatPeso(totalValue)}  -  ABONO (30%): ${formatPeso(deposit)}`, margin + 8, finalY + 16);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text(`SALDO A RECAUDAR: ${formatPeso(balanceToCollect)}`, margin + 8, finalY + 28);
        } else {
            doc.setTextColor(150, 150, 160);
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.text(`EL RESPONSABLE DE COBRO DEL SALDO ES: ${responsibleRole.toUpperCase()}`, margin + 8, finalY + 18);
        }

        // Only show financials details for GENERAL role
        y = finalY + 42;
        if (role === 'GENERAL') {
            const cardWidth = pageWidth - (margin * 2);

            // Collection Card (Full Width / Purple)
            doc.setFillColor(0, 0, 0);
            doc.setDrawColor(...COLORS.PURPLE);
            doc.roundedRect(margin, y, cardWidth, 35, 2, 2, 'FD');

            doc.setTextColor(...COLORS.PURPLE);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(`VALOR TOTAL: ${formatPeso(totalValue)}  |  ABONO RECIBIDO (30%): ${formatPeso(totalValue * 0.3)}`, margin + 7, y + 8);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text('SALDO PENDIENTE A RECAUDAR (70%):', margin + 7, y + 15);
            doc.setFontSize(20);
            doc.text(formatPeso(balanceToCollect), margin + 7, y + 26);

            doc.setFontSize(7);
            doc.setTextColor(180, 180, 200);
            doc.text(`MÉTODO: NEQUI / DAVIPLATA: 300 259 6935`, margin + 7, y + 30);
            doc.text(`MÉTODO: BANCOLOMBIA: 912 046312 30`, margin + (cardWidth / 2) + 5, y + 30);
        } else {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('** Por favor, verificar inventario y reportar novedades antes del evento. **', margin, y);
            doc.text('** El cobro debe realizarse ANTES de iniciar el servicio. **', margin, y + 5);
        }

        // 7. FOOTER UNIFIED
        doc.setTextColor(100, 110, 130);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`GUÍA OPERATIVA - ROL: ${role}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
        doc.setTextColor(188, 111, 241);
        doc.text('NEXXA SOUND - PASIÓN POR LA EXCELENCIA', pageWidth / 2, pageHeight - 8, { align: 'center' });

        doc.save(`ORDEN_${role}_${nameText}.pdf`);

    } catch (err) {
        console.error(err);
        alert('Error en Rediseño PDF: ' + err.message);
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
            ACCENT: [188, 111, 241],
            CYAN: [0, 242, 255]
        };

        // 1. HEADER (CENTERED)
        let y = 15;
        if (logoData) {
            doc.addImage(logoData, 'JPEG', (pageWidth / 2) - 15, y, 30, 30);
            y += 42;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('NEXXA SOUND', pageWidth / 2, y, { align: 'center' });
        y += 6;

        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Cotización de Servicios Audiovisuales', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text('Sonido - Iluminación - DJ - Producción de eventos', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // 2. DATOS DEL CLIENTE
        doc.setFontSize(11);
        doc.setTextColor(...THEME.ACCENT);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos del Cliente', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_MAIN);
        
        const clientData = [
            ['Nombre del cliente:', (quo.client?.name || '---').toUpperCase()],
            ['Teléfono:', quo.client?.phone || '---'],
            ['Fecha del evento:', quo.eventDetails?.date ? new Date(quo.eventDetails.date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '---'],
            ['Lugar del evento:', (quo.eventDetails?.location || 'Por confirmar').toUpperCase()],
            ['Tipo de evento:', (quo.eventDetails?.occasion || 'SOCIAL').toUpperCase()]
        ];

        clientData.forEach(([label, val]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(val, margin + 45, y);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.line(margin + 45, y + 1, pageWidth - margin, y + 1);
            y += 7;
        });

        y += 10;

        // 3. DETALLE DEL SERVICIO (TABLE)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...THEME.ACCENT);
        doc.text('Detalle del Servicio', margin, y);
        y += 8;

        const tableRows = [];
        const pack = (quo.logistics?.packName || '').toUpperCase();
        const isONIX = pack === 'ONIX';
        const isMULTII = pack === 'MULTII';
        const isKAIZEN = pack === 'KAIZEN';

        const serviceDescriptions = {
            av: "SISTEMA SONIDO PRO (2 Cabinas), 2 Micrófonos Inalambricos, 4 Luces Rítmicas, Cámara de Humo, DJ Crossover en vivo, Montaje y Desmontaje.",
            photo: "FOTOGRAFÍA PROFESIONAL: Cámara Reflex/Mirrorless, Cobertura del cronograma, Entrega digital, Edición profesional.",
            cam: "PRODUCTO 360 XL: Plataforma giratoria, Iluminación LED, Operador, Videos inmediatos editados para redes sociales.",
            makeup: "STAND MAQUILLAJE NEÓN: Personal maquillador, Kit de pintura UV especial, Accesorios neón/flúor.",
            decor: `DECORACIÓN ${pack}: Mobiliario temático, Arco de globos orgánico, Cilindros, Accesorios exclusivos del set.`
        };

        const services = [
            { id: 'av', label: 'AUDIOVISUALES (+DJ)', start: quo.eventDetails?.avStartTime || quo.eventDetails?.startTime, end: quo.eventDetails?.avEndTime || quo.eventDetails?.endTime, desc: serviceDescriptions.av, incl: isONIX || isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_av'] },
            { id: 'photo', label: 'FOTOGRAFÍA PRO', start: quo.eventDetails?.photoStartTime || quo.eventDetails?.startTime, end: quo.eventDetails?.photoEndTime || quo.eventDetails?.endTime, desc: serviceDescriptions.photo, incl: isONIX || isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_photo'] },
            { id: 'cam', label: 'CÁMARA 360 XL', start: quo.eventDetails?.cam360StartTime || quo.eventDetails?.startTime, end: quo.eventDetails?.cam360EndTime || quo.eventDetails?.endTime, desc: serviceDescriptions.cam, incl: isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_cam360'] },
            { id: 'makeup', label: 'MAQUILLAJE NEÓN', start: quo.eventDetails?.makeupStartTime || quo.eventDetails?.startTime, end: quo.eventDetails?.makeupEndTime || quo.eventDetails?.endTime, desc: serviceDescriptions.makeup, incl: isKAIZEN || quo.logistics?.selectedExtras?.['extra_makeup'] },
            { id: 'decor', label: 'DECORACIÓN', start: quo.eventDetails?.decorStartTime || quo.eventDetails?.startTime, end: quo.eventDetails?.decorEndTime || quo.eventDetails?.endTime, desc: serviceDescriptions.decor, incl: isONIX || isMULTII || isKAIZEN || quo.logistics?.selectedExtras?.['extra_decor_onix'] || quo.logistics?.selectedExtras?.['extra_decor_multii'] || quo.logistics?.selectedExtras?.['extra_decor_kaizen'] }
        ];

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
                'INCLUIDO',
                'INCLUIDO'
            ]);
        });

        autoTable(doc, {
            startY: y,
            theme: 'grid',
            head: [['Franja horaria', 'Servicio', 'Descripción', 'Horas', 'Valor/h', 'Subtotal']],
            body: tableRows.length > 0 ? tableRows : [['---', 'SELECCIÓN A LA CARTA', 'Consultar detalle en presupuesto digital', '---', '---', '---']],
            styles: { fontSize: 8, cellPadding: 3, textColor: THEME.TEXT_MAIN, lineColor: [230, 230, 230] },
            headStyles: { fillColor: [245, 245, 245], textColor: THEME.ACCENT, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 30, fontStyle: 'bold' },
                2: { cellWidth: 60 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' }
            }
        });

        y = doc.lastAutoTable.finalY + 12;

        const total = quo.financials?.totalValue || 0;
        const deposit = quo.financials?.deposit || (total * 0.3);
        const finalBalance = total - deposit;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Costo de transporte:', pageWidth - margin - 50, y);
        doc.text('INCLUIDO', pageWidth - margin, y, { align: 'right' });
        y += 6;
        doc.text('Opcional / Extras:', pageWidth - margin - 50, y);
        doc.text('$0', pageWidth - margin, y, { align: 'right' });
        y += 8;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...THEME.ACCENT);
        doc.text('TOTAL:', pageWidth - margin - 50, y);
        doc.text(formatPeso(total), pageWidth - margin, y, { align: 'right' });

        y += 12;

        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text(`Abono (30%): ${formatPeso(deposit)}`, margin, y);
        doc.text(`Saldo a recaudar (70%): ${formatPeso(finalBalance)}`, margin + 80, y);

        y += 15;

        if (y > pageHeight - 110) { doc.addPage(); y = 30; }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...THEME.ACCENT);
        doc.text('Condiciones y Políticas del Servicio', margin, y);
        y += 6;

        const conditions = [
            "El saldo pendiente (70%) debe ser cancelado al personal encargado ANTES de iniciar el servicio.",
            "No se aceptan devoluciones de abono por cancelación de parte del cliente.",
            "En caso de mora o retraso en el pago, la empresa se reserva el derecho de no iniciar o suspender el servicio.",
            "El cliente se hace responsable por daños causados a los equipos por parte de los asistentes.",
            "Cualquier servicio extra no pactado en este contrato tendrá un costo de " + formatPeso(quo.financials?.extraHourPrice || 85000) + " por hora."
        ];

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...THEME.TEXT_SUB);
        conditions.forEach(c => {
            const splitC = doc.splitTextToSize(`• ${c}`, pageWidth - (margin * 2));
            doc.text(splitC, margin, y);
            y += (splitC.length * 4.5);
        });

        y += 20;

        if (y > pageHeight - 60) { doc.addPage(); y = 40; }

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        
        doc.line(margin, y, margin + 65, y);
        doc.text('ACEPTACIÓN DEL CLIENTE', margin, y + 5);
        doc.setFontSize(7);
        doc.text(`Nombre: ${(quo.client?.name || '').toUpperCase()}`, margin, y + 10);
        doc.text(`C.C: ______________`, margin, y + 15);

        if (signatureData) {
            doc.addImage(signatureData, 'JPEG', pageWidth - margin - 45, y - 22, 35, 20);
        }
        doc.line(pageWidth - margin - 65, y, pageWidth - margin, y);
        doc.setFontSize(8.5);
        doc.text('POR NEXXA SOUND', pageWidth - margin, y + 5, { align: 'right' });
        doc.setFontSize(7);
        doc.text('Sharon Nicolle Rivera Tocasuche', pageWidth - margin, y + 10, { align: 'right' });
        doc.text('C.C. 1024488302', pageWidth - margin, y + 15, { align: 'right' });

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(...THEME.TEXT_LEGAL);
            doc.text(`NEXXA SOUND - BOGOTÁ D.C. - ${new Date().toLocaleDateString()}  |  Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        const fileName = `CONTRATO_NEXXA_${(quo.client?.name || 'CLIENTE').replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);

    } catch (err) {
        console.error("PDF ERROR:", err);
        alert('Error generando contrato: ' + err.message);
    }
};
