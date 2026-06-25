
        (function() {
            'use strict';

            // ----- DOM refs -----
            const dropZone = document.getElementById('dropZone');
            const fileInput = document.getElementById('fileInput');
            const fileList = document.getElementById('fileList');
            const fileCount = document.getElementById('fileCount');
            const totalSizeEl = document.getElementById('totalSize');
            const mergeBtn = document.getElementById('mergeBtn');
            const clearBtn = document.getElementById('clearBtn');
            const statusMsg = document.getElementById('statusMsg');
            const resultActions = document.getElementById('resultActions');
            const downloadBtn = document.getElementById('downloadBtn');
            const resetAfterDownloadBtn = document.getElementById('resetAfterDownloadBtn');

            // ----- State -----
            let files = [];
            let mergedBlob = null;
            let idCounter = 0;

            // ----- Helpers -----
            function formatSize(bytes) {
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / 1048576).toFixed(1) + ' MB';
            }

            function getTotalSize() {
                return files.reduce((sum, f) => sum + f.size, 0);
            }

            function updateUI() {
                fileCount.textContent = files.length;
                if (files.length === 0) {
                    totalSizeEl.textContent = '';
                } else {
                    totalSizeEl.textContent = `Total: ${formatSize(getTotalSize())}`;
                }
                mergeBtn.disabled = files.length < 2;
                clearBtn.disabled = files.length === 0;
                renderFileList();
                if (mergedBlob) {
                    mergedBlob = null;
                    resultActions.classList.add('hidden');
                    const msg = files.length > 0 ? '📋 Ready to merge' : '💡 Add PDFs to get started';
                    setStatus(msg, 'info');
                }
            }

            function renderFileList() {
                if (files.length === 0) {
                    fileList.innerHTML = `<div class="empty-state">No files added yet</div>`;
                    return;
                }
                let html = '';
                files.forEach((f, index) => {
                    const isFirst = index === 0;
                    const isLast = index === files.length - 1;
                    html += `
                        <div class="file-item" data-id="${f.id}">
                            <span class="file-icon">📄</span>
                            <div class="file-info">
                                <div class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
                                <div class="file-size">${formatSize(f.size)}</div>
                            </div>
                            <div class="file-actions">
                                <button class="move-up" ${isFirst ? 'disabled' : ''} title="Move up">↑</button>
                                <button class="move-down" ${isLast ? 'disabled' : ''} title="Move down">↓</button>
                                <button class="remove-btn" title="Remove">✕</button>
                            </div>
                        </div>
                    `;
                });
                fileList.innerHTML = html;

                fileList.querySelectorAll('.file-item').forEach((item) => {
                    const id = parseInt(item.dataset.id, 10);
                    const idx = files.findIndex(f => f.id === id);
                    item.querySelector('.move-up')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (idx > 0) moveFile(idx, -1);
                    });
                    item.querySelector('.move-down')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (idx < files.length - 1) moveFile(idx, 1);
                    });
                    item.querySelector('.remove-btn')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        removeFile(id);
                    });
                });
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            function addFiles(newFiles) {
                let added = 0;
                for (const file of newFiles) {
                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                        setStatus(`⚠️ "${file.name}" is not a PDF. Skipped.`, 'error');
                        continue;
                    }
                    if (files.some(f => f.name === file.name && f.size === file.size)) {
                        setStatus(`⚠️ "${file.name}" is already added. Skipped.`, 'error');
                        continue;
                    }
                    files.push({
                        id: ++idCounter,
                        file: file,
                        name: file.name,
                        size: file.size,
                    });
                    added++;
                }
                if (added > 0) {
                    setStatus(`✅ Added ${added} file${added > 1 ? 's' : ''}`, 'success');
                }
                updateUI();
            }

            function removeFile(id) {
                const idx = files.findIndex(f => f.id === id);
                if (idx === -1) return;
                const removed = files[idx];
                files.splice(idx, 1);
                setStatus(`🗑 Removed "${removed.name}"`, 'info');
                updateUI();
            }

            function moveFile(index, direction) {
                const newIndex = index + direction;
                if (newIndex < 0 || newIndex >= files.length) return;
                [files[index], files[newIndex]] = [files[newIndex], files[index]];
                updateUI();
                setStatus(`↕ Reordered`, 'info');
            }

            function clearAll() {
                if (files.length === 0) return;
                files = [];
                mergedBlob = null;
                resultActions.classList.add('hidden');
                setStatus('🗑 All files cleared', 'info');
                updateUI();
            }

            function setStatus(msg, type = 'info') {
                const icons = {
                    info: '💡',
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    loading: '⏳',
                };
                const icon = icons[type] || '💡';
                let content = `${icon} ${msg}`;
                if (type === 'loading') {
                    content = `<span class="spinner"></span> ${msg}`;
                }
                statusMsg.innerHTML = content;
            }

            // ----- Merge logic -----
            async function performMerge() {
                if (files.length < 2) {
                    setStatus('Please add at least 2 PDF files to merge.', 'warning');
                    return;
                }
                const maxSize = 50 * 1024 * 1024;
                const oversized = files.find(f => f.size > maxSize);
                if (oversized) {
                    setStatus(`"${oversized.name}" is larger than 50MB. Please use smaller files.`, 'error');
                    return;
                }
                mergeBtn.disabled = true;
                setStatus('Merging PDFs... please wait', 'loading');

                try {
                    const { PDFDocument } = PDFLib;
                    const mergedPdf = await PDFDocument.create();
                    for (let i = 0; i < files.length; i++) {
                        const f = files[i];
                        try {
                            const arrayBuffer = await f.file.arrayBuffer();
                            const srcPdf = await PDFDocument.load(arrayBuffer);
                            const indices = srcPdf.getPageIndices();
                            const copiedPages = await mergedPdf.copyPages(srcPdf, indices);
                            copiedPages.forEach(page => mergedPdf.addPage(page));
                        } catch (err) {
                            console.error(`Error processing "${f.name}":`, err);
                            setStatus(`❌ Failed to process "${f.name}". ${err.message || 'Invalid PDF?'}`, 'error');
                            mergeBtn.disabled = false;
                            return;
                        }
                    }
                    const mergedBytes = await mergedPdf.save();
                    mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
                    setStatus(`✅ Merge complete! Merged ${files.length} files.`, 'success');
                    resultActions.classList.remove('hidden');
                    mergeBtn.disabled = false;
                } catch (err) {
                    console.error('Merge error:', err);
                    setStatus(`❌ Merge failed: ${err.message || 'Unknown error'}`, 'error');
                    mergeBtn.disabled = false;
                }
            }

            function downloadMerged() {
                if (!mergedBlob) {
                    setStatus('No merged PDF to download. Please merge first.', 'warning');
                    return;
                }
                const link = document.createElement('a');
                link.href = URL.createObjectURL(mergedBlob);
                link.download = 'merged.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(link.href), 5000);
                setStatus('⬇️ Download started!', 'success');
            }

            function resetAfterDownload() {
                resultActions.classList.add('hidden');
                mergedBlob = null;
                setStatus(`📋 ${files.length} files ready. Merge again or add more.`, 'info');
            }

            // ----- Events -----
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    addFiles(e.target.files);
                }
                fileInput.value = '';
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    addFiles(e.dataTransfer.files);
                }
            });
            dropZone.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    fileInput.click();
                }
            });

            mergeBtn.addEventListener('click', performMerge);
            clearBtn.addEventListener('click', clearAll);
            downloadBtn.addEventListener('click', downloadMerged);
            resetAfterDownloadBtn.addEventListener('click', resetAfterDownload);

            // ----- Init -----
            updateUI();
            setStatus('💡 Add PDFs to get started', 'info');

            document.addEventListener('dragover', (e) => e.preventDefault());
            document.addEventListener('drop', (e) => e.preventDefault());

            console.log('📄 PDF Merger ready!');
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
    