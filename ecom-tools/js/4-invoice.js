
        (function() {
            // ----- state -----
            let uploadedFiles = [];
            let processedBlob = null;
            let isProcessing = false;

            // DOM refs
            const fileInput = document.getElementById('fileInput');
            const fileList = document.getElementById('fileList');
            const fileCount = document.getElementById('fileCount');
            const uploadArea = document.getElementById('uploadArea');
            const processBtn = document.getElementById('processBtn');
            const statusEl = document.getElementById('status');
            const statusMsg = document.getElementById('statusMessage');
            const progressFill = document.getElementById('progressFill');
            const downloadArea = document.getElementById('downloadArea');
            const downloadBtn = document.getElementById('downloadBtn');

            // ----- file handling -----
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#6C2BD9';
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = '#a78bfa';
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#a78bfa';
                if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) handleFiles(fileInput.files);
                fileInput.value = '';
            });

            function handleFiles(files) {
                for (const f of files) {
                    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
                        uploadedFiles.push(f);
                    }
                }
                renderFileList();
                statusEl.classList.remove('show', 'success', 'error', 'info');
                downloadArea.style.display = 'none';
                processedBlob = null;
            }

            function renderFileList() {
                if (!uploadedFiles.length) {
                    fileList.innerHTML = '';
                    fileCount.textContent = '';
                    return;
                }
                fileList.innerHTML = uploadedFiles.map((f, i) =>
                    `<span class="file-item">📄 ${f.name} <span class="remove" data-idx="${i}">✕</span></span>`
                ).join('');
                fileList.querySelectorAll('.remove').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(el.dataset.idx);
                        uploadedFiles.splice(idx, 1);
                        renderFileList();
                        processedBlob = null;
                        downloadArea.style.display = 'none';
                    });
                });
                fileCount.textContent = `${uploadedFiles.length} file(s) uploaded`;
            }

            // ----- processing -----
            processBtn.addEventListener('click', async () => {
                if (isProcessing) return;
                if (!uploadedFiles.length) {
                    showStatus('Please upload at least one PDF file.', 'error');
                    return;
                }
                isProcessing = true;
                processBtn.disabled = true;
                processBtn.innerHTML = '<span class="spinner"></span> Processing…';
                downloadArea.style.display = 'none';
                processedBlob = null;
                showStatus('Loading PDF pages…', 'info');
                progressFill.style.width = '0%';

                try {
                    const allLabels = [];
                    let totalPages = 0;

                    for (const file of uploadedFiles) {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        const pageCount = pdf.numPages;
                        totalPages += pageCount;

                        for (let i = 1; i <= pageCount; i++) {
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 1.5 });
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            await page.render({ canvasContext: ctx, viewport }).promise;
                            const dataUrl = canvas.toDataURL('image/png');
                            allLabels.push(dataUrl);
                            const pct = Math.min(50, Math.round((allLabels.length / totalPages) * 50));
                            progressFill.style.width = pct + '%';
                        }
                    }

                    if (!allLabels.length) throw new Error('No pages found in the uploaded PDFs.');

                    showStatus(`Processing ${allLabels.length} labels into 4‑label A4 layout…`, 'info');
                    progressFill.style.width = '55%';

                    const perPage = 4;
                    const totalA4Pages = Math.ceil(allLabels.length / perPage);

                    const { PDFDocument, PageSizes } = PDFLib;
                    const newPdf = await PDFDocument.create();
                    const [a4w, a4h] = PageSizes.A4;

                    const margin = 28;
                    const gap = 12;
                    const cols = 2,
                        rows = 2;
                    const availableW = a4w - margin * 2;
                    const availableH = a4h - margin * 2;
                    const cellW = (availableW - gap * (cols - 1)) / cols;
                    const cellH = (availableH - gap * (rows - 1)) / rows;

                    for (let p = 0; p < totalA4Pages; p++) {
                        const page = newPdf.addPage(PageSizes.A4);
                        const startIdx = p * perPage;
                        const endIdx = Math.min(startIdx + perPage, allLabels.length);

                        for (let i = startIdx; i < endIdx; i++) {
                            const idx = i - startIdx;
                            const col = idx % cols;
                            const row = Math.floor(idx / cols);
                            const x = margin + col * (cellW + gap);
                            const y = a4h - margin - (row + 1) * cellH - row * gap;

                            const imgData = allLabels[i];
                            const response = await fetch(imgData);
                            const blob = await response.blob();
                            const imgBytes = await blob.arrayBuffer();
                            let img;
                            try {
                                img = await newPdf.embedPng(imgBytes);
                            } catch (_) {
                                img = await newPdf.embedJpg(imgBytes);
                            }
                            const scale = Math.min(cellW / img.width, cellH / img.height, 1.2);
                            const dw = img.width * scale;
                            const dh = img.height * scale;
                            const dx = x + (cellW - dw) / 2;
                            const dy = y + (cellH - dh) / 2;
                            page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
                        }

                        const pct2 = 55 + Math.round(((p + 1) / totalA4Pages) * 40);
                        progressFill.style.width = Math.min(95, pct2) + '%';
                    }

                    progressFill.style.width = '100%';
                    const pdfBytes = await newPdf.save();
                    processedBlob = new Blob([pdfBytes], { type: 'application/pdf' });

                    showStatus(`✅ Done! ${allLabels.length} labels arranged on ${totalA4Pages} A4 page(s).`, 'success');
                    downloadArea.style.display = 'block';

                } catch (err) {
                    console.error(err);
                    showStatus('❌ Error: ' + (err.message || 'Processing failed.'), 'error');
                } finally {
                    isProcessing = false;
                    processBtn.disabled = false;
                    processBtn.innerHTML = '🚀 Start crop';
                }
            });

            // ----- download -----
            downloadBtn.addEventListener('click', () => {
                if (!processedBlob) return;
                const url = URL.createObjectURL(processedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'SDH-meesho-labels-4-per-page.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            });

            // ----- helpers -----
            function showStatus(msg, type) {
                statusEl.className = 'status show ' + (type || 'info');
                statusMsg.innerHTML = msg;
                if (type === 'error') progressFill.style.width = '0%';
            }

            // pdf.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        })();

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

        console.log('📋 4‑Label A4 Cropper loaded with SDH enhancements');
