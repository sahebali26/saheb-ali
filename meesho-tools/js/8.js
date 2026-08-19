   
        // ─── CONFIG ───
        const TOP_ANCHOR = "Customer Address";
        const BOTTOM_ANCHOR = "SKU";
        const PARTNER_PRIORITY = ["delhivery", "ecom express", "shadowfax", "unknown"];

        // ─── DOM refs ───
        const fileInput = document.getElementById('fileInput');
        const downloadBtn = document.getElementById('downloadButton');
        const resetBtn = document.getElementById('resetButton');
        const message = document.getElementById('message');
        const progressBar = document.getElementById('progressBar');
        const pagesContainer = document.getElementById('pagesContainer');
        const previewCard = document.getElementById('previewCard');
        const partnerFilter = document.getElementById('partnerFilter');
        const filterRow = document.getElementById('filterRow');
        const innerLinesToggle = document.getElementById('innerLinesToggle');
        const fileInfo = document.getElementById('fileInfo');

        // ─── State ───
        let allPageData = []; // combined from all PDFs
        let allPartners = new Set();
        let skippedTotal = 0;
        let originalFiles = []; // store File objects for later
        let combinedPdfBytes = null; // we'll merge all PDFs into one for source access
        let sourcePdfDoc = null; // pdf-lib document
        let pageMap = []; // maps global page index -> { fileIndex, pageIndex }

        // ─── Helpers ───
        function setMessage(msg, isError = false) {
            message.textContent = msg;
            message.style.color = isError ? '#c0392b' : '#2e7d32';
        }

        function resetUI() {
            setMessage('');
            pagesContainer.innerHTML = '';
            allPageData = [];
            allPartners.clear();
            skippedTotal = 0;
            partnerFilter.innerHTML = '<option value="all">All</option>';
            partnerFilter.disabled = true;
            filterRow.style.display = 'none';
            downloadBtn.disabled = true;
            progressBar.value = 0;
            previewCard.style.display = 'none';
            sourcePdfDoc = null;
            originalFiles = [];
            pageMap = [];
            fileInfo.textContent = 'No files selected.';
        }

        // ─── File handling ───
        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) {
                fileInfo.textContent = 'No files selected.';
                return;
            }

            fileInfo.textContent = `${files.length} file(s) selected.`;
            resetUI();
            originalFiles = Array.from(files);
            progressBar.value = 0;
            setMessage(`Loading ${files.length} PDF(s)…`);

            try {
                // Step 1: Load all PDFs and merge them into one pdf-lib document
                const mergedPdf = await PDFLib.PDFDocument.create();
                let globalPageIndex = 0;

                for (let fIdx = 0; fIdx < files.length; fIdx++) {
                    const file = files[fIdx];
                    const arrayBuffer = await file.arrayBuffer();
                    const pdfBytes = new Uint8Array(arrayBuffer);
                    const srcDoc = await PDFLib.PDFDocument.load(pdfBytes);
                    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
                    for (const page of copiedPages) {
                        mergedPdf.addPage(page);
                        pageMap.push({ fileIndex: fIdx, pageIndex: globalPageIndex });
                        globalPageIndex++;
                    }
                }

                sourcePdfDoc = mergedPdf;
                const totalPages = sourcePdfDoc.getPageCount();
                setMessage(`Processing ${totalPages} pages from ${files.length} file(s)…`);

                // Step 2: Analyze each page using pdf.js
                // We need to load each original PDF with pdf.js to get text content
                // We'll process sequentially
                let processed = 0;
                let skipped = 0;

                for (let fIdx = 0; fIdx < files.length; fIdx++) {
                    const file = files[fIdx];
                    const arrayBuffer = await file.arrayBuffer();
                    const typedArray = new Uint8Array(arrayBuffer);
                    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
                    const pdfJsDoc = await loadingTask.promise;

                    for (let pIdx = 1; pIdx <= pdfJsDoc.numPages; pIdx++) {
                        const page = await pdfJsDoc.getPage(pIdx);
                        const textContent = await page.getTextContent();
                        const { topY, bottomY, partner, sku } = findPageDetails(textContent, pIdx);
                        const rawViewport = page.getViewport({ scale: 1 });

                        if (topY == null || bottomY == null) {
                            skipped++;
                            skippedTotal++;
                            processed++;
                            progressBar.value = 10 + (processed / totalPages) * 50;
                            continue;
                        }

                        // Render thumbnail
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        await page.render({ canvasContext: ctx, viewport }).promise;

                        const wrapper = document.createElement('div');
                        wrapper.className = 'pageWrapper';
                        wrapper.appendChild(canvas);
                        pagesContainer.appendChild(wrapper);

                        const cropRegion = calculateCropRegion(topY, bottomY, rawViewport.height);

                        // Find the global page index for this page in merged doc
                        // The merged doc has pages in same order: file0 pages, file1 pages, etc.
                        let globalIdx = 0;
                        for (let fi = 0; fi < fIdx; fi++) {
                            const prevFile = files[fi];
                            const prevArrayBuffer = await prevFile.arrayBuffer();
                            const prevTyped = new Uint8Array(prevArrayBuffer);
                            const prevLoading = pdfjsLib.getDocument({ data: prevTyped });
                            const prevDoc = await prevLoading.promise;
                            globalIdx += prevDoc.numPages;
                        }
                        globalIdx += (pIdx - 1);

                        allPageData.push({
                            globalPageIndex: globalIdx,
                            partner: partner || 'Unknown',
                            sku: sku || 'N/A',
                            cropRegion,
                            pageWrapper: wrapper,
                            fileIndex: fIdx,
                            pageNumber: pIdx,
                        });

                        if (partner) allPartners.add(partner);

                        processed++;
                        progressBar.value = 10 + (processed / totalPages) * 50;
                        await new Promise((r) => setTimeout(r, 5));
                    }
                }

                sortPages();
                setupPartnerFilter();
                progressBar.value = 100;
                setMessage(`✅ Done. ${allPageData.length} labels ready. ${skippedTotal ? '⚠️ Skipped ' + skippedTotal + ' page(s) missing anchors.' : ''}`);
                downloadBtn.disabled = false;
                previewCard.style.display = 'block';
            } catch (err) {
                setMessage('❌ Error processing PDFs: ' + err.message, true);
                console.error(err);
            }
        });

        // ─── Reset ───
        resetBtn.addEventListener('click', () => {
            fileInput.value = '';
            resetUI();
        });

        // ─── Partner filter ───
        partnerFilter.addEventListener('change', () => {
            filterPages(partnerFilter.value);
        });

        // ─── Sort radio ───
        document.querySelectorAll('input[name="sortBy"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                sortPages();
                filterPages(partnerFilter.value);
            });
        });

        // ─── Find anchors ───
        function findPageDetails(textContent, pageIndex) {
            let topY = null,
                bottomY = null,
                partner = null,
                sku = null;
            let skuLineIndex = -1;

            textContent.items.forEach((item, index) => {
                const text = item.str.trim();
                const y = item.transform[5];

                if (text.includes(TOP_ANCHOR)) topY = y;
                if (text.includes(BOTTOM_ANCHOR)) bottomY = y;

                const lower = text.toLowerCase();
                if (lower.includes('delhivery')) partner = 'Delhivery';
                else if (lower.includes('ecom express')) partner = 'Ecom Express';
                else if (lower.includes('shadowfax')) partner = 'Shadowfax';

                if (lower === 'sku') skuLineIndex = index;
                if (skuLineIndex !== -1 && index === skuLineIndex + 10) {
                    sku = text;
                    skuLineIndex = -1;
                }
            });

            return { topY, bottomY, partner, sku };
        }

        // ─── Crop region ───
        function calculateCropRegion(topY, bottomY, pageHeight) {
            if (topY != null && bottomY != null) {
                const top = Math.max(topY, bottomY);
                const bottom = Math.min(topY, bottomY);
                const PAD = 39;
                return { x: 0, y: bottom - PAD, w: 595, h: (top - bottom) + PAD * 2 };
            }
            return { x: 0, y: 0, w: 595, h: pageHeight };
        }

        // ─── Sort ───
        function sortPages() {
            const sortBy = document.querySelector('input[name="sortBy"]:checked').value;
            if (sortBy === 'sku') {
                allPageData.sort((a, b) => a.sku.localeCompare(b.sku));
            } else {
                allPageData.sort((a, b) => {
                    const ai = PARTNER_PRIORITY.indexOf(a.partner.toLowerCase());
                    const bi = PARTNER_PRIORITY.indexOf(b.partner.toLowerCase());
                    return ai - bi;
                });
            }
            allPageData.forEach((item) => pagesContainer.appendChild(item.pageWrapper));
            filterPages(partnerFilter.value);
        }

        // ─── Filter ───
        function filterPages(value) {
            allPageData.forEach((data) => {
                const partner = data.partner.toLowerCase();
                data.pageWrapper.style.display =
                    (value === 'all' || partner === value) ? 'inline-block' : 'none';
            });
        }

        // ─── Partner filter dropdown ───
        function setupPartnerFilter() {
            if (allPartners.size > 0) {
                partnerFilter.disabled = false;
                filterRow.style.display = 'flex';
                for (const p of allPartners) {
                    const opt = document.createElement('option');
                    opt.value = p.toLowerCase();
                    opt.textContent = p;
                    partnerFilter.appendChild(opt);
                }
            }
        }

        // ─── DOWNLOAD ────────────────────────────────────────────────────────
        downloadBtn.addEventListener('click', async () => {
            if (!sourcePdfDoc || allPageData.length === 0) {
                setMessage('❌ No PDF loaded.', true);
                return;
            }

            try {
                setMessage('Generating PDF…');
                progressBar.value = 40;

                const layoutMode = document.querySelector('input[name="layoutMode"]:checked').value;
                const showLines = innerLinesToggle.checked;

                const sourcePdf = sourcePdfDoc;
                const outputPdf = await PDFLib.PDFDocument.create();
                const pages = sourcePdf.getPages();

                if (layoutMode === 'label') {
                    // ── Label Printer: one per page ──
                    for (let i = 0; i < allPageData.length; i++) {
                        const { globalPageIndex, cropRegion } = allPageData[i];
                        const [copied] = await outputPdf.copyPages(sourcePdf, [globalPageIndex]);
                        copied.setCropBox(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
                        outputPdf.addPage(copied);
                        progressBar.value = 40 + ((i + 1) / allPageData.length) * 30;
                        await new Promise((r) => setTimeout(r, 5));
                    }
                } else {
                    // ── A4 Layout (4 or 8 labels per page) ──
                    const isEight = layoutMode === 'a4-8';
                    const cols = isEight ? 4 : 2;
                    const rows = 2;
                    const totalPerPage = cols * rows;

                    const a4W = 842;
                    const a4H = 595;
                    const margin = 10;
                    const gap = 10;

                    const cellW = (a4W - 2 * margin - (cols - 1) * gap) / cols;
                    const cellH = (a4H - 2 * margin - (rows - 1) * gap) / rows;

                    for (let i = 0; i < allPageData.length; i += totalPerPage) {
                        const a4Page = outputPdf.addPage([a4W, a4H]);

                        for (let j = 0; j < totalPerPage && (i + j) < allPageData.length; j++) {
                            const idx = i + j;
                            const { globalPageIndex, cropRegion } = allPageData[idx];

                            const col = j % cols;
                            const row = rows - 1 - Math.floor(j / cols);

                            const xPos = margin + col * (cellW + gap);
                            const yPos = a4H - margin - cellH - row * (cellH + gap);

                            const embedded = await outputPdf.embedPage(pages[globalPageIndex], {
                                left: cropRegion.x,
                                bottom: cropRegion.y,
                                right: cropRegion.x + cropRegion.w,
                                top: cropRegion.y + cropRegion.h,
                            });

                            const labelW = cropRegion.w;
                            const labelH = cropRegion.h;

                            const scaleDirect = Math.min(cellW / labelW, cellH / labelH);
                            const areaDirect = (labelW * scaleDirect) * (labelH * scaleDirect);

                            const scaleRot = Math.min(cellW / labelH, cellH / labelW);
                            const areaRot = (labelH * scaleRot) * (labelW * scaleRot);

                            if (areaRot > areaDirect) {
                                const s = scaleRot;
                                const sw = labelH * s;
                                const sh = labelW * s;
                                const cx = xPos + (cellW - sw) / 2 + sw;
                                const cy = yPos + (cellH - sh) / 2;
                                a4Page.drawPage(embedded, {
                                    x: cx,
                                    y: cy,
                                    width: labelW * s,
                                    height: labelH * s,
                                    rotate: PDFLib.degrees(90),
                                });
                            } else {
                                const s = scaleDirect;
                                const sw = labelW * s;
                                const sh = labelH * s;
                                const cx = xPos + (cellW - sw) / 2;
                                const cy = yPos + (cellH - sh) / 2;
                                a4Page.drawPage(embedded, {
                                    x: cx,
                                    y: cy,
                                    width: sw,
                                    height: sh,
                                });
                            }
                        }

                        if (showLines) {
                            for (let c = 1; c < cols; c++) {
                                const x = margin + c * (cellW + gap) - gap / 2;
                                a4Page.drawLine({
                                    start: { x, y: margin },
                                    end: { x, y: a4H - margin },
                                    thickness: 1.5,
                                    color: PDFLib.rgb(0.7, 0.7, 0.7),
                                });
                            }
                            const yLine = a4H - margin - cellH - gap / 2;
                            a4Page.drawLine({
                                start: { x: margin, y: yLine },
                                end: { x: a4W - margin, y: yLine },
                                thickness: 1.5,
                                color: PDFLib.rgb(0.7, 0.7, 0.7),
                            });
                        }

                        progressBar.value = 40 + ((i + totalPerPage) / allPageData.length) * 30;
                        await new Promise((r) => setTimeout(r, 5));
                    }

                    const allPages = outputPdf.getPages();
                    allPages.forEach((p) => p.setRotation(PDFLib.degrees(90)));
                }

                progressBar.value = 90;
                const outBytes = await outputPdf.save();
                downloadPDF(outBytes, 'SDH-Meesho_Label_Croper_Multi.pdf');
                progressBar.value = 100;
                setMessage(`✅ Download complete. ${allPageData.length} labels processed from ${originalFiles.length} file(s).`);
            } catch (err) {
                setMessage('❌ Download error: ' + err.message, true);
                console.error(err);
                progressBar.value = 0;
            }
        });

        // ─── Download helper ───
        function downloadPDF(bytes, filename) {
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        }

        // ─── Smooth scroll for nav links ───
        document.querySelectorAll('.nav-scroll').forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId && targetId.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(targetId);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });

        // ─── Init ───
        resetUI();
        console.log('✅ Meesho Label Cropper loaded (Multi-PDF support | inner lines toggle)');
    