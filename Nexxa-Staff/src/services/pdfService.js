import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPeso, formatT, subtractMinutes, addMinutes } from '../utils/helpers';

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
                const found = (evt.logistics?.items || []).find(i => i && i.name && i.name.toUpperCase().includes(name.split('"')[0]));
                return found || { name, qty: 1, area: 'DJ' };
            });
            // Add other DJ items from logistics if exist
            (evt.logistics?.items || []).filter(i => i && i.name).forEach(item => {
                if ((item.area === 'DJ' || item.area === 'LOGÍSTICA') && !filteredItems.some(f => f.name && f.name.toUpperCase().includes(item.name.toUpperCase().substring(0, 5)))) {
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

export const generateQuotationPDF = async (quo, getDynamicExtras) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = 297;
        const margin = 20; // Increased margin for cleaner look
        const contractClientName = (quo.client?.name || 'Cliente').toUpperCase();

        // Load Logo Logic (Base64)
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

        const logoData = await getBase64('/nexxa-app-icon.png');
        const signatureData = await getBase64('/firma_sharon.jpg');

        // 3. COLORS (Clean White Theme)
        const THEME = {
            TEXT_MAIN: [17, 17, 17],
            TEXT_SUB: [51, 51, 51],
            TEXT_LEGAL: [119, 119, 119],
            ACCENT: [188, 111, 241],
            BG_LIGHT: [250, 250, 252],
            WHITE: [255, 255, 255]
        };

        // 4. HEADER
        let y = 30;

        if (logoData) {
            doc.addImage(logoData, 'PNG', margin, 15, 25, 25);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('Contrato de Prestación de Servicios', pageWidth / 2, 22, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Producción de eventos · Sonido · Iluminación · DJ', pageWidth / 2, 29, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_LEGAL);
        doc.text(`Bogotá D.C. • ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, 36, { align: 'center' });

        doc.setDrawColor(...THEME.ACCENT);
        doc.setLineWidth(0.5);
        doc.line(margin, 45, pageWidth - margin, 45);

        y = 55;

        // 5. SECCIÓN 1 - DATOS DEL EVENTO
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('DATOS DEL EVENTO', margin, y);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 12;

        const evtTime = `${formatT(quo.eventDetails?.startTime)} - ${formatT(quo.eventDetails?.endTime)}`;
        const evtLoc = (quo.eventDetails?.location || 'Ubicación por confirmar');
        const clientN = (quo.client?.name || 'Cliente');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...THEME.TEXT_MAIN);

        const col1X = margin + 10;
        const colVal1X = margin + 40;
        const col2X = (pageWidth / 2) + 5;
        const colVal2X = (pageWidth / 2) + 30;

        // Col 1
        doc.text('Cliente:', col1X, y + 10);
        doc.setFont('helvetica', 'normal'); doc.text(clientN, colVal1X, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.text('Ubicación:', col1X, y + 20);
        doc.setFont('helvetica', 'normal'); doc.text(evtLoc, colVal1X, y + 20);

        // Col 2
        // Format Date
        const rawDate = quo.eventDetails?.date;
        const formattedDate = rawDate ? new Date(rawDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '---';

        doc.setFont('helvetica', 'bold');
        doc.text('Fecha:', col2X, y + 10);
        doc.setFont('helvetica', 'normal'); doc.text(formattedDate, colVal2X, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.text('H. Evento:', col2X, y + 20);
        doc.setFont('helvetica', 'normal'); doc.text(evtTime, colVal2X, y + 20);

        // Extra timings if they exist
        if (quo.eventDetails?.photoStartTime) {
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('H. Fotografía:', col2X, y + 20);
            doc.setFont('helvetica', 'normal');
            doc.text(`${formatT(quo.eventDetails.photoStartTime)} - ${formatT(quo.eventDetails.photoEndTime)}`, colVal2X, y + 20);
        }
        if (quo.eventDetails?.decorStartTime) {
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('H. Decoración:', col2X, y + 20);
            doc.setFont('helvetica', 'normal');
            doc.text(`${formatT(quo.eventDetails.decorStartTime)} - ${formatT(quo.eventDetails.decorEndTime)}`, colVal2X, y + 20);
        }

        y += 45;

        // 6. SECCIÓN 2 - IDENTIFICACIÓN
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('IDENTIFICACIÓN', margin, y);

        doc.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 12;

        // Labels Row
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...THEME.TEXT_MAIN);

        doc.text('Proveedor del servicio', margin + 10, y);

        const holderX = (pageWidth / 2) + 10;
        doc.text('Titular del servicio', holderX, y);

        // Content Row
        y += 8;

        // Provider Content
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('NEXXA SOUND', margin + 10, y + 2);

        // Holder Content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Sharon Nicolle Rivera Tocasuche', holderX, y);
        doc.text('C.C. 1024488302', holderX, y + 5);

        y += 20;

        // 7. SECCIÓN 3 - SERVICIOS INCLUIDOS
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Servicios incluidos', margin, y);
        y += 6;

        const scopeData = [
            ['Paquete / Experiencia:', quo.logistics.packName?.toUpperCase() || 'PERSONALIZADO'],
            ['Servicio principal:', 'Producción de Evento (Sonido/Iluminación)']
        ];

        const activeExtras = getDynamicExtras(quo.eventDetails.guestCount || 100, quo.logistics.makeupCount || 0)
            .filter(ex => quo.logistics.selectedExtras && quo.logistics.selectedExtras[ex.id]);

        if (activeExtras.length > 0) {
            const extrasText = activeExtras.map(ex => `• ${ex.name} (${ex.details})`).join('\n');
            scopeData.push(['Complementos incluidos:', extrasText]);
        } else {
            scopeData.push(['Complementos incluidos:', 'Ninguno seleccionado']);
        }

        autoTable(doc, {
            startY: y,
            theme: 'plain',
            body: scopeData,
            styles: { fontSize: 11, cellPadding: 6, textColor: THEME.TEXT_MAIN, lineWidth: 0, overflow: 'linebreak' },
            columnStyles: {
                0: { fontStyle: 'bold', width: 60, textColor: THEME.TEXT_SUB },
                1: { width: 110 }
            },
            didDrawCell: (data) => {
                if (data.section === 'body') {
                    doc.setDrawColor(200, 200, 200); // 200 is visible light grey
                    doc.setLineWidth(0.1);
                    doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                }
            }
        });

        y = doc.lastAutoTable.finalY + 15;

        // 8. SECCIÓN 4 - INVERSIÓN
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Inversión del servicio', margin, y);
        y += 10;

        const totalVal = quo.financials.totalValue || 0;
        const payToReserve = totalVal * 0.3;
        const payFinal = totalVal - payToReserve;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...THEME.TEXT_MAIN);

        // 1. Anticipo
        doc.text('Anticipo (30%):', margin, y);
        doc.setFont('helvetica', 'bold'); doc.text(formatPeso(payToReserve), margin + 40, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_LEGAL);
        doc.text('(confirma reserva de fecha)', margin + 80, y);

        y += 8;
        // 2. Saldo
        doc.setFontSize(11); doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('Saldo (70%):', margin, y);
        doc.setFont('helvetica', 'bold'); doc.text(formatPeso(payFinal), margin + 40, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_LEGAL);
        doc.text('(antes del inicio del evento)', margin + 80, y);

        y += 12; // Extra space before total for emphasis
        // 3. Total
        doc.setFontSize(12); doc.setTextColor(...THEME.TEXT_MAIN);
        doc.setFont('helvetica', 'bold');
        doc.text('Valor total:', margin, y);
        doc.text(formatPeso(totalVal), margin + 40, y);

        y += 25;

        // 9. CONDICIONES Y POLÍTICAS
        if (y > pageHeight - 120) { doc.addPage(); y = 30; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Información del Servicio y Recomendaciones', margin, y);
        y += 10;

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

        doc.setFontSize(10);

        fullConditions.forEach((section) => {
            // Force Page Break for Specific Section
            if (section.title === "INCONVENIENTES Y RECLAMOS") {
                doc.addPage(); y = 30;
            } else if (y > pageHeight - 40) {
                doc.addPage(); y = 30;
            }

            // Title
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...THEME.TEXT_MAIN);
            doc.text(section.title, margin, y);
            y += 7; // More space after title

            // Items
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...THEME.TEXT_SUB);

            section.items.forEach(item => {
                // Fix Overflow: Reduce width by extra 10 units to accommodate indent
                const splitItem = doc.splitTextToSize(`• ${item}`, pageWidth - (margin * 2) - 10);

                if (y + (splitItem.length * 6) > pageHeight - 25) {
                    doc.addPage(); y = 30;
                    doc.setFont('helvetica', 'bold'); // Reset font if needed logic was complex, but here simplistic is fine
                    // We are in loop, so just continue
                    doc.setFont('helvetica', 'normal');
                }

                doc.text(splitItem, margin + 5, y); // Indent 5
                y += (splitItem.length * 5) + 4; // Increased line height and paragraph spacing
            });
            y += 8; // More space between sections
        });

        y += 5;

        // IMPORTANT WARNING
        if (y > pageHeight - 45) { doc.addPage(); y = 30; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(220, 20, 60); // Crimson Red
        doc.text('¡IMPORTANTE!', pageWidth / 2, y, { align: 'center' });
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...THEME.TEXT_MAIN);
        const warningText = "Cualquier servicio, equipo o indicación que NO esté especificada explícitamente dentro de este contrato no tendrá derecho a reclamos ni devoluciones. Solo se cumplirá estrictamente con los ítems y servicios pactados en este documento.";

        const splitWarning = doc.splitTextToSize(warningText, pageWidth - (margin * 2));
        doc.text(splitWarning, pageWidth / 2, y, { align: 'center' });

        y += (splitWarning.length * 5) + 10;

        // 10. CIERRE
        if (y > pageHeight - 40) { doc.addPage(); y = 30; }
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(...THEME.TEXT_LEGAL);
        doc.text(`Este contrato se rige por las leyes de la República de Colombia.\nPara constancia se firma en Bogotá D.C. el ${new Date().toLocaleDateString('es-CO')}.`, margin, y);
        y += 50;

        // 11. FIRMAS
        if (y > pageHeight - 60) { doc.addPage(); y = 60; }

        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5);

        // Client
        doc.line(margin, y, margin + 70, y);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('EL CLIENTE', margin, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_SUB);
        doc.text(`Nombre: ${quo.client?.name || ''}`, margin, y + 10);
        doc.text(`Cédula: ${quo.client?.id || ''}`, margin, y + 15);

        // Provider
        if (signatureData) {
            doc.addImage(signatureData, 'JPEG', pageWidth - margin - 20, y - 30, 40, 30, null, 'NONE', 90);
        }
        doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text('EL PROVEEDOR', pageWidth - margin - 70, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text('Nombre: Sharon Nicolle Rivera Tocasuche', pageWidth - margin - 70, y + 10);
        doc.text('Cédula: 1024488302', pageWidth - margin - 70, y + 15);

        // Commercial Name (No Color Accent)
        doc.setTextColor(...THEME.TEXT_SUB);
        doc.text('Nombre comercial: NEXXA', pageWidth - margin - 70, y + 20);

        // 12. FOOTER
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...THEME.TEXT_LEGAL);
            doc.text('NEXXA · Producción de eventos', margin, pageHeight - 10);
            doc.text(`${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        // Output
        const pdfData = doc.output('arraybuffer');
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Timestamp added to bust cache
        link.setAttribute('download', `CONTRATO_NEXXA_${contractClientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 500);

    } catch (err) {
        alert('Error en Cotización: ' + err.message);
    }
};
